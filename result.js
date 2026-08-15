document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('result-canvas');
    const ctx = canvas.getContext('2d');
    const loading = document.getElementById('loading');
    const btnPng = document.getElementById('download-png');
    const btnPdf = document.getElementById('download-pdf');

    const { capturedFrames, captureDimensions } = await chrome.storage.local.get(['capturedFrames', 'captureDimensions']);

    if (!capturedFrames || capturedFrames.length === 0) {
        loading.textContent = "Error: No screenshot data found.";
        loading.style.color = "red";
        loading.classList.remove('loading');
        return;
    }

    const loadImage = (src) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

    try {
        const firstImg = await loadImage(capturedFrames[0].dataUrl);
        const scale = firstImg.width / captureDimensions.width;
        
        canvas.width = firstImg.width;
        canvas.height = captureDimensions.height * scale;

        for (const frame of capturedFrames) {
            const img = await loadImage(frame.dataUrl);
            ctx.drawImage(img, 0, frame.yPos * scale);
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
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            
            const pxToPt = 0.75;
            const pdfWidth = canvas.width * pxToPt;
            const pdfHeight = canvas.height * pxToPt;

            const doc = new jsPDF({
                orientation: pdfWidth > pdfHeight ? 'l' : 'p',
                unit: 'pt',
                format: [pdfWidth, pdfHeight]
            });

            doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            
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
        console.error("Error rendering screenshot:", err);
        loading.textContent = "Error rendering screenshot.";
        loading.style.color = "red";
    }
});
