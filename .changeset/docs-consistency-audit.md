---
"@testivai/witness": patch
"@testivai/witness-playwright": patch
"@testivai/witness-webdriverio": patch
"@testivai/common": patch
---

Docs and CLI output now match what the tool actually does. `testivai init` no longer offers a "Cloud" mode or tells you to run `testivai auth <api-key>`; the second wizard choice is what it always really was — helper-file generation for non-Playwright frameworks. Removed the last `dashboard.testiv.ai` URLs from CLI output and error messages. Corrected the documented exit-code contract (code 3 fires by default), the `results.json` schema version and field list, several nonexistent CLI flags, and the WebdriverIO quickstart, which silently produced no report without `.testivai/config.json`.
