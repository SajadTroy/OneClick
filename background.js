function updateActionState(tabId, url) {
  if (!url) return;
  const isRestricted = url.startsWith('chrome://') ||
    url.startsWith('https://chrome.google.com/webstore') ||
    url.startsWith('https://chromewebstore.google.com/');

  chrome.action.setPopup({
    tabId: tabId,
    popup: isRestricted ? 'error.html' : ''
  });
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
  try {
    const sessionId = Date.now().toString();

    await chrome.storage.local.set({ activeSessionId: sessionId });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  } catch (err) {
    chrome.action.setPopup({
      tabId: tab.id,
      popup: 'error.html'
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
