# @testivai/mcp

## 0.3.0

### Minor Changes

- 767385e: The `get_snapshot_diff` tool now downscales returned diff images to a max 1024px longest edge (integer-stride nearest-neighbour, via `pngjs`). When an image was downscaled the text label includes the original dimensions (e.g. "baseline (downscaled from 1280x7669):"). Images that already fit within 1024px are returned unchanged.

### Patch Changes

- 9bbbd58: Add official MCP Registry metadata: `mcpName` (`ai.testiv/mcp`, DNS-verified namespace) in package.json and a `server.json` descriptor, so the server can be listed on registry.modelcontextprotocol.io.

## 0.2.0

### Minor Changes

- fed09cf: New package: MCP (Model Context Protocol) server exposing TestivAI visual regression results to AI coding agents. Read-only v1 with three tools: `get_visual_results` (per-snapshot verdicts combining pixel diff + DOM signal), `get_snapshot_diff` (returns baseline/current/diff images so the agent can see the change), and `list_baselines`. No approve tool by design — baseline promotion stays a human decision.
