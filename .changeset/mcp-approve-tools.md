---
"@testivai/mcp": minor
---

The MCP server can now drive the full agent loop without scraping ANSI output:
- `approve_snapshot(name)` and `approve_all` promote captures in `.testivai/temp/` to committed baselines, reusing the same `BaselineStore` as the CLI (identical semantics + undo).
- `get_report` returns the raw `results.json` payload (summary + per-snapshot status, diff %, DOM signal, region→selector attribution) for structured parsing.
- `get_diff` is added as the canonical name for the diff-image tool; `get_snapshot_diff` remains as an alias.

Approval tools are gated by intent in their descriptions: only approve changes a reviewer has confirmed are intended.
