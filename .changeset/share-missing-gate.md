---
"@testivai/witness": minor
---

Team-workflow hardening for the report and CI gate:

- **`testivai report --share`** writes `share.html` — a single self-contained file with every image inlined as a data URI. Drop the whole report into Slack, an issue, or an email; nothing else to attach.
- **Missing-baseline coverage gate**: results.json (schema **2.3.0**, additive) now reports `missingBaselines[]` + `summary.missing` — baselines that received no capture this run (the way a deleted/renamed test silently stops guarding its page). Opt-in `--fail-on-missing` / config `failOnMissing` exits **3** (precedence: changed 1 > missing 3 > new 2); off by default so filtered runs stay green. The HTML report shows a coverage-loss notice.

The GitHub Action's PR comment now carries the layered-analysis verdicts — "Style-only change — real, not noise (`button.cta`)", "Layout shift — look above y=N", and the missing-baselines coverage warning — and its footer points agents at `@testivai/mcp` instead of the retired hosted service.
