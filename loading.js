const statusEl = document.getElementById('status');
const fillEl = document.getElementById('pb-fill');
const pctTextEl = document.getElementById('pct-text');

const update = async () => {
  const data = await chrome.storage.local.get(['captureProgress', 'captureComplete']);

  if (data.captureComplete) {
    statusEl.textContent = 'Capture complete!';
    fillEl.style.width = '100%';
    pctTextEl.textContent = '100%';
    setTimeout(() => window.close(), 400);
    return;
  }

  if (typeof data.captureProgress === 'number') {
    const pct = Math.max(2, data.captureProgress);
    fillEl.style.width = `${pct}%`;

    if (data.captureProgress === 0) {
      statusEl.textContent = 'Preparing capture...';
      pctTextEl.textContent = '0%';
    } else {
      statusEl.textContent = 'Capturing page...';
      pctTextEl.textContent = `${data.captureProgress}%`;
    }
  }

  setTimeout(update, 250);
};

update();
