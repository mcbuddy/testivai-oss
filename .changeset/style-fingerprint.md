---
"@testivai/witness": minor
---

Computed-style fingerprint — closes the documented noise-hint false negative. A stylesheet-only change (identical DOM, different pixels) used to read as "likely render noise"; the hint now also requires the computed-style digests (captured in the element map) to match. A digest mismatch becomes an explicit, attributed signal — "Styles changed: 1 element restyled with identical DOM: `button.cta`" — surfaced in the report and results.json (`dom.styleCheck`, `dom.styleChanges`), and `noiseAutoPass` can never auto-pass it. Captures without element maps keep the legacy DOM-only hint, visibly labeled `styleCheck: "unavailable"`.
