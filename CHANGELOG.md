# Version History / Changelog

All notable changes to the OneClick Webpage Screenshot extension will be documented in this file.

## [1.1.4] - Major Feature Update & UI Redesign
### Added
- **Popup Menu:** Replaced the single-click full-page capture with a rich popup menu.
- **New Capture Modes:** Introduced "Visible Area" and "Snip & Capture" (region selection) alongside the existing "Full Page" capture.
- **Snip Overlay:** Added a custom crosshair overlay for precise region selection on any webpage.
- **Review Button:** Added a direct link to the Chrome Web Store on the result page to leave a review.
### Changed
- **Brand Redesign:** Updated the extension's primary color theme from blue to a vibrant hot pink (`#F55594`).
- **UI Synchronization:** Streamlined the UI theme across popups and result pages for a unified visual aesthetic.
- **Zoom Optimization:** Improved the zoom functionality on the result page to permanently scale the base image size down by 14%, ensuring it fits comfortably without stretching, capped at 100%, and removed the buggy auto-fit behavior.
- **UI Icons:** Upgraded all buttons and UI elements with modern Myna UI icons.
- **Popup State Handling:** Improved reliability on restricted pages (e.g., `chrome://`) by immediately checking the active tab when the popup opens.
- **Animations:** Removed hover wobbles from toolbar buttons for a cleaner interaction.

## [1.1.3] - Support and UI Update
### Changed
- **Support Button:** Replaced the GitHub Sponsors button on the result page with the official "Buy Me a Coffee" interactive button graphic for better visibility and a more native look.
- **Support Configuration:** Added "Buy Me a Coffee" to the project's funding configuration to display natively on the repository sponsor page.

## [1.1.2] - Policy Compliance & Bug Fixes
### Fixed
- **Remote Hosted Code:** Removed external CDN dependencies (cdnjs) and bundled `pdfobject.min.js` locally to comply with Chrome Web Store Manifest V3 security policies.
- **Privacy Policy:** Created a dedicated, standalone Privacy Policy page to meet Web Store privacy guidelines.

## [1.1.1] - Bug Fix
### Fixed
- **Fixed/Sticky Element Hiding:** Replaced inline `opacity: 0` with a `!important` stylesheet injection using a unique class name. This prevents site CSS (e.g. Google Search) from overriding the hide and causing fixed headers to repeat in every stitched frame.
- **Inner-Scroll Sidebar Repetition:** For SPA layouts (e.g. ChatGPT), the extension now walks up the DOM from the scrollable container to find the first `flex`/`grid` ancestor and hides all its siblings. This eliminates sidebars and nav rails that are not `position: fixed` but still appear in every captured frame.

## [1.1.0] - UI Update
### Changed
- **Result Page:** Removed box shadows from result cards; replaced with a flat border for a cleaner look.
- **Result Page:** Added a "Support on GitHub" donation button linking to the GitHub Sponsors page.
- **Loading Indicator:** Repositioned from bottom-right to top-center and restyled to match the error popup design (white card with spinner in an icon circle).
### Fixed
- **Error Popup:** Error popup now shows correctly on the very first click on restricted pages (`chrome://`, `chrome-extension://`, Web Store) by scanning all open tabs on extension startup and adding a URL check directly in the click handler.
- **Restricted Pages:** Extended the restricted URL check to include `chrome-extension://` pages.

## [1.0.0] - Initial Release
### Added
- **Full-Page Capture:** Automatically scrolls and captures long webpages.
- **Inner-Scroll Support:** Intelligently detects and perfectly scrolls inner containers on SPAs/dashboards when the main window is locked.
- **Advanced Stitching:** Uses mathematical horizontal slicing to flawlessly stitch full-width screenshots while preserving static sidebars and headers.
- **High-Fidelity Exports:** Downloads perfectly stitched, crisp images in both PNG and PDF (unscaled, 0.98 JPEG quality) formats.
- **Smart Naming:** Automatically names the downloaded files based on the sanitized webpage title.
- **Graceful Error Handling:** Shows a sleek, native extension popup if the user attempts to capture restricted Chrome system pages or the Web Store.
- **Modern UI:** Features a clean, white-themed loading indicator during captures and a clean dark-mode result preview page.
- **Custom Logo:** A sleek, minimalist camera icon.
