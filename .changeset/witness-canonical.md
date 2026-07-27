---
"@testivai/witness-playwright": minor
---

`witness()` is now the canonical capture call — aligning the Playwright adapter with the package family (`@testivai/witness*`) and the other adapters: `import { witness } from '@testivai/witness-playwright'`. `snapshot` and `testivai.witness` remain as fully compatible aliases; nothing breaks.
