document.addEventListener('DOMContentLoaded', () => {
  const STORE_EXTENSION_ID = 'your_extension_id_here'; // Replace with actual ID later if needed

  function getReviewUrl() {
    return `https://chromewebstore.google.com/detail/${STORE_EXTENSION_ID}/reviews`;
  }

  const rateUsBtn = document.getElementById('rate-us');
  if (rateUsBtn) {
    rateUsBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: getReviewUrl() });
      window.close();
    });
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
