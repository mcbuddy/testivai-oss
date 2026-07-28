---
"@testivai/witness": minor
---

Ruby suites get a native adapter. The new `testivai` gem captures screenshots, DOM snapshots, and element maps directly through Capybara or Selenium — no sidecar, no Chrome debug port, and no wrapper around your test command, so `bundle exec rspec` runs unchanged. `testivai init`'s RSpec and Cucumber templates now use the gem instead of the sidecar binding.
