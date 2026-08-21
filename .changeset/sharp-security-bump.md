---
'@testivai/witness-playwright': patch
---

Bump `sharp` to `^0.35.3` to clear two high-severity libvips advisories.

`sharp@0.34.x` carries GHSA-f88m-g3jw-g9cj (CVE-2026-33327, CVE-2026-33328,
CVE-2026-35590, CVE-2026-35591), which `npm audit` reports as unfixable while
the range is pinned to `^0.34.5` — so a plain
`npm install -D @testivai/witness-playwright` ended with "2 high severity
vulnerabilities" attributed to this package, failing any CI that runs
`npm audit --audit-level=high`. `sharp@0.35.3` audits clean and needs no code
change: the `create` / `composite` / `png` API used for scroll-and-stitch
capture is unchanged.
