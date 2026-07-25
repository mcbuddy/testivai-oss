---
"@testivai/witness": minor
---

`testivai init` now detects Playwright projects **first** and scaffolds the local reporter flow — `.testivai/config.json` (`mode: "local"`), the baselines directory, `.gitignore` entries, and the reporter snippet to add to `playwright.config.ts` — instead of emitting the CDP `browserPort` sidecar config. It is idempotent (existing config left untouched without `--force`) and exits 0 cleanly on success.
