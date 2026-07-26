# @testivai/mcp

## 0.5.0

### Minor Changes

- e37eb33: New `explain_snapshot(name)` tool: a layered evidence bundle for one snapshot — pixel regions with bounding boxes, element attribution (which selectors shifted vs changed, whole-page shift detection), the DOM/style signal, and interpretation guidance. Paired with a new `review-visual-changes` prompt that walks any MCP client through a full review (summary → explanations → diff images → per-snapshot recommendation). The client's own model writes the narrative; the server ships evidence, not an LLM.

### Patch Changes

- Updated dependencies [fa0deb5]
- Updated dependencies [e37eb33]
  - @testivai/witness@1.7.1

## 0.4.0

### Minor Changes

- 5bfdca5: The MCP server can now drive the full agent loop without scraping ANSI output:

  - `approve_snapshot(name)` and `approve_all` promote captures in `.testivai/temp/` to committed baselines, reusing the same `BaselineStore` as the CLI (identical semantics + undo).
  - `get_report` returns the raw `results.json` payload (summary + per-snapshot status, diff %, DOM signal, region→selector attribution) for structured parsing.
  - `get_diff` is added as the canonical name for the diff-image tool; `get_snapshot_diff` remains as an alias.

  Approval tools are gated by intent in their descriptions: only approve changes a reviewer has confirmed are intended.

### Patch Changes

- Updated dependencies [5bfdca5]
- Updated dependencies [9db57c2]
  - @testivai/witness@1.7.0

## 0.3.0

### Minor Changes

- 767385e: The `get_snapshot_diff` tool now downscales returned diff images to a max 1024px longest edge (integer-stride nearest-neighbour, via `pngjs`). When an image was downscaled the text label includes the original dimensions (e.g. "baseline (downscaled from 1280x7669):"). Images that already fit within 1024px are returned unchanged.

### Patch Changes

- 9bbbd58: Add official MCP Registry metadata: `mcpName` (`ai.testiv/mcp`, DNS-verified namespace) in package.json and a `server.json` descriptor, so the server can be listed on registry.modelcontextprotocol.io.

## 0.2.0

### Minor Changes

- fed09cf: New package: MCP (Model Context Protocol) server exposing TestivAI visual regression results to AI coding agents. Read-only v1 with three tools: `get_visual_results` (per-snapshot verdicts combining pixel diff + DOM signal), `get_snapshot_diff` (returns baseline/current/diff images so the agent can see the change), and `list_baselines`. No approve tool by design — baseline promotion stays a human decision.
