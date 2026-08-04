---
"@testivai/witness": minor
---

Validate `.testivai/config.json` on load. Unknown keys now warn with a did-you-mean suggestion (`"thresold" — did you mean "threshold"?`), mistyped values (e.g. `"threshold": "0.1"`) warn and fall back to the documented default instead of flowing into comparisons, a leftover `mode` key gets a targeted retirement notice, and a file that isn't valid JSON says so instead of being silently ignored. Warnings only — a config nit never fails a run, and unknown keys are kept for forward compatibility.
