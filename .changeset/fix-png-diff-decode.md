---
"@testivai/witness": patch
---

fix: properly decode PNG files before pixel diff

The diff image in the visual report was rendering as a broken image
because the compare engine was treating compressed PNG buffers as raw
RGBA pixel data. Added `pngjs` to decode PNG → RGBA before diffing
and encode the diff output back to a valid PNG file. Diff percentages
and diff heatmap images in the HTML report now display correctly.
