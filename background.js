chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('https://chrome.google.com/webstore') || tab.url.startsWith('https://chromewebstore.google.com/')) {
    const width = 450;
    const height = 300;
    chrome.windows.create({
      url: chrome.runtime.getURL('error.html'),
      type: 'popup',
      width: width,
      height: height,
      left: Math.round((tab.width || 1000) / 2 - width / 2),
      top: Math.round((tab.height || 800) / 2 - height / 2)
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
    console.error(err);
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
