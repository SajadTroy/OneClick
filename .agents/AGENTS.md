# Project Rules

## Agent Behavior

- **Never push or commit to git automatically**. You may write code and modify files, but never execute `git commit` or `git push`. The user will handle all version control manually.
- **Maintain AGENTS.md**: Whenever you create, update, rename, or delete files and folders in the project, you must immediately update the `Project Structure` and `File Responsibilities` sections in `.agents/AGENTS.md` to accurately reflect those changes.

## Code Style

- Never include comments in any code file. No inline comments, no block comments, no JSDoc.
- All code must be formatted with proper spacing and blank lines between logical sections, functions, and blocks.
- Use 2-space indentation for all JavaScript, JSON, HTML, and CSS files.
- Leave one blank line between function declarations.
- Leave one blank line between distinct logical sections within a function.
- Opening braces stay on the same line as the declaration.
- Always use `async`/`await`. Never use `.then()` chains.

## Manifest V3 Rules

- Always use `manifest_version: 3`. Never generate Manifest V2 patterns.
- Use `background.service_worker` not `background.scripts`.
- Use `chrome.action` not `chrome.browserAction`.
- Use `chrome.scripting.executeScript` not `chrome.tabs.executeScript`.
- `host_permissions` is separate from `permissions`.
- No inline `<script>` tags in HTML. Always use `<script src="file.js">`.
- No inline event handlers in HTML. Always use `addEventListener`.

---

## Project Structure

```
OneClick_Webpage_Screenshot/
├── .github/
│   └── FUNDING.yml          # GitHub Sponsors configuration — links to SajadTroy's sponsor page.
├── icons/
│   ├── icon.svg             # Source SVG logo. Blue rounded rectangle with browser window + camera lens.
│   ├── icon16.png           # 16×16 extension icon used in the browser toolbar.
│   ├── icon48.png           # 48×48 extension icon used in chrome://extensions/.
│   └── icon128.png          # 128×128 icon used in the Chrome Web Store listing.
├── lib/
│   └── jspdf.umd.min.js     # Local copy of jsPDF v2.5.1 used for PDF export in result.js.
├── src/                     # Promotional assets for the Chrome Web Store.
│   ├── promo2.html          # HTML source code for the features promotional screenshot.
│   ├── promo_screenshot.jpg # Generated 1280x800 main promotional screenshot.
│   └── promo_screenshot_features.jpg # Generated 1280x800 features promotional screenshot.
├── background.js            # Service worker. Handles chrome.action.onClicked, captureVisibleTab calls,
│                            # and opens the result tab when capture is complete.
├── content.js               # Injected into the active tab. Creates the clean white-themed progress popup,
│                            # hides fixed/sticky elements, scrolls the page, coordinates frame captures
│                            # via message passing to background.js, and saves frames to chrome.storage.local.
├── manifest.json            # Manifest V3 configuration. Declares name, permissions, icons,
│                            # service worker, and action.
├── result.css               # Styles for result.html. Dark card design with download buttons.
├── result.html              # The result page opened after capture completes. Shows a canvas preview
│                            # of the stitched screenshot and PNG/PDF download buttons.
├── result.js                # Retrieves captured frames from chrome.storage.local, stitches them onto
│                            # a <canvas> using cumulative height stacking (no yPos math), and handles
│                            # PNG and PDF download logic including multi-page PDF pagination.
├── CHANGELOG.md             # Version history documenting all notable changes to the extension.
├── LICENSE                  # MIT License. Copyright SajadTroy 2026.
├── OneClick_v1.0.0.zip      # The finalized packed extension ready for Web Store upload.
└── README.md                # Project documentation. Covers features, developer installation,
                             # usage instructions, and sponsor badge.
```

## File Responsibilities

### `manifest.json`
Declares all extension metadata. If you add a new chrome.* API, add the required permission here first.
Permissions currently in use:

- `activeTab` — grants temporary access to the current tab when the extension icon is clicked.
- `scripting` — allows `chrome.scripting.executeScript` to inject `content.js`.
- `storage` — required to use `chrome.storage.local`.
- `unlimitedStorage` — allows storing large base64-encoded screenshot frames without quota errors.
- `downloads` — allows `chrome.downloads.download` to save PNG and PDF files.
- `host_permissions: <all_urls>` — needed to inject `content.js` into any website.

### `background.js`
The extension's service worker. It must not store any state in global variables (service workers are ephemeral).
Responsibilities:
- Listens for `chrome.action.onClicked` to start a capture.
- Handles `capture_visible_tab` messages from `content.js` and calls `chrome.tabs.captureVisibleTab`.
- Listens for `capture_complete` message and opens `result.html` in a new tab.

### `content.js`
Injected into the active tab by the service worker. Runs as an IIFE and guards against double-injection with `window.isCapturingScreenshot`.
Responsibilities:
- Creates the glassmorphism animated progress popup injected into the page DOM.
- Hides all `position: fixed` and `position: sticky` elements before the second+ screenshots to prevent header repetition.
- Scrolls the page top-to-bottom in `clientHeight` increments.
- Hides the popup, waits for a double `requestAnimationFrame` paint, then sends `capture_visible_tab` to `background.js`.
- Saves all frames and dimensions to `chrome.storage.local`.
- Sends `capture_complete` to trigger the result page.

### `result.html` + `result.css`
The output page. Loaded in a new Chrome tab after capture.
Contains a canvas preview and two download buttons. Loads `lib/jspdf.umd.min.js` and `result.js`.

### `result.js`
Stitches captured frames onto a single `<canvas>` using cumulative `drawY` tracking (not scroll-position math) to avoid sub-pixel gaps.
The last frame is clipped using `drawImage` source-rect overload to fill exactly the remaining canvas height.
For PDF export, the canvas is first scaled down to a max width of `1240px` on an offscreen canvas to reduce file size and improve PDF viewer scrolling performance. PDF pages are paginated to respect jsPDF's 14,400 pt max page height limit.

### `lib/jspdf.umd.min.js`
Must be kept local (not loaded from a CDN) to comply with Chrome Extension Content Security Policy.
Do not upgrade this file without testing PDF export on both short and very long pages.

### `icons/icon.svg`
The canonical source for the extension logo. Regenerate PNGs from this file whenever the logo changes.
Use a Python/Pillow script with `Image.RGBA` and transparent background — never use macOS `qlmanage` or `sips` as they add a white background.
