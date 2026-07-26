---
"@testivai/witness": minor
---

Field-feedback fixes for noise-hint robustness and cross-platform teams:

- **`volatileAttributes` config**: attribute names whose *values* the DOM diff ignores (presence still counts) — stops per-run `src`/`srcset` URL churn from poisoning the render-noise hint with `attributeChanges: 1`. Independent of the list, `blob:` object URLs are now always normalized (they are per-session by construction); `data:` URIs stay significant.
- **`baselinesDir` config is now honored** (it existed but was silently ignored) with a `{platform}` token for per-OS baselines: `".testivai/baselines-{platform}"` gives mac devs and linux CI their own committed baseline sets instead of permanent cross-OS font-rasterization noise. Element-map attribution and the MCP server resolve the same directory.
- **Silently-green guard**: `testivai report` now prints a loud warning when snapshots changed but no diff gate is configured (`--fail-on-diff` / `failOnDiff`), so a report-only pipeline can't quietly pass with visual changes. (Note: the diff gate has been opt-in since the command was introduced — this release makes the tradeoff visible, and new docs cover both gates.)
