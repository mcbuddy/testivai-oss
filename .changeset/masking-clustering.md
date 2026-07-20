---
"@testivai/witness": minor
"@testivai/witness-playwright": minor
---

Masking DSL + diff clustering. Config/per-call `mask` accepts CSS selectors (geometry captured at capture time) or geometric regions (px, 0–1 ratios, "NN%", single-edge shorthands like `{ top: 24 }`); masked areas are excluded from the pixel diff AND hatched in the diff image with a full audit trail in the report — never silent. Changed pixels are clustered into regions (`results.json` 2.2.0, additive: `regions[]`, `masks[]`, `maskWarnings[]`) with `diffRegions.minSize` / `mergeDistance` tunables; the report shows clickable region chips. Also fixes results.json's schema version field, which previously carried the package version.
