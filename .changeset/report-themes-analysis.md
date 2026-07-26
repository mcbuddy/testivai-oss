---
"@testivai/witness": minor
---

Report UI overhaul:
- **Light theme by default** with a persisted dark-mode toggle (CSS custom properties; preference stored in `localStorage`).
- New per-snapshot **"Layered analysis"** panel with a plain-language verdict headline — "Style-only change (real, not noise)", "Layout shift — look above y=N for inserted content", "Structural change (n added)", "Likely render noise" — synthesized from the DOM/style signal, attributed regions, and page-shift detection. This is the human-facing view of the same evidence `@testivai/mcp`'s `explain_snapshot` serves to AI agents (noted in the panel header).
- General polish: summary card grid, softer cards/shadows, section dot-titles, themed region chips and mask hatching.
