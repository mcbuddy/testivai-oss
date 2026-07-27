---
"@testivai/witness": minor
---

New `shiftTolerance` pass criterion — the layout-tolerance layer, reimplemented local-first. When every diff region is a **pure element shift** (content unchanged, element just moved) of at most N pixels per axis, the snapshot auto-passes as `autoPassed: "shift"` (auditable in the report and results.json). Kills sub-pixel/rounding layout jitter without masking real changes: content-changed regions, unattributed regions, or shifts beyond the bound keep the snapshot `changed`. Config: `"shiftTolerance": 2` in `.testivai/config.json`. Off by default.
