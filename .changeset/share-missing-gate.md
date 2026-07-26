---
"@testivai/witness": minor
---

Team-workflow hardening for the report and CI gate:

- **Missing-baseline coverage gate is ON by default**: results.json (schema **2.3.0**, additive) reports `missingBaselines[]` + `summary.missing` — baselines that received no capture this run (the way a deleted/renamed test silently stops guarding its page). `testivai report` exits **3** when any are found (precedence: changed 1 > missing 3 > new 2). Disable via config `failOnMissing: false`, or per-run with `--allow-missing` for filtered runs (`--grep`). The HTML report shows a coverage-loss notice.
- **`testivai report --share`** writes `share.html` — one self-contained file with every image inlined as a data URI. Optional **storage-agnostic upload hook**: config `shareUploadCommand` runs any shell command (`aws s3 cp`, `gsutil`, `rclone`, `curl` — `{file}` placeholder), and its last stdout line is printed as the shared URL. No cloud SDKs shipped; local file is the default.
- **Baseline provenance**: each result now carries `baselineApprovedAt` (from the baseline's metadata, stamped on approve/add) and the report shows "baseline approved YYYY-MM-DD" — a months-old baseline deserves a closer look than yesterday's. Only the last approved baseline is kept (plus the `.previous/` undo slot), so the flow is unchanged.

The GitHub Action's PR comment carries the layered-analysis verdicts — "Style-only change — real, not noise (`button.cta`)", "Layout shift — look above y=N", and the missing-baselines coverage warning — and its footer points agents at `@testivai/mcp` instead of the retired hosted service.
