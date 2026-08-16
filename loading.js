const statusEl = document.getElementById('status');

const update = async () => {
  const data = await chrome.storage.local.get(['captureProgress', 'captureComplete']);

  if (data.captureComplete) {
    window.close();
    return;
  }

  if (typeof data.captureProgress === 'number') {
    if (data.captureProgress === 0) {
      statusEl.textContent = 'Preparing capture...';
    } else {
      statusEl.textContent = `Capturing... ${data.captureProgress}%`;
    }
  }

  setTimeout(update, 250);
};

update();
