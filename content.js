(async function() {
  if (window.isCapturingScreenshot) return;
  window.isCapturingScreenshot = true;

  const { activeSessionId } = await chrome.storage.local.get('activeSessionId');
  const sessionKey = `capturedFrames_${activeSessionId}`;

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const waitForPaint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const hiddenElements = [];

  const hideFixedElements = () => {
    const elements = document.querySelectorAll('*');

    for (const el of elements) {
      const computedStyle = window.getComputedStyle(el);

      if ((computedStyle.position === 'fixed' || computedStyle.position === 'sticky') && computedStyle.opacity !== '0') {
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

  const getScrollingElement = () => {
    const main = document.scrollingElement || document.documentElement;
    if (main.scrollHeight > window.innerHeight) return main;

    let largest = main;
    let maxArea = 0;
    for (const el of document.querySelectorAll('*')) {
      if (el.scrollHeight > el.clientHeight) {
        const style = window.getComputedStyle(el);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay') {
          const area = el.clientWidth * el.clientHeight;
          if (area > maxArea) {
            maxArea = area;
            largest = el;
          }
        }
      }
    }
    return largest;
  };

  const scrollNode = getScrollingElement();
  const isMainScroll = scrollNode === document.scrollingElement || scrollNode === document.documentElement || scrollNode === document.body;

  const originalScrollY = isMainScroll ? window.scrollY : scrollNode.scrollTop;
  const originalOverflow = document.documentElement.style.overflow;
  const originalScrollBehavior = document.documentElement.style.scrollBehavior;

  document.documentElement.style.scrollBehavior = 'auto';
  if (!isMainScroll) scrollNode.style.scrollBehavior = 'auto';

  const setScroll = (y) => isMainScroll ? window.scrollTo(0, y) : (scrollNode.scrollTop = y);
  const getScroll = () => isMainScroll ? window.scrollY : scrollNode.scrollTop;

  const initialTotalHeight = isMainScroll
    ? Math.max(
        document.body.scrollHeight, document.documentElement.scrollHeight,
        document.body.offsetHeight, document.documentElement.offsetHeight,
        document.body.clientHeight, document.documentElement.clientHeight
      )
    : scrollNode.scrollHeight;

  const viewportHeight = document.documentElement.clientHeight;
  const viewportWidth = document.documentElement.clientWidth;

  const stepHeight = isMainScroll ? viewportHeight : scrollNode.clientHeight;
  const stepWidth = isMainScroll ? viewportWidth : scrollNode.clientWidth;

  const frames = [];

  setScroll(0);
  await wait(600);

  while (true) {
    const currentScrollY = getScroll();

    let maxScroll = initialTotalHeight - stepHeight;
    if (maxScroll <= 0) maxScroll = 1;

    let progress = Math.min(100, Math.round((currentScrollY / maxScroll) * 100));
    await chrome.storage.local.set({ captureProgress: progress });

    await waitForPaint();

    const response = await chrome.runtime.sendMessage({ action: 'capture_visible_tab' });

    if (response && response.dataUrl) {
      frames.push({
        yPos: currentScrollY,
        dataUrl: response.dataUrl
      });
    } else if (response && response.error) {
      break;
    }

    if (currentScrollY === 0) {
      hideFixedElements();
    }

    if (currentScrollY + stepHeight >= initialTotalHeight) {
      break;
    }

    const nextYPos = currentScrollY + stepHeight;
    setScroll(nextYPos);
    await wait(400);
    await waitForPaint();

    const newScrollY = getScroll();

    if (newScrollY <= currentScrollY) {
      break;
    }
  }

  restoreFixedElements();
  setScroll(originalScrollY);
  document.documentElement.style.scrollBehavior = originalScrollBehavior;
  document.documentElement.style.overflow = originalOverflow;

  window.isCapturingScreenshot = false;

  const rect = isMainScroll ? null : scrollNode.getBoundingClientRect();
  const pageTitle = document.title || 'Screenshot';

  await chrome.storage.local.set({
    [sessionKey]: {
      title: pageTitle,
      frames,
      dimensions: {
        windowWidth: viewportWidth,
        windowHeight: viewportHeight,
        width: stepWidth,
        height: initialTotalHeight,
        viewportHeight: stepHeight,
        cropRect: rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height, bottom: rect.bottom, right: rect.right } : null
      }
    }
  });

  chrome.runtime.sendMessage({ action: 'capture_complete' });
})();
