// content.js
(async function() {
  // Guard against multiple injections
  if (window.isCapturingScreenshot) return;
  window.isCapturingScreenshot = true;

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Remove custom scrollbars temporarily if needed, or hide sticky elements
  // We'll stick to basic capture for now.

  const originalScrollX = window.scrollX;
  const originalScrollY = window.scrollY;
  const originalOverflow = document.documentElement.style.overflow;

  // Ensure we can scroll smoothly but without smooth scrolling animation messing up captures
  const originalScrollBehavior = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = 'auto';

  // Get total dimensions
  const totalHeight = Math.max(
    document.body.scrollHeight, document.documentElement.scrollHeight,
    document.body.offsetHeight, document.documentElement.offsetHeight,
    document.body.clientHeight, document.documentElement.clientHeight
  );
  
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  let yPos = 0;
  const frames = [];

  // Scroll to top to start
  window.scrollTo(0, 0);
  await wait(600); // Wait for scroll and to reset API quota limit

  while (yPos < totalHeight) {
    // Take screenshot
    const response = await chrome.runtime.sendMessage({ action: 'capture_visible_tab' });
    if (response && response.dataUrl) {
      frames.push({
        yPos: Math.min(yPos, totalHeight - viewportHeight), // The actual Y position this frame represents
        dataUrl: response.dataUrl
      });
    } else if (response && response.error) {
      console.error("Capture error from background:", response.error);
      break;
    }

    // Determine next scroll position
    let nextYPos = yPos + viewportHeight;
    
    // If next position goes beyond total height, adjust to just capture the remaining part
    // However, window.scrollTo handles scrolling past max height by just stopping at the bottom.
    // We can just scroll to the next position.
    
    if (yPos + viewportHeight >= totalHeight) {
        break; // We've reached the bottom
    }
    
    // To handle fixed headers gracefully, we could subtract a small overlap
    // But for simplicity, we do full viewport height scrolls
    yPos = nextYPos;
    window.scrollTo(0, yPos);
    
    // Check if we hit the bottom (in case totalHeight was inaccurate)
    await wait(600); // Increased to respect MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND (max 2/sec)
    const actualScrollY = window.scrollY;
    
    // If we didn't actually scroll further, we're at the bottom
    if (actualScrollY + viewportHeight >= totalHeight) {
        // Take one final screenshot for the very bottom
        const finalResponse = await chrome.runtime.sendMessage({ action: 'capture_visible_tab' });
        if (finalResponse && finalResponse.dataUrl) {
            frames.push({
                yPos: totalHeight - viewportHeight, 
                dataUrl: finalResponse.dataUrl
            });
        }
        break;
    }
    
    // Update yPos to actual in case it differs
    yPos = actualScrollY;
  }

  // Restore original state
  window.scrollTo(originalScrollX, originalScrollY);
  document.documentElement.style.scrollBehavior = originalScrollBehavior;
  document.documentElement.style.overflow = originalOverflow;
  window.isCapturingScreenshot = false;

  // Save to storage and tell background script to open result page
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
