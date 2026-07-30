---
"@testivai/witness-playwright": patch
---

The Playwright reporter no longer implies a passing check when it isn't one. A reporter cannot set the process exit code, so a run could print `Changed: 3` and still exit `0` — reading like a visual check that passed. When snapshots changed, are new, or have missing baselines, the summary now states plainly that the build was not failed and names the command that gates it. Missing baselines are also counted in the summary line.
