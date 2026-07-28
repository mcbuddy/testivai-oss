---
"@testivai/mcp": patch
"@testivai/witness": patch
---

Fixes the agent-facing verdict for style-only changes. When the DOM was identical but computed styles differed, `explain_snapshot` and `get_visual_results` reported "no DOM data; treat as needing human review" — contradicting the HTML report, which correctly calls it a style-only change, and hiding the signal agents most need. Verdicts now say "style-only change: N elements restyled with identical DOM" with the affected selectors, and a captured-but-unremarkable DOM no longer claims to be missing. Adds a dedicated MCP documentation page.
