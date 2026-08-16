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
    popup: isRestrictedUrl(url) ? 'error.html' : ''
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

chrome.action.onClicked.addListener(async (tab) => {
  if (isRestrictedUrl(tab.url)) {
    chrome.action.setPopup({ tabId: tab.id, popup: 'error.html' });
    chrome.action.openPopup().catch(() => {});
    return;
  }

  try {
    const sessionId = Date.now().toString();

    await chrome.storage.local.set({
      activeSessionId: sessionId,
      captureProgress: 0,
      captureComplete: false
    });

    chrome.action.setPopup({ tabId: tab.id, popup: 'loading.html' });
    chrome.action.openPopup().catch(() => {});

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  } catch (err) {
    chrome.action.setPopup({ tabId: tab.id, popup: 'error.html' });
    chrome.action.openPopup().catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
        chrome.storage.local.get('activeTab', () => {
          chrome.tabs.create({ url: chrome.runtime.getURL(`result.html?session=${activeSessionId}`) });
        });
      }, 400);

      chrome.tabs.get(sender.tab.id, (tab) => {
        if (tab) {
          chrome.action.setPopup({ tabId: tab.id, popup: '' });
          updateActionState(tab.id, tab.url);
        }
      });
    });
  }
});
