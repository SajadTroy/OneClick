document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('result-canvas');
  const ctx = canvas.getContext('2d');
  const loadingEl = document.getElementById('loading');
  const canvasWrap = document.getElementById('canvas-wrap');
  const workspace = document.getElementById('workspace');
  const dimensionsEl = document.getElementById('dimensions');
  const zoomValueEl = document.getElementById('zoom-value');
  const toastEl = document.getElementById('toast');

  let currentZoom = 1;
  let fitZoom = 1;
  let isFitMode = true;

  const showToast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2000);
  };

  const calcFitZoom = () => {
    if (!canvas.width || !canvas.height) return 1;
    const pad = 48;
    const availW = workspace.clientWidth - pad;
    const availH = workspace.clientHeight - pad;
    return Math.min(1, availW / canvas.width, availH / canvas.height);
  };

  const applyZoom = () => {
    const pct = Math.round(currentZoom * 100);
    zoomValueEl.textContent = `${pct}%`;
    const zoomSlider = document.getElementById('zoom-slider');
    if (zoomSlider) zoomSlider.value = pct;

    const fitBtn = document.getElementById('zoom-fit');
    if (isFitMode) {
      fitBtn.classList.add('is-fit');
    } else {
      fitBtn.classList.remove('is-fit');
    }

    canvasWrap.style.width = `${Math.round(canvas.width * currentZoom)}px`;
    canvasWrap.style.height = `${Math.round(canvas.height * currentZoom)}px`;
  };

  const setZoom = (z) => {
    currentZoom = Math.max(0.1, Math.min(5, z));
    isFitMode = false;
    applyZoom();
  };

  const doFitZoom = () => {
    fitZoom = calcFitZoom();
    currentZoom = fitZoom;
    isFitMode = true;
    applyZoom();
  };

  const zoomSlider = document.getElementById('zoom-slider');
  
  zoomSlider.addEventListener('input', (e) => {
    setZoom(e.target.value / 100);
  });

  document.getElementById('zoom-fit').addEventListener('click', () => {
    if (isFitMode) {
      setZoom(1);
    } else {
      doFitZoom();
    }
  });

  window.addEventListener('resize', () => {
    if (isFitMode) {
      doFitZoom();
    }
  });

  document.getElementById('copy-btn').addEventListener('click', async () => {
    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast('Copied to clipboard');
    } catch (err) {
      showToast('Failed to copy');
    }
  });

  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session');
  const sessionKey = `capturedFrames_${sessionId}`;

  const stored = await chrome.storage.local.get(sessionKey);
  const sessionData = stored[sessionKey];

  if (!sessionData || !sessionData.frames || sessionData.frames.length === 0) {
    loadingEl.querySelector('.loading-text').textContent = 'Error: No screenshot data found.';
    loadingEl.querySelector('.loading-spinner').style.display = 'none';
    return;
  }

  const { title, frames: capturedFrames, dimensions: captureDimensions } = sessionData;
  const safeTitle = (title || 'Screenshot').replace(/[<>:"\/\\|?*\x00-\x1F]/g, '-').trim() || 'Screenshot';

  const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  try {
    const firstImg = await loadImage(capturedFrames[0].dataUrl);
    const windowWidth = captureDimensions.windowWidth || captureDimensions.width;
    const scale = firstImg.width / windowWidth;
    const cropRect = captureDimensions.cropRect;
    const snipRect = captureDimensions.snipRect;

    let totalHeight;
    
    if (snipRect) {
      totalHeight = snipRect.height * scale;
      canvas.width = snipRect.width * scale;
    } else if (cropRect) {
      const headerHeight = cropRect.top;
      const footerHeight = captureDimensions.windowHeight - cropRect.bottom;
      totalHeight = (headerHeight + captureDimensions.height + footerHeight) * scale;
      canvas.width = windowWidth * scale;
    } else {
      totalHeight = captureDimensions.height * scale;
      canvas.width = windowWidth * scale;
    }

    canvas.height = totalHeight;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let drawY = 0;

    for (let i = 0; i < capturedFrames.length; i++) {
      const img = await loadImage(capturedFrames[i].dataUrl);

      if (snipRect) {
        const sx = snipRect.left * scale;
        const sy = snipRect.top * scale;
        const sw = snipRect.width * scale;
        const sh = snipRect.height * scale;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      } else if (!cropRect) {
        if (i < capturedFrames.length - 1) {
          ctx.drawImage(img, 0, drawY);
          drawY += img.height;
        } else {
          const remaining = totalHeight - drawY;
          const srcY = img.height - remaining;
          ctx.drawImage(img, 0, srcY, img.width, remaining, 0, drawY, img.width, remaining);
        }
      } else {
        const sx = 0;
        const sw = img.width;

        if (i === 0) {
          const sy = 0;
          const sh = cropRect.bottom * scale;
          ctx.drawImage(img, sx, sy, sw, sh, 0, drawY, sw, sh);
          drawY += sh;
        } else if (i < capturedFrames.length - 1) {
          const sy = cropRect.top * scale;
          const sh = cropRect.height * scale;
          ctx.drawImage(img, sx, sy, sw, sh, 0, drawY, sw, sh);
          drawY += sh;
        } else {
          const remaining = totalHeight - drawY;
          const sy = img.height - remaining;
          const sh = remaining;
          ctx.drawImage(img, sx, sy, sw, sh, 0, drawY, sw, sh);
          drawY += sh;
        }
      }
    }

    dimensionsEl.textContent = `${canvas.width} × ${canvas.height}`;

    loadingEl.style.display = 'none';
    canvas.style.display = 'block';

    doFitZoom();

    document.getElementById('download-png').addEventListener('click', () => {
      const dataUrl = canvas.toDataURL('image/png');
      chrome.downloads.download({
        url: dataUrl,
        filename: `${safeTitle}.png`,
        saveAs: true
      });
    });

    document.getElementById('download-pdf').addEventListener('click', () => {
      const { jsPDF } = window.jspdf;

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      const pxToPt = 0.75;
      const pdfWidth = canvas.width * pxToPt;
      const totalPdfHeight = canvas.height * pxToPt;
      const MAX_PAGE_HEIGHT = 14400;
      const firstPageHeight = Math.min(totalPdfHeight, MAX_PAGE_HEIGHT);

      const doc = new jsPDF({
        orientation: pdfWidth > firstPageHeight ? 'l' : 'p',
        unit: 'pt',
        format: [pdfWidth, firstPageHeight]
      });

      let remainingHeight = totalPdfHeight;
      let position = 0;
      let isFirstPage = true;

      while (remainingHeight > 0) {
        const currentPageHeight = Math.min(MAX_PAGE_HEIGHT, remainingHeight);

        if (!isFirstPage) {
          doc.addPage([pdfWidth, currentPageHeight], pdfWidth > currentPageHeight ? 'l' : 'p');
        }

        doc.addImage(imgData, 'JPEG', 0, position, pdfWidth, totalPdfHeight);

        remainingHeight -= MAX_PAGE_HEIGHT;
        position -= MAX_PAGE_HEIGHT;
        isFirstPage = false;
      }

      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);

      chrome.downloads.download({
        url: url,
        filename: `${safeTitle}.pdf`,
        saveAs: true
      }, () => {
        URL.revokeObjectURL(url);
      });
    });

  } catch (err) {
    console.error('Error rendering screenshot:', err);
    loadingEl.querySelector('.loading-text').textContent = 'Error rendering screenshot.';
    loadingEl.querySelector('.loading-spinner').style.display = 'none';
  }
});
