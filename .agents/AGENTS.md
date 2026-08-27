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
│   └── FUNDING.yml          # GitHub Sponsors + Buy Me A Coffee funding configuration.
├── fonts/
│   ├── Inter-Regular.woff2  # Inter font weight 400, bundled locally for extension CSP.
│   ├── Inter-Medium.woff2   # Inter font weight 500.
│   ├── Inter-SemiBold.woff2 # Inter font weight 600.
│   └── Inter-Bold.woff2     # Inter font weight 700.
├── icons/
│   ├── icon.svg             # Source SVG logo. Blue rounded rectangle with browser window + camera lens.
│   ├── icon16.png           # 16×16 extension icon used in the browser toolbar.
│   ├── icon48.png           # 48×48 extension icon used in chrome://extensions/.
│   ├── icon128.png          # 128×128 icon used in the Chrome Web Store listing.
│   └── bmc-button.svg       # Buy Me A Coffee button used in result.html.
├── lib/
│   ├── jspdf.umd.min.js     # Local copy of jsPDF v2.5.1 used for PDF export in result.js.
│   └── pdfobject.min.js     # Local copy of pdfobject used by jsPDF for PDF preview.
├── src/                     # Promotional assets and branding resources (not shipped in zip).
│   ├── bmcbrand/            # Buy Me A Coffee official branding assets (SVGs, PNGs).
│   ├── banner_one.png       # Promotional banner image.
│   ├── banner_two.png       # Promotional banner image.
│   ├── promo2.html          # HTML source code for the features promotional screenshot.
│   ├── promo_screenshot.jpg # Generated 1280x800 main promotional screenshot.
│   └── promo_screenshot_features.jpg # Generated 1280x800 features promotional screenshot.
├── background.js            # Service worker. Handles chrome.action.onClicked, captureVisibleTab calls,
│                            # sets popup to loading.html during capture, and opens the result tab when complete.
├── content.js               # Injected into the active tab. Scrolls the page, captures frames via message
│                            # passing to background.js, writes progress to chrome.storage.local, and saves
│                            # frames when complete. No DOM injection.
├── error.html               # Native popup shown on restricted pages. Animated cloud background,
│                            # brand header, pop-in error icon, and styled error message.
├── loading.html             # Native popup shown during capture. Animated cloud background,
│                            # streaking lines, brand header, candy-stripe progress bar.
├── loading.js               # Script for loading.html. Polls captureProgress and drives the
│                            # progress bar fill width and percentage text display.
├── manifest.json            # Manifest V3 configuration. Declares name, permissions, icons,
│                            # service worker, default popup, and action.
├── popup.html               # The new default popup opened when clicking the extension icon.
│                            # Shows mode chooser (Visible Area, Snip & Capture, Full Page).
├── popup.js                 # Script for popup.html. Sends mode selection to background.js.
├── snip.js                  # Injected for "Snip & Capture". Draws selection overlay on page.
├── result.css               # Styles for result.html. Inter font-face declarations, CSS custom
│                            # properties for light/dark theming, toolbar layout, workspace area,
│                            # zoom controls, toast notifications, and responsive breakpoints.
├── result.html              # Toolbar-based result page opened after capture. Top toolbar with
│                            # brand, dimensions badge, zoom controls, copy, download PNG/PDF,
│                            # BMC button, dark mode toggle. Workspace area with canvas preview.
├── result.js                # Retrieves captured frames, stitches onto canvas, handles zoom
│                            # (in/out/fit), copy to clipboard with toast, dark mode toggle with
│                            # persistence, dimensions display, and PNG/PDF download logic.
├── CHANGELOG.md             # Version history documenting all notable changes to the extension.
├── LICENSE                  # MIT License. Copyright SajadTroy 2026.
├── OneClick_v1.1.4.zip      # The finalized packed extension ready for Web Store upload.
├── PRIVACY.md               # Dedicated Privacy Policy required by Chrome Web Store.
├── README.md                # Project documentation. Covers features, developer installation,
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

### `loading.html` + `loading.js`
Native extension popup shown as the action popup during an active capture session.
`background.js` sets the popup to `loading.html` when capture starts and resets it to `''` when done.
Features animated floating clouds, streaking lines, brand header with icon, pulse-animated capture icon, and a candy-stripe progress bar.
`loading.js` polls `chrome.storage.local` every 250ms for `captureProgress` (0–100) and `captureComplete` (boolean), drives the progress bar fill width and percentage text, and auto-closes when capture finishes.

### `error.html`
Native extension popup shown when the user clicks the icon on restricted pages (`chrome://`, `chrome-extension://`, Web Store).
Features animated cloud background, brand header, and a pop-in animated error icon matching the loading popup design language.

### `content.js`
Injected into the active tab by the service worker. Runs as an IIFE and guards against double-injection with `window.isCapturingScreenshot`.
Responsibilities:
- Hides all `position: fixed` and `position: sticky` elements before the second+ screenshots to prevent header repetition.
- Scrolls the page top-to-bottom in `clientHeight` increments.
- Writes `captureProgress` to `chrome.storage.local` for `loading.html` to display.
- Waits for a double `requestAnimationFrame` paint, then sends `capture_visible_tab` to `background.js`.
- Saves all frames and dimensions to `chrome.storage.local`.
- Sends `capture_complete` to trigger the result page.

### `result.html` + `result.css`
Toolbar-based result page opened in a new Chrome tab after capture.
Top toolbar (52px): brand icon + name, dimensions badge (`W × H`), zoom controls group (in/out/fit with percentage), copy to clipboard button, download PNG/PDF buttons, BMC button, and dark mode toggle.
Workspace area below with scrollable canvas preview.
`result.css` defines Inter font-face declarations, CSS custom properties for light/dark theming (`.dark` class on `<html>`), toolbar, workspace, zoom group, badge, separator, toast notification, and responsive breakpoints.

### `result.js`
Stitches captured frames onto a single `<canvas>` using cumulative `drawY` tracking (not scroll-position math) to avoid sub-pixel gaps.
The last frame is clipped using `drawImage` source-rect overload to fill exactly the remaining canvas height.
Additional interactive features:
- Zoom controls: zoom in (+25%), zoom out (-25%), fit-to-window toggle with percentage display.
- Copy to clipboard: uses `navigator.clipboard.write()` with toast feedback (no extra permission needed).
- Dark mode toggle: toggles `.dark` class on `<html>`, persists preference to `chrome.storage.local`.
- Dimensions display: shows stitched image dimensions in the toolbar badge.
For PDF export, PDF pages are paginated to respect jsPDF's 14,400 pt max page height limit.

### `lib/jspdf.umd.min.js`
Must be kept local (not loaded from a CDN) to comply with Chrome Extension Content Security Policy.
Do not upgrade this file without testing PDF export on both short and very long pages.

### `lib/pdfobject.min.js`
Local copy of pdfobject used by jsPDF for PDF preview. Must be kept local to comply with Chrome Extension Content Security Policy.

### `icons/icon.svg`
The canonical source for the extension logo. Regenerate PNGs from this file whenever the logo changes.
Use a Python/Pillow script with `Image.RGBA` and transparent background — never use macOS `qlmanage` or `sips` as they add a white background.
