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

async function injectErrorPopup(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const popup = document.createElement('div');
        popup.style.cssText = `
          position: fixed;
          bottom: 30px;
          right: 30px;
          background: #ffffff;
          border: 1px solid #fca5a5;
          color: #0f172a;
          padding: 16px 24px;
          border-radius: 12px;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 15px;
          font-weight: 500;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          z-index: 2147483647;
          display: flex;
          align-items: center;
          gap: 14px;
        `;
        popup.innerHTML = `
          <div style="width: 20px; height: 20px; background: #ef4444; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">!</div>
          Cannot capture this restricted page.
        `;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 4000);
      }
    });
  } catch (err) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'OneClick Screenshot',
      message: 'Chrome security prevents capturing system pages or the Web Store.'
    });
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  const isRestricted = tab.url.startsWith('chrome://') || 
                       tab.url.startsWith('https://chrome.google.com/webstore') || 
                       tab.url.startsWith('https://chromewebstore.google.com/');

  if (isRestricted) {
    await injectErrorPopup(tab.id);
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
    await injectErrorPopup(tab.id);
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
