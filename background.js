function updateActionState(tabId, url) {
  if (!url) return;
}

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
  const isRestricted = tab.url.startsWith('chrome://') || 
                       tab.url.startsWith('https://chrome.google.com/webstore') || 
                       tab.url.startsWith('https://chromewebstore.google.com/');

  if (isRestricted) {
    chrome.windows.getCurrent((currentWindow) => {
      const width = 340;
      const height = 240;
      const left = Math.round(currentWindow.left + currentWindow.width - width - 30);
      const top = Math.round(currentWindow.top + currentWindow.height - height - 30);
      
      chrome.windows.create({
        url: chrome.runtime.getURL('error.html'),
        type: 'popup',
        width: width,
        height: height,
        left: left,
        top: top
      });
    });
    return;
  }

  try {
    const sessionId = Date.now().toString();

    await chrome.storage.local.set({ activeSessionId: sessionId });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  } catch (err) {
    chrome.windows.getCurrent((currentWindow) => {
      const width = 340;
      const height = 240;
      const left = Math.round(currentWindow.left + currentWindow.width - width - 30);
      const top = Math.round(currentWindow.top + currentWindow.height - height - 30);
      
      chrome.windows.create({
        url: chrome.runtime.getURL('error.html'),
        type: 'popup',
        width: width,
        height: height,
        left: left,
        top: top
      });
    });
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

  if (message.action === 'capture_complete') {
    chrome.storage.local.get('activeSessionId', ({ activeSessionId }) => {
      chrome.tabs.create({ url: chrome.runtime.getURL(`result.html?session=${activeSessionId}`) });
    });
  }
});
