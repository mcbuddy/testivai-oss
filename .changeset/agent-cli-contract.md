---
"@testivai/witness": minor
---

Agent-grade `testivai report` CLI contract:
- `--json` prints the `results.json` payload (the public schema, incl. per-snapshot region→selector attribution) to stdout instead of the pretty summary — so agents/CI parse one stable contract, no ANSI scraping.
- Documented exit codes, enforced when gated (`--fail-on-diff` or config `failOnDiff`): **0** pass · **1** changed · **2** new-only. New snapshots get their own code instead of conflating with regressions.
- `--allow-new` treats new snapshots as passing (exit 0) for first runs before baselines exist.

`--json` also added to `approve` (`{ approved, failed }`) and `init` (Playwright scaffold `{ framework, mode, created }`).
