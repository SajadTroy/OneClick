function isRestrictedUrl(url) {
  if (!url) return false;
  return url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('https://chrome.google.com/webstore') ||
    url.startsWith('https://chromewebstore.google.com/');
}

function updateActionState(tabId, url) {
  chrome.action.setPopup({
    tabId: tabId,
    popup: isRestrictedUrl(url) ? 'error.html' : 'popup.html'
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id && tab.url) {
        updateActionState(tab.id, tab.url);
      }
    }
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id && tab.url) {
        updateActionState(tab.id, tab.url);
      }
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    updateActionState(tabId, changeInfo.url);
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (tab && tab.url) {
      updateActionState(tabId, tab.url);
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'start_capture') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      if (!tab) return;
      
      if (isRestrictedUrl(tab.url)) {
        return; // Should be handled by error.html, but just in case
      }

      try {
        const sessionId = Date.now().toString();

        await chrome.storage.local.set({
          activeSessionId: sessionId,
          captureProgress: 0,
          captureComplete: false
        });

        chrome.action.setPopup({ tabId: tab.id, popup: 'loading.html' });
        // Can't open popup programmatically from background without user gesture in V3 easily,
        // but popup was just closed by window.close() in popup.js, so we might not be able to 
        // force open loading.html. However, the user might see it if they click again.
        // Actually, we can just let content.js run.

        if (message.mode === 'fullpage') {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
        } else if (message.mode === 'snip') {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['snip.js']
          });
        } else if (message.mode === 'visible') {
          chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (dataUrl) => {
            await chrome.storage.local.set({
              [`capturedFrames_${sessionId}`]: {
                title: tab.title,
                frames: [{ dataUrl: dataUrl }],
                dimensions: {
                  width: tab.width,
                  height: tab.height,
                  windowWidth: tab.width,
                  windowHeight: tab.height
                }
              },
              captureComplete: true
            });
            chrome.tabs.create({ url: chrome.runtime.getURL(`result.html?session=${sessionId}`) });
            chrome.action.setPopup({ tabId: tab.id, popup: 'popup.html' });
          });
        }
      } catch (err) {
        chrome.action.setPopup({ tabId: tab.id, popup: 'error.html' });
      }
    });
    return;
  }

  if (message.action === 'capture_snip') {
    chrome.storage.local.get('activeSessionId', ({ activeSessionId }) => {
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (dataUrl) => {
        await chrome.storage.local.set({
          [`capturedFrames_${activeSessionId}`]: {
            title: message.title,
            frames: [{ dataUrl: dataUrl }],
            dimensions: {
              width: message.rect.width,
              height: message.rect.height,
              windowWidth: message.windowWidth,
              windowHeight: message.windowHeight,
              snipRect: message.rect
            }
          },
          captureComplete: true
        });
        chrome.tabs.create({ url: chrome.runtime.getURL(`result.html?session=${activeSessionId}`) });
        
        chrome.tabs.get(sender.tab.id, (tab) => {
          if (tab) {
            chrome.action.setPopup({ tabId: tab.id, popup: 'popup.html' });
          }
        });
      });
    });
    return;
  }

  if (message.action === 'capture_visible_tab') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ dataUrl: dataUrl });
      }
    });
    return true;
  }

  if (message.action === 'capture_progress') {
    chrome.storage.local.set({ captureProgress: message.progress });
    return;
  }

  if (message.action === 'capture_complete') {
    chrome.storage.local.get('activeSessionId', async ({ activeSessionId }) => {
      await chrome.storage.local.set({ captureComplete: true });

      setTimeout(() => {
        chrome.tabs.create({ url: chrome.runtime.getURL(`result.html?session=${activeSessionId}`) });
      }, 400);

      chrome.tabs.get(sender.tab.id, (tab) => {
        if (tab) {
          chrome.action.setPopup({ tabId: tab.id, popup: 'popup.html' });
        }
      });
    });
  }
});
