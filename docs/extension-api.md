---
sidebar_position: 6
title: Extension API
---

# Extension API

The OSS lane exposes two stable contracts so that **non-JS frameworks (Selenium-Java, RSpec, Robot, pytest) and community-built adapters can produce reports the TestivAI tooling consumes**:

1. The on-disk **baseline + temp layout** under `.testivai/`
2. The **`results.json`** schema written by `generateReport()` and consumed by the GitHub Action

Conform to either, and the rest of the toolchain (CLI approve, HTML report, GitHub Action) works automatically.

This page is the contract. Changes here follow semver — the schema bumps a major version when fields are removed or repurposed.

## On-disk layout

```
<projectRoot>/
└── .testivai/
    ├── config.json             # { "mode": "local", "threshold": 0.1, ... }
    ├── baselines/
    │   └── <name>/
    │       ├── screenshot.png  # required (PNG bytes)
    │       ├── metadata.json   # required ({ name, createdAt, updatedAt, ... })
    │       ├── dom.html        # optional — enables the noise-hint signal
    │       └── .previous/      # snapshot of the baseline before the last approve
    │           ├── screenshot.png
    │           ├── metadata.json
    │           └── dom.html
    └── temp/
        └── <name>/
            ├── screenshot.png  # required
            └── dom.html        # optional
```

### Adapter responsibilities

A new adapter — JS, Python, or otherwise — needs to do **exactly two things**:

1. Capture a full-page screenshot and write it to `.testivai/temp/<name>/screenshot.png`.
2. Optionally capture `document.documentElement.outerHTML` and write it to `.testivai/temp/<name>/dom.html`.

That's the entire contract for capture. After the test run, the user invokes `npx testivai compare` (or the framework adapter triggers it via a lifecycle hook), which:

- Diffs `temp/<name>/` against `baselines/<name>/`
- Writes `visual-report/results.json` and `visual-report/index.html`
- The GitHub Action (or any other tool) reads `results.json`

### `metadata.json` (baseline only)

```jsonc
{
  "name": "homepage",
  "createdAt": "2026-05-08T12:34:56.789Z",
  "updatedAt": "2026-05-08T12:34:56.789Z",
  "approvedBy": "local",     // or a username if produced via a hosted flow
  "width": 1280,             // optional — viewport width at capture
  "height": 800              // optional — viewport height at capture
}
```

`width` and `height` are advisory; the diff engine re-derives dimensions from the PNG buffer.

### `config.json`

```jsonc
{
  "mode": "local",            // "local" or "cloud"
  "threshold": 0.1,           // pixel diff threshold (0–1)
  "reportDir": "visual-report",
  "autoOpen": false,          // open report in a browser after generation
  "failOnDiff": false,        // exit non-zero from `testivai compare` when diffs exist
  "baselinesDir": ".testivai/baselines",  // override baseline storage
  "maxDiffPercent": 0,        // pass diffs at or below this % (autoPassed: "threshold")
  "maxDiffPixels": 100,       // absolute variant; either criterion passing suffices
  "noiseAutoPass": false,     // auto-pass DOM-identical diffs (autoPassed: "noise")
  "noiseMaxDiffPercent": 1,   // upper bound (diff %) for noiseAutoPass
  "stabilize": true,          // freeze animations, hide caret, await fonts pre-capture
  "ignoreSelectors": []       // elements hidden (visibility:hidden) during capture
}
```

Local mode is the default: with no `config.json` (and no `TESTIVAI_API_KEY` in the environment), tools behave as `mode: "local"`. The file exists to customize thresholds and paths, not to enable the behavior.

## `results.json` schema

Written by `generateReport()` to `<reportDir>/results.json`. Consumed by the GitHub Action and any third-party reporter.

```jsonc
{
  "version": "1.1.0",         // @testivai/witness version that wrote this
  "timestamp": "2026-05-08T12:34:56.789Z",
  "summary": {
    "total": 5,
    "passed": 1,
    "changed": 3,
    "newSnapshots": 1
  },
  "snapshots": [
    {
      "name": "homepage",
      "status": "passed",     // "passed" | "changed" | "new"
      "diffPercent": 0,
      "diffCount": 0,
      "totalPixels": 1024000,
      "baselinePath": "images/homepage/baseline.png",
      "currentPath":  "images/homepage/current.png",
      "diffPath":     "images/homepage/diff.png"
    },
    {
      "name": "checkout-page",
      "status": "changed",
      "diffPercent": 0.5,
      "diffCount": 5120,
      "totalPixels": 1024000,
      "baselinePath": "images/checkout-page/baseline.png",
      "currentPath":  "images/checkout-page/current.png",
      "diffPath":     "images/checkout-page/diff.png",
      "dom": {
        "changed": false,
        "summary": null,
        "noiseHint": true
      },
      "autoPassed": "noise"   // present only when a pass criterion applied:
                              // "threshold" (maxDiffPercent/maxDiffPixels) or
                              // "noise" (noiseAutoPass); status is then "passed"
    },
    {
      "name": "nav-redesign",
      "status": "changed",
      "diffPercent": 8.5,
      "diffCount": 87040,
      "totalPixels": 1024000,
      "baselinePath": "images/nav-redesign/baseline.png",
      "currentPath":  "images/nav-redesign/current.png",
      "diffPath":     "images/nav-redesign/diff.png",
      "dom": {
        "changed": true,
        "summary": {
          "added": 2,
          "removed": 0,
          "attributeChanges": 1
        },
        "noiseHint": false
      }
    },
    {
      "name": "fresh-baseline",
      "status": "new",
      "diffPercent": 0,
      "diffCount": 0,
      "totalPixels": 0,
      "currentPath": "images/fresh-baseline/current.png"
    }
  ]
}
```

### Field guarantees

| Field | Type | Required | Notes |
|---|---|---|---|
| `version` | string | yes | semver of `@testivai/witness` that produced the report |
| `timestamp` | ISO 8601 string | yes | when the report was generated |
| `summary.total` | number | yes | == `snapshots.length` |
| `summary.passed` / `.changed` / `.newSnapshots` | number | yes | partition of `total` |
| `snapshots[].name` | string | yes | unique within a report |
| `snapshots[].status` | enum | yes | `passed` &#124; `changed` &#124; `new` |
| `snapshots[].diffPercent` | number | yes | 0–100. 0 for `passed` and `new`. |
| `snapshots[].diffCount` | number | yes | absolute count of differing pixels |
| `snapshots[].totalPixels` | number | yes | total pixels compared (0 for `new`) |
| `snapshots[].baselinePath` | string | optional | relative path under `<reportDir>/`; absent for `new` |
| `snapshots[].currentPath` | string | optional | relative path under `<reportDir>/` |
| `snapshots[].diffPath` | string | optional | only present for `changed` |
| `snapshots[].dom` | object | optional | only present when DOM was captured on both sides for a `changed` snapshot |
| `snapshots[].dom.changed` | boolean | yes within `dom` | true if structural DOM diff detected |
| `snapshots[].dom.summary` | object &#124; null | yes within `dom` | null when `changed` is false |
| `snapshots[].dom.summary.added` / `.removed` / `.attributeChanges` | number | yes within `summary` | structural change counts |
| `snapshots[].dom.noiseHint` | boolean | yes within `dom` | true when pixel diff exists but DOM unchanged |

### Schema versioning

- Adding a new optional field is a **minor** bump (consumers should ignore unknown fields).
- Removing a field, changing a type, or changing a status value is a **major** bump.
- The `version` field always reflects the writer's `@testivai/witness` version, not the schema version. Consumers that need cross-version compatibility should branch on the writer's major.

## Worked example: a hypothetical pytest adapter

Pseudocode for a pytest plugin that produces TestivAI-compatible captures:

```python
import os
from pathlib import Path

def witness(driver, name: str, *, project_root: Path = Path.cwd()):
    """Capture a screenshot + DOM into .testivai/temp/<name>/."""
    temp_dir = project_root / ".testivai" / "temp" / name
    temp_dir.mkdir(parents=True, exist_ok=True)

    # 1. Screenshot
    driver.save_screenshot(str(temp_dir / "screenshot.png"))

    # 2. DOM (best-effort)
    try:
        html = driver.execute_script("return document.documentElement.outerHTML")
        if isinstance(html, str) and html:
            (temp_dir / "dom.html").write_text(html, encoding="utf-8")
    except Exception:
        pass  # noise hint just won't be available
```

The user then runs `npx testivai compare` (or wires it into a pytest hook) and the existing OSS tooling does the rest — diff, report, GitHub Action. No JavaScript code in the adapter; just disk I/O conforming to the layout above.

## Stability promise

Both the on-disk layout and the `results.json` schema are governed by the same compatibility promise as published `@testivai/witness` releases. We will not break either contract within a major version. Breaking changes will be announced in `CHANGELOG.md` and gated by a major version bump on `@testivai/witness`.
