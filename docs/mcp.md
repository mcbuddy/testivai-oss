---
sidebar_position: 6
title: MCP server
---

# MCP server — visual results for AI agents

`@testivai/mcp` exposes a run's results to any [MCP](https://modelcontextprotocol.io)
client: structured verdicts, the actual diff images, and `explain_snapshot`,
which hands a model the layered evidence for one snapshot so it can explain *why*
something changed.

**The model is yours.** TestivAI ships the evidence, not the inference — there's
no hosted AI, no API key, and no per-screenshot pricing. Whatever model you
already pay for does the reasoning, and the quality scales with it.

## Setup

**Claude Code**

```bash
claude mcp add testivai -- npx -y @testivai/mcp
```

**Any other MCP client** — Cursor, Copilot, Zed, or your own — point it at the
same command:

```jsonc
{
  "mcpServers": {
    "testivai": { "command": "npx", "args": ["-y", "@testivai/mcp"] }
  }
}
```

The server reads the project from its working directory (`--root <path>` to
override) and honours `reportDir` from `.testivai/config.json`. It runs locally
and makes no network calls.

## Tools

| Tool | Returns |
|---|---|
| `get_visual_results` | Every snapshot with a one-line verdict phrased for decisions |
| `explain_snapshot` | Layered evidence for one snapshot — pixel regions, element attribution, DOM/style signal, interpretation guidance |
| `get_report` | The raw `results.json` payload |
| `get_diff` (alias `get_snapshot_diff`) | Baseline, current and diff PNGs, downscaled for model context |
| `list_baselines` | Committed baselines under `.testivai/baselines/` |
| `approve_snapshot` / `approve_all` | Promote reviewed snapshots to baselines — **only after a human says so** |

There's also a prompt, **`review-visual-changes`**, that walks a client through a
full review: summary → `explain_snapshot` per change → diff images when
ambiguous → a per-snapshot recommendation.

## What `explain_snapshot` actually returns

Real output, not a mock. The scenario: a designer changes one CSS custom
property — `--brand` from `#0e7490` to `#1f6feb` — in the
[example project](https://github.com/mcbuddy/testivai-example). No markup
changes at all.

The one-line verdict:

```text
changed (1.13% pixels differ) — style-only change: 6 elements restyled with
identical DOM (body > header, body > main > section:nth-of-type(2) > div.row >
button.btn:nth-of-type(1), …); a real change, not noise — confirm it is
intended before approving
```

The evidence behind it:

```jsonc
{
  "name": "home",
  "status": "changed",
  "layers": {
    "pixel": {
      "diffPercent": 1.13,
      "regionCount": 5,
      "regions": [
        {
          "x": 0, "y": 0, "width": 98, "height": 165,
          "diffPixels": 8109, "diffPercent": 50.15,
          "classification": "change",
          "elements": [
            { "selector": "body > header > p", "role": "changed" },
            { "selector": "body > header",     "role": "changed" }
          ]
        },
        {
          "x": 234, "y": 438, "width": 116, "height": 38,
          "diffPixels": 3839, "diffPercent": 87.09,
          "classification": "change",
          "elements": [
            { "selector": "body > main > section:nth-of-type(2) > div.row > button.btn:nth-of-type(1)",
              "role": "changed" }
          ]
        }
        // … 3 more regions
      ]
    },
    "dom": {
      "changed": false,
      "noiseHint": false,
      "styleCheck": "mismatch",
      "styleChanges": {
        "count": 6,
        "elements": [
          "body > header",
          "body > main > section:nth-of-type(2) > div.row > button.btn:nth-of-type(1)",
          "body > main > section:nth-of-type(3) > div.cards > div.card:nth-of-type(1) > div.body:nth-of-type(2) > div.price"
        ]
      }
    }
  },
  "guidance": [
    "Computed styles changed on 6 element(s) … while the DOM stayed identical — a stylesheet-only change. This is REAL, not noise.",
    "Baseline approval is a human decision: propose, do not auto-approve."
  ]
}
```

Read what that gives a model that a pixel percentage doesn't. `1.13% of pixels
differ` is unactionable. This says: nothing structural changed, six specific
elements were restyled, and the affected selectors are the header, the primary
buttons, and the price labels on every card — which is exactly the blast radius
of a brand-colour token. A model can now tell you *"you changed the brand token;
it hit the header, the primary buttons and the card prices — intended?"* rather
than *"something moved."*

## The approval rule

`approve_snapshot` and `approve_all` exist so that a human can say "approve it"
in conversation and have the agent carry it out. They are **not** for an agent
deciding on its own.

Approving a baseline rewrites the definition of "correct," so an agent that
approves its own work can launder a regression into the new baseline. The
guardrails are in the wording the model actually reads: both tool descriptions
say to invoke them only after a reviewer has confirmed, the
`review-visual-changes` prompt repeats it, and every `get_visual_results`
response ends with the same instruction.

Human-shaped approval paths stay available either way: `npx testivai approve`
locally, or a `/testivai approve` comment on the pull request, which verifies the
commenter has write access.

## Instructions file (works with any agent)

If your agent isn't MCP-capable, paste into `AGENTS.md` / `CLAUDE.md` /
`.cursorrules`:

```markdown
## Visual verification
After changing UI code, run the visual tests, then read visual-report/results.json:
- status "changed" + dom.changed true → real structural change; compare against intent
- status "changed" + dom.styleCheck "mismatch" → style-only change; real, not noise
- status "changed" + dom.noiseHint true → likely render noise; mention, don't block
- status "new" → no baseline yet; tell the human
Never run `testivai approve` yourself — approval is a human decision.
```

→ [Agent guide](./guides/ai-agents.md) · [Philosophy](./philosophy.md)
