---
"@testivai/witness-playwright": minor
---

Local-first is now the zero-config default. With no `TESTIVAI_API_KEY`, the Playwright reporter runs in **local mode** — capturing to `.testivai/temp/<name>/` and writing the HTML report — instead of disabling itself. The scary `API Key is not configured. Disabling reporter.` error is gone, replaced by a single quiet info line; cloud mode activates only when a key is present.

Mode is now resolved from a shared rule (`TESTIVAI_MODE` env → `.testivai/config.json` → API-key presence) used by both the reporter and `snapshot()`, fixing a mismatch where worker processes never saw the reporter's runtime mode.

Local mode also writes a **single canonical layout** — the flat `<timestamp>_<name>.{png,json}` duplicates are no longer emitted alongside `.testivai/temp/<name>/`.

Restored the named `snapshot` export (`import { snapshot } from '@testivai/witness-playwright'`) as documented, kept as an alias of `testivai.witness`.
