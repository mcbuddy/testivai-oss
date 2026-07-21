---
"@testivai/witness-playwright": patch
---

Element maps now honor the ignoreSelectors consistency rule: elements covered by `ignoreSelectors` (and their subtrees) are excluded from the captured element map, and `visibility: hidden` elements are skipped (invisible pixels cannot explain a diff; their children still walk since visibility is overridable). Without this, an ignored dynamic element's randomized styles could trip the style fingerprint into suppressing a legitimate noise hint — found by dogfooding in the demo app on day one.
