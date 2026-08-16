document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('result-canvas');
  const ctx = canvas.getContext('2d');
  const loading = document.getElementById('loading');
  const btnPng = document.getElementById('download-png');
  const btnPdf = document.getElementById('download-pdf');

  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session');
  const sessionKey = `capturedFrames_${sessionId}`;

  const stored = await chrome.storage.local.get(sessionKey);
  const sessionData = stored[sessionKey];

  if (!sessionData || !sessionData.frames || sessionData.frames.length === 0) {
    loading.textContent = 'Error: No screenshot data found.';
    loading.style.color = 'red';
    loading.classList.remove('loading');
    return;
  }

  const { frames: capturedFrames, dimensions: captureDimensions } = sessionData;

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

    const headerHeight = cropRect ? cropRect.top : 0;
    const footerHeight = cropRect ? captureDimensions.windowHeight - cropRect.bottom : 0;
    
    const totalHeight = cropRect 
      ? (headerHeight + captureDimensions.height + footerHeight) * scale
      : captureDimensions.height * scale;

    canvas.width = windowWidth * scale;
    canvas.height = totalHeight;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let drawY = 0;

    for (let i = 0; i < capturedFrames.length; i++) {
      const img = await loadImage(capturedFrames[i].dataUrl);

      if (!cropRect) {
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

    loading.style.display = 'none';
    canvas.style.display = 'block';

    btnPng.addEventListener('click', () => {
      const dataUrl = canvas.toDataURL('image/png');
      chrome.downloads.download({
        url: dataUrl,
        filename: 'screenshot.png',
        saveAs: true
      });
    });

    btnPdf.addEventListener('click', () => {
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
        filename: 'screenshot.pdf',
        saveAs: true
      }, () => {
        URL.revokeObjectURL(url);
      });
    });

  } catch (err) {
    console.error('Error rendering screenshot:', err);
    loading.textContent = 'Error rendering screenshot.';
    loading.style.color = 'red';
  }
});
