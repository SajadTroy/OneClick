document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && tab.url) {
      const isRestricted = tab.url.startsWith('chrome://') ||
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('https://chrome.google.com/webstore') ||
        tab.url.startsWith('https://chromewebstore.google.com/');
        
      if (isRestricted) {
        window.location.href = 'error.html';
        return;
      }
    }
  });

  const versionBadge = document.getElementById('ext-version');
  if (versionBadge && chrome.runtime.getManifest) {
    versionBadge.textContent = 'v' + chrome.runtime.getManifest().version;
  }

  document.querySelectorAll('.mode-row').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      if (mode) {
        chrome.runtime.sendMessage({
          action: 'start_capture',
          mode: mode
        });
        if (mode === 'fullpage') {
          window.location.href = 'loading.html';
        } else {
          window.close();
        }
      }
    });
  });
});
