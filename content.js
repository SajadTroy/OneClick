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

  const hiddenElements = [];
  const hideFixedElements = () => {
    const elements = document.querySelectorAll('*');
    for (const el of elements) {
      const style = window.getComputedStyle(el);
      if ((style.position === 'fixed' || style.position === 'sticky') && style.opacity !== '0') {
        hiddenElements.push({ el, opacity: el.style.opacity });
        el.style.opacity = '0';
      }
    }
  };

  const restoreFixedElements = () => {
    for (const item of hiddenElements) {
      item.el.style.opacity = item.opacity;
    }
  };

  const originalScrollX = window.scrollX;
  const originalScrollY = window.scrollY;
  const originalOverflow = document.documentElement.style.overflow;
  const originalScrollBehavior = document.documentElement.style.scrollBehavior;
  
  document.documentElement.style.scrollBehavior = 'auto';

  const initialTotalHeight = Math.max(
    document.body.scrollHeight, document.documentElement.scrollHeight,
    document.body.offsetHeight, document.documentElement.offsetHeight,
    document.body.clientHeight, document.documentElement.clientHeight
  );
  
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  const frames = [];

  window.scrollTo(0, 0);
  await wait(600); 

  while (true) {
    const currentScrollY = window.scrollY;
    
    const response = await chrome.runtime.sendMessage({ action: 'capture_visible_tab' });
    if (response && response.dataUrl) {
      frames.push({
        yPos: currentScrollY, 
        dataUrl: response.dataUrl
      });
      showFlash(); 
    } else if (response && response.error) {
      break;
    }
    
    if (currentScrollY === 0) {
        hideFixedElements();
    }

    if (currentScrollY + viewportHeight >= initialTotalHeight) {
        break; 
    }

    let nextYPos = currentScrollY + viewportHeight;
    window.scrollTo(0, nextYPos);
    await wait(600); 
    
    const newScrollY = window.scrollY;
    
    if (newScrollY <= currentScrollY) {
        break;
    }
  }

  restoreFixedElements();
  window.scrollTo(originalScrollX, originalScrollY);
  document.documentElement.style.scrollBehavior = originalScrollBehavior;
  document.documentElement.style.overflow = originalOverflow;
  window.isCapturingScreenshot = false;

  await chrome.storage.local.set({ 
    capturedFrames: frames,
    captureDimensions: {
        width: viewportWidth,
        height: initialTotalHeight,
        viewportHeight: viewportHeight
    }
  });
  
  chrome.runtime.sendMessage({ action: 'capture_complete' });
})();
