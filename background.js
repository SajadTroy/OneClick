chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('https://chrome.google.com/webstore')) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => alert('Cannot capture restricted Chrome pages.')
    }).catch(e => console.error(e));
    return;
  }

  try {
    await chrome.storage.local.set({ capturedFrames: [] });

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
    chrome.tabs.create({ url: chrome.runtime.getURL('result.html') });
  }
});
