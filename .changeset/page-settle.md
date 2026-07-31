---
"@testivai/witness": minor
"@testivai/witness-playwright": minor
"@testivai/witness-selenium": minor
---

Captures now wait for the page to stop changing, in every language. On top of the existing animation/caret/font stabilization, `stabilize` waits for `document.readyState === 'complete'`, for every image to finish, and for 150ms without DOM mutations — bounded at 5 seconds, so a page that never settles is captured rather than hanging the suite. The probe is generated from one TypeScript source and shipped to the Python, Java and Ruby adapters, so all five poll the identical predicate. Deliberately not network idle, which Playwright's own docs mark DISCOURAGED for testing and which is the wrong signal for a screenshot.
