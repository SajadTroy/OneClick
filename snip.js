(() => {
  if (window.isSnipping) return;
  window.isSnipping = true;

  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
  overlay.style.zIndex = '2147483647';
  overlay.style.cursor = 'crosshair';
  
  const selection = document.createElement('div');
  selection.style.position = 'absolute';
  selection.style.border = '2px solid #3b82f6';
  selection.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
  selection.style.display = 'none';
  overlay.appendChild(selection);

  document.body.appendChild(overlay);

  let startX, startY, isDragging = false;

  const onMouseDown = (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    selection.style.left = `${startX}px`;
    selection.style.top = `${startY}px`;
    selection.style.width = '0px';
    selection.style.height = '0px';
    selection.style.display = 'block';
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    const currentX = e.clientX;
    const currentY = e.clientY;
    
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    
    selection.style.left = `${left}px`;
    selection.style.top = `${top}px`;
    selection.style.width = `${width}px`;
    selection.style.height = `${height}px`;
  };

  const onMouseUp = (e) => {
    if (!isDragging) return;
    isDragging = false;
    
    const currentX = e.clientX;
    const currentY = e.clientY;
    
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    overlay.remove();
    window.isSnipping = false;

    // Small delay to let overlay disappear from screen before capturing
    setTimeout(() => {
      chrome.runtime.sendMessage({
        action: 'capture_snip',
        rect: { left, top, width, height },
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        title: document.title
      });
    }, 100);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      window.isSnipping = false;
    }
  };

  overlay.addEventListener('mousedown', onMouseDown);
  overlay.addEventListener('mousemove', onMouseMove);
  overlay.addEventListener('mouseup', onMouseUp);
  window.addEventListener('keydown', onKeyDown, { once: true });
})();
