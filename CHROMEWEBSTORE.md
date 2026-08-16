# Chrome Web Store Privacy Justifications

Use these texts when filling out the Privacy practices tab on the Chrome Web Store Developer Dashboard.

## Single Purpose
Takes a full-page screenshot of the current website by automatically scrolling from top to bottom and stitching the images together.

## Permission Justifications

| Permission | Justification |
| :--- | :--- |
| `activeTab` | Required to temporarily access the currently active web page when the user explicitly clicks the extension icon, in order to inject the screenshot capture script. |
| `scripting` | Required to inject the scrolling and capturing script (`content.js`) into the active tab after the user initiates a screenshot. |
| `storage` | Required to temporarily save the individual captured image frames and scroll dimensions while the page is being scrolled and captured. |
| `unlimitedStorage` | Required because base64-encoded image frames for very long web pages can easily exceed the default 5MB local storage quota limits. |
| `downloads` | Required to allow the user to save their finalized, stitched screenshot as a PNG or PDF file to their local device. |
| `host_permissions` | The `<all_urls>` host permission is required so the extension can take screenshots on any website the user visits. |
