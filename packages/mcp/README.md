# @testivai/mcp

MCP (Model Context Protocol) server that gives AI coding agents eyes on your
visual regression results. The agent changes UI code, runs your test suite,
then uses these tools to find out **what actually changed on screen** — and
whether it's real or just render noise.

## Tools

| Tool | What it does |
|---|---|
| `get_visual_results` | Reads `visual-report/results.json`, returns a per-snapshot verdict: passed / likely render noise (DOM identical) / real structural change (with DOM summary) |
| `get_snapshot_diff` | Returns the baseline, current, and diff **images** for one snapshot, so the agent can see the change |
| `list_baselines` | Lists the committed baselines under `.testivai/baselines/` |

By design there is **no approve tool**: promoting a baseline is a human
decision. The verdicts tell the agent to suggest `/testivai approve <name>`
on the PR instead.

## Setup

### Claude Code

```bash
claude mcp add testivai -- npx -y @testivai/mcp
```

### Cursor / other MCP clients

```jsonc
// .cursor/mcp.json (or your client's equivalent)
{
  "mcpServers": {
    "testivai": { "command": "npx", "args": ["-y", "@testivai/mcp"] }
  }
}
```

The server reads the project from its working directory (pass `--root <path>`
to override) and respects `reportDir` from `.testivai/config.json`.

## Typical agent flow

1. Agent edits UI code.
2. Agent runs `npx playwright test` (the TestivAI reporter captures + diffs).
3. Agent calls `get_visual_results` → sees `homepage: changed (4.2%) and the
   DOM changed (2 added, 1 removed)`.
4. Agent calls `get_snapshot_diff homepage` → looks at the images, confirms
   the change matches the task (or fixes its own regression).
5. Agent reports to the human: what changed, whether it looks intended, and
   which snapshots need `/testivai approve`.

Local mode only — no account, no API key, nothing leaves the machine.

Full integration guide (instructions-file level, MCP level, zero-test-suite apps, real transcript): [docs/guides/ai-agents.md](https://github.com/testivai/testivai-oss/blob/main/docs/guides/ai-agents.md)
