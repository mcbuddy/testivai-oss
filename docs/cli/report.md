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
| `--fail-on-missing` | Force the missing-baselines gate on, overriding config `failOnMissing: false` |
| `--allow-missing` | Skip the missing-baselines gate for this run — use with filtered runs (`--grep`) where skipped baselines are expected |
| `--share` | Also write `share.html` — a single self-contained file with every image inlined as a data URI, ready to drop into Slack, an issue, or an email |
| `--open` | Open the HTML report in a browser (overrides config `autoOpen`) |

## Exit Codes

Exit codes are a public contract, enforced **only** when the gate is on (`--fail-on-diff` or config `failOnDiff`). Without the gate the command always exits 0 (report-only).

| Code | Meaning |
|---|---|
| `0` | Pass — nothing changed; no new snapshots, or `--allow-new` was set |
| `1` | Changed — at least one snapshot differs from its baseline |
| `2` | New-only — new snapshots exist with no changes. Distinct from 1 so first runs and newly added tests aren't mistaken for regressions |
| `3` | Missing-only — baselines exist that received no capture this run (a deleted/renamed test silently stopped guarding its page). **On by default** (`failOnMissing` defaults to `true`); disable via config `failOnMissing: false` or per-run `--allow-missing`. Precedence: changed (1) > missing (3) > new (2) |

## `--json` Output

With `--json`, the CLI banner is suppressed and a single JSON document is written to stdout — the full `results.json` schema (summary + per-snapshot results). Agents and CI can parse stdout directly:

```bash
npx testivai report --json | jq '.summary'
```

On error, a `{ "error": "…" }` object is emitted instead.

## Sharing the report

`--share` writes `share.html` next to the report — one self-contained file with every image inlined. To push it to any storage you already use, set a **storage-agnostic upload hook** in `.testivai/config.json`:

```json
{
  "shareUploadCommand": "aws s3 cp {file} s3://my-bucket/reports/$(date +%s).html && echo https://my-bucket.s3.amazonaws.com/reports/latest.html"
}
```

`{file}` is replaced with the share file's path; the command's **last stdout line** is printed as the shared URL. Works with `aws s3 cp`, `gsutil cp`, `rclone`, `curl` — anything on your PATH. TestivAI ships no cloud SDKs; local file is the default when the hook is unset.

## CI Example

```bash
npx testivai report --fail-on-diff
```

Combine with `--allow-new` on the first push to avoid exit-code-2 failures while baselines are being seeded.
