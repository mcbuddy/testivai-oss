---
"@testivai/witness": minor
"@testivai/witness-playwright": minor
"@testivai/witness-selenium": minor
---

Sharded and parallel runs now work the same way in every language, not just Playwright. `TESTIVAI_SHARD=i/N` and `TESTIVAI_CAPTURE_ONLY=1` are honoured by the Playwright, Selenium, Python, Java and Ruby adapters, so a Selenium or pytest suite joins the same capture → merge → compare-once flow with the same completeness guarantee. Playwright still auto-detects `--shard`, now as a convenience on top of the shared contract rather than a separate mechanism.

Also fixes a real bug in the pytest plugin: `pytest_sessionfinish` fires in every xdist worker, so `pytest -n 8` launched eight concurrent comparisons racing on the same `visual-report/`. Only the controller reports now.
