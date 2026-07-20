---
"@testivai/witness": minor
"@testivai/witness-playwright": minor
---

Element attribution + shift classification. The Playwright adapter captures an element map (`elements.json`: deterministic CSS path, rect, computed-style digest per visible element) alongside every local-mode screenshot. The comparison engine intersects diff regions with the map to name WHICH element changed, and classifies pure translations from layout — same element, same size, same style digest, new position → "shifted +8px vertically — content unchanged", with exact (dx, dy). A whole-page pass reports "everything below y=N shifted" (the injected-banner signature) as `pageShift`. All additive in results.json (regions[].elements/classification/shift, snapshot pageShift); image-only inputs and older captures degrade gracefully to plain regions. `approve` carries the element map to the baseline.
