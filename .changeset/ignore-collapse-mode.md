---
"@testivai/witness-playwright": minor
---

`ignoreSelectors` now supports per-selector modes. Entries may be a bare CSS
string (default **mask** — `visibility:hidden`, layout preserved) or an object
`{ selector, mode }` where `mode: "collapse"` uses `display:none` to remove the
element's layout influence entirely. Collapse fixes the flake class where a
variable-height ignored region (e.g. a dynamic footer) shifts everything below
it. The `string[]` shape stays fully valid; both shapes can be mixed and are
honored from `.testivai/config.json`, `testivai.config.ts`, and per-`snapshot()`
overrides.
