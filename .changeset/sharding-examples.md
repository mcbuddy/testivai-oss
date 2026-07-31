---
"@testivai/witness": patch
---

Adds a verified per-framework recipe for splitting a suite across CI nodes: Playwright's built-in `--shard`, Jest's `--shard`, pytest-split's `--splits/--group`, and deterministic file/class splitters for Maven Surefire and RSpec, which have no shard flag. Also documents that splitting the tests is the runner's job and TestivAI's `TESTIVAI_SHARD` only needs to agree on the index — plus a one-liner to prove the split covers every file.
