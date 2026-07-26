---
sidebar_position: 5
title: testivai report
---

# `testivai report`

Compare `.testivai/temp/<name>/` captures against baselines, write the HTML report and `visual-report/results.json`.

This is the language-agnostic half of the adapter contract: any binding (Python, Java, .NET, …) captures screenshots into `.testivai/temp/<name>/` using its native APIs, then shells out to this command for diffing, tolerances, the report, and CI exit codes.

## Usage

```bash
npx testivai report [options]
```

## Options

| Flag | Description |
|---|---|
| `--fail-on-diff` | Enable the exit-code gate — exit non-zero on changes or new snapshots (overrides config `failOnDiff`) |
| `--allow-new` | Treat new snapshots as passing (exit 0). Use with `--fail-on-diff` so first runs don't fail |
| `--json` | Print the `results.json` payload to stdout instead of the pretty summary |
| `--open` | Open the HTML report in a browser (overrides config `autoOpen`) |

## Exit Codes

Exit codes are a public contract, enforced **only** when the gate is on (`--fail-on-diff` or config `failOnDiff`). Without the gate the command always exits 0 (report-only).

| Code | Meaning |
|---|---|
| `0` | Pass — nothing changed; no new snapshots, or `--allow-new` was set |
| `1` | Changed — at least one snapshot differs from its baseline |
| `2` | New-only — new snapshots exist with no changes. Distinct from 1 so first runs and newly added tests aren't mistaken for regressions |

## `--json` Output

With `--json`, the CLI banner is suppressed and a single JSON document is written to stdout — the full `results.json` schema (summary + per-snapshot results). Agents and CI can parse stdout directly:

```bash
npx testivai report --json | jq '.summary'
```

On error, a `{ "error": "…" }` object is emitted instead.

## CI Example

```bash
npx testivai report --fail-on-diff
```

Combine with `--allow-new` on the first push to avoid exit-code-2 failures while baselines are being seeded.
