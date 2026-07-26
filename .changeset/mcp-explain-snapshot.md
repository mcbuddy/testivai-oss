---
"@testivai/mcp": minor
---

New `explain_snapshot(name)` tool: a layered evidence bundle for one snapshot — pixel regions with bounding boxes, element attribution (which selectors shifted vs changed, whole-page shift detection), the DOM/style signal, and interpretation guidance. Paired with a new `review-visual-changes` prompt that walks any MCP client through a full review (summary → explanations → diff images → per-snapshot recommendation). The client's own model writes the narrative; the server ships evidence, not an LLM.
