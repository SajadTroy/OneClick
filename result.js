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

        // Fill background with white to prevent any transparent lines
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < capturedFrames.length; i++) {
            const frame = capturedFrames[i];
            const img = await loadImage(frame.dataUrl);
            
            // Snap to physical pixels to prevent anti-aliasing gaps
            let yOffset = Math.floor(frame.yPos * scale);
            // Overlap by 1 pixel to hide any sub-pixel rendering lines
            if (i > 0) {
                yOffset -= 1;
            }
            ctx.drawImage(img, 0, yOffset);
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
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            
            const pxToPt = 0.75;
            const pdfWidth = canvas.width * pxToPt;
            const totalPdfHeight = canvas.height * pxToPt;
            const MAX_PAGE_HEIGHT = 14400; // jsPDF physical limit per page

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
        console.error("Error rendering screenshot:", err);
        loading.textContent = "Error rendering screenshot.";
        loading.style.color = "red";
    }
});
