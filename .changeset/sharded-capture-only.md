---
"@testivai/witness": minor
"@testivai/witness-playwright": minor
---

Sharded Playwright runs now work correctly. A shard only executes a slice of the suite, so comparing inside it reported every baseline owned by another shard as missing coverage — measured on a real 8-shard run, every shard exited 3 with roughly 90% of the suite listed as missing, and produced 8 partial reports with no combined view. The reporter now detects a sharded run (`--shard=i/N`) and switches to capture-only: captures are written, comparison and report generation are skipped. The new `testivai merge-captures <dirs...>` command unions the shards' captures so a single `testivai report` compares the whole suite at once — one exit code, one report, and missing-baseline detection that is correct by construction. Opt in or out explicitly with the `captureOnly` reporter option or `TESTIVAI_CAPTURE_ONLY`.
