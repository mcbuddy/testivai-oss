---
'@testivai/witness': patch
---

The computed-style check no longer reports a verdict it has no evidence for. A
`styleHash` is optional in the element map — `parseElementMap` defaults it to
`''`, because the Extension API asks adapters for a path and a box, not styles —
so a map can legitimately arrive with no digests at all. Those empty strings were
being compared like real values, in both directions: two digest-free maps matched
each other, and the report rendered that as "computed styles are identical" for a
check that never ran; a digest-free baseline against a digest-carrying capture
differed on every shared path, naming every element as restyled.

Pairs are now only compared when both sides carry a non-empty digest, and a run
with no comparable pair reports `styleCheck: "unavailable"` instead of `"match"`
or `"mismatch"`. `unavailable` is an existing value of the documented enum and
already has its own report rendering, so nothing new appears in `results.json`.

No first-party adapter is affected: every adapter that emits an element map
(Playwright, Selenium, Python, Java, Ruby) emits digests from the same shared
collector, and WebdriverIO emits no map at all and was already `unavailable`.
This matters for community adapters built against the Extension API, and for any
bounds-only source where there are no computed styles to digest.
