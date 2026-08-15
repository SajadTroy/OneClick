document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('result-canvas');
    const ctx = canvas.getContext('2d');
    const loading = document.getElementById('loading');
    const btnPng = document.getElementById('download-png');
    const btnPdf = document.getElementById('download-pdf');

    // Retrieve data from storage
    const { capturedFrames, captureDimensions } = await chrome.storage.local.get(['capturedFrames', 'captureDimensions']);

    if (!capturedFrames || capturedFrames.length === 0) {
        loading.textContent = "Error: No screenshot data found.";
        loading.style.color = "red";
        loading.classList.remove('loading');
        return;
    }

    // Helper to load image
    const loadImage = (src) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

    try {
        // Load the first image to get the actual device pixel ratio scale
        const firstImg = await loadImage(capturedFrames[0].dataUrl);
        
        // Window innerWidth might differ from capture dimension due to scale/retina displays
        // We use the image width as the source of truth for the canvas width
        const scale = firstImg.width / captureDimensions.width;
        
        canvas.width = firstImg.width;
        canvas.height = captureDimensions.height * scale;

        // Draw all frames
        for (const frame of capturedFrames) {
            const img = await loadImage(frame.dataUrl);
            ctx.drawImage(img, 0, frame.yPos * scale);
        }

        loading.style.display = 'none';
        canvas.style.display = 'block';

        // Setup download handlers
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
            
            // Convert canvas dimensions to pt for PDF
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            
            // We'll create a PDF where the page size exactly matches the image aspect ratio,
            // or we scale it to fit standard pages. Let's make the PDF page match the image dimensions
            // so there's no paging, just one long continuous PDF.
            
            // pdf dimension in pt (1 pt = 1/72 inch).
            // image width in px. 
            const pxToPt = 0.75;
            const pdfWidth = canvas.width * pxToPt;
            const pdfHeight = canvas.height * pxToPt;

            const doc = new jsPDF({
                orientation: pdfWidth > pdfHeight ? 'l' : 'p',
                unit: 'pt',
                format: [pdfWidth, pdfHeight]
            });

            doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            
            // To save using jsPDF's built-in save:
            // doc.save('screenshot.pdf');
            
            // But to use Chrome's download API for consistency:
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
