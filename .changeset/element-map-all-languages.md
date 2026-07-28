---
"@testivai/witness": patch
---

The element-map collector is now generated into a JavaScript asset for the Python wheel and the Java jar (`scripts/generate-element-map-asset.js`), so all four adapters inject the identical function. CI regenerates the asset and fails if the checked-in copies are stale — adapters that share one baseline directory can no longer drift into producing different maps for the same page.
