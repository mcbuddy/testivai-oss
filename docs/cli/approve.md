---
sidebar_position: 6
title: testivai approve
---

# `testivai approve`

Promote captures in `.testivai/temp/<name>/` to baselines in
`.testivai/baselines/<name>/`. Approving is a local file copy — review the
report first, approve, then commit the updated baselines.

## Usage

```bash
npx testivai approve [name] [options]
```

With no arguments it lists the snapshots available to approve, each tagged
`[new]` (no baseline yet) or `[changed]`:

```
  Available snapshots to approve:

    [changed] homepage
    [new]     pricing

  To approve:  testivai approve <name>
  To approve all: testivai approve --all
```

## Options

| Flag | Description |
|---|---|
| `--all` | Approve every snapshot present in `.testivai/temp/` |
| `--undo` | Restore the previous baseline. With a `name`, undoes that snapshot; without one, undoes the most recently approved baseline |
| `--dry-run` | Print what would be approved without touching any files |
| `--json` | Print a machine-readable result to stdout instead of the pretty output |

## What Approving Writes

For each approved snapshot:

- The existing baseline (`screenshot.png`, `metadata.json`, `dom.html`,
  `elements.json`) is backed up to `.testivai/baselines/<name>/.previous/` —
  this is what `--undo` restores
- `screenshot.png` is copied from `.testivai/temp/<name>/` to
  `.testivai/baselines/<name>/`, along with `dom.html` and `elements.json` when
  the capture produced them. If the capture had no DOM or element map but the
  old baseline did, the stale file is dropped rather than left mismatched
- `metadata.json` is rewritten with the original `createdAt`, a fresh
  `updatedAt`, and `approvedBy: "local"`

Only the newest approval per snapshot is undoable — the next approve overwrites
`.previous/`.

## `--json` Output

```bash
npx testivai approve --all --json
# {"approved":["homepage","pricing"],"failed":[]}
```

`failed` entries carry `{ "name": "…", "error": "…" }`. Available with `--all`
and with an explicit name; `--undo` and `--dry-run` always print human-readable
output.

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Everything requested was approved (or there was nothing to approve) |
| `1` | At least one snapshot failed to approve — with `--all`, the rest are still approved |

Approving a name with no capture in `.testivai/temp/` is an error: run your
tests first.

## Typical Loop

```bash
npx playwright test              # capture + report
open visual-report/index.html    # review the diffs
npx testivai approve --all       # accept the new look
git add .testivai/baselines/     # commit the baselines
```

Changed your mind after approving?

```bash
npx testivai approve --undo
```
