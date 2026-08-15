// background.js

chrome.action.onClicked.addListener(async (tab) => {
  // Prevent executing on restricted urls
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('https://chrome.google.com/webstore')) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => alert("Cannot capture restricted Chrome pages.")
    }).catch(e => console.error(e));
    return;
  }

  // Inject content script if not already injected, or just execute it directly
  try {
    // Clear any previous capture data
    await chrome.storage.local.set({ capturedFrames: [] });
    
    // Inject and run the scrolling/capture script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  } catch (err) {
    console.error('Failed to start capture:', err);
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'capture_visible_tab') {
    // Capture the current visible tab
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error("Capture failed:", chrome.runtime.lastError.message);
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ dataUrl: dataUrl });
      }
    });
    return true; // Keep the message channel open for async response
  } 
  
  if (message.action === 'capture_complete') {
    // Open the result page
    chrome.tabs.create({ url: chrome.runtime.getURL('result.html') });
  }
});
