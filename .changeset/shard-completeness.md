---
"@testivai/witness": minor
"@testivai/witness-playwright": minor
---

Sharded runs now prove every shard reported before comparing. Each shard writes a `testivai-shard.json` manifest alongside its captures at end of run, and `merge-captures` refuses to proceed when one is unaccounted for — naming the missing shard indices. A shard that crashes or is cancelled leaves no manifest, which previously meant the merge compared partial coverage and passed silently whenever `failOnMissing` was off. The shard total is read from the manifests, with `--expect <n>` to assert it explicitly and `--allow-incomplete` to proceed anyway.
