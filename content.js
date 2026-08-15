(async function() {
  if (window.isCapturingScreenshot) return;
  window.isCapturingScreenshot = true;

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const showFlash = () => {
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100vw';
    flash.style.height = '100vh';
    flash.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
    flash.style.zIndex = '2147483647';
    flash.style.pointerEvents = 'none';
    flash.style.transition = 'opacity 0.2s ease-out';
    document.documentElement.appendChild(flash);
    
    requestAnimationFrame(() => {
        flash.style.opacity = '0';
        setTimeout(() => flash.remove(), 200);
    });
  };

  const originalScrollX = window.scrollX;
  const originalScrollY = window.scrollY;
  const originalOverflow = document.documentElement.style.overflow;
  const originalScrollBehavior = document.documentElement.style.scrollBehavior;
  
  document.documentElement.style.scrollBehavior = 'auto';

  const totalHeight = Math.max(
    document.body.scrollHeight, document.documentElement.scrollHeight,
    document.body.offsetHeight, document.documentElement.offsetHeight,
    document.body.clientHeight, document.documentElement.clientHeight
  );
  
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  let yPos = 0;
  const frames = [];

  window.scrollTo(0, 0);
  await wait(600); 

  while (yPos < totalHeight) {
    const response = await chrome.runtime.sendMessage({ action: 'capture_visible_tab' });
    if (response && response.dataUrl) {
      frames.push({
        yPos: Math.min(yPos, totalHeight - viewportHeight), 
        dataUrl: response.dataUrl
      });
      showFlash(); 
    } else if (response && response.error) {
      break;
    }

    let nextYPos = yPos + viewportHeight;
    if (yPos + viewportHeight >= totalHeight) break;
    
    yPos = nextYPos;
    window.scrollTo(0, yPos);
    
    await wait(600); 
    const actualScrollY = window.scrollY;
    
    if (actualScrollY + viewportHeight >= totalHeight) {
        const finalResponse = await chrome.runtime.sendMessage({ action: 'capture_visible_tab' });
        if (finalResponse && finalResponse.dataUrl) {
            frames.push({
                yPos: totalHeight - viewportHeight, 
                dataUrl: finalResponse.dataUrl
            });
            showFlash();
        }
        break;
    }
    yPos = actualScrollY;
  }

  window.scrollTo(originalScrollX, originalScrollY);
  document.documentElement.style.scrollBehavior = originalScrollBehavior;
  document.documentElement.style.overflow = originalOverflow;
  window.isCapturingScreenshot = false;

  await chrome.storage.local.set({ 
    capturedFrames: frames,
    captureDimensions: {
        width: viewportWidth,
        height: totalHeight,
        viewportHeight: viewportHeight
    }
  });
  
  chrome.runtime.sendMessage({ action: 'capture_complete' });
})();
