---
sidebar_position: 2
title: How It Works
---

# How It Works

TestivAI integrates with your existing test framework via a single function call. This page explains the **local pipeline** that ships with the open-source SDKs.

---

## At a Glance

```text
   ┌──────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
   │  Your test       │───▶│  Capture layer   │───▶│  .testivai/temp/    │
   │  (Playwright,    │    │  (page, layout,  │    │    <name>/          │
   │   Selenium, …)   │    │   styles, …)     │    │      screenshot.png │
   └──────────────────┘    └──────────────────┘    └──────────┬──────────┘
                                                              │
                                  ┌───────────────────────────┘
                                  ▼
                  ┌────────────────────────────┐
                  │  Diff vs baseline          │       ┌──────────────────────────┐
                  │  .testivai/baselines/      │──────▶│  visual-report/          │
                  │    <name>/screenshot.png   │       │    index.html            │
                  └────────────────────────────┘       │    results.json          │
                                                       └──────────────────────────┘
```

Three things happen per test that calls `witness(...)`:

1. **Capture** — the SDK stabilizes the page (CSS animations/transitions frozen, caret hidden, web fonts awaited — disable with `stabilize: false`), then takes a full-page screenshot via the test framework's native screenshot API and writes it to `.testivai/temp/<name>/screenshot.png`.
2. **Diff** — at the end of the run, the reporter (or `testivai run` for non-Playwright frameworks) compares each temp capture against `.testivai/baselines/<name>/screenshot.png`.
3. **Report** — a self-contained `visual-report/index.html` is generated with a summary table, side-by-side images, and a `results.json` for CI consumption.

---

## Capture Layer

What the capture layer writes depends on the framework and on the active mode.

### Playwright (`@testivai/witness-playwright`)

Uses Playwright's native APIs directly:

| Always | Local mode adds | Cloud mode adds |
|---|---|---|
| Full-page PNG via `page.screenshot({ fullPage: true })` | Subdirectory layout `temp/<name>/screenshot.png` | Page HTML, computed styles, layout JSON, performance metrics |

No external Chrome remote-debugging port is needed.

### Other frameworks (`@testivai/witness` CLI)

When you wrap your test command with `testivai run "..."`, the CLI:

1. Boots Chrome with `--remote-debugging-port=9222`.
2. Connects via Chrome DevTools Protocol (CDP).
3. Listens for `witness(name)` calls from your test helper file.
4. Captures the screenshot and metadata for each call.
5. Writes the same on-disk layout as the Playwright SDK.

Frameworks supported by the `init` wizard: Cypress, Selenium (JS / Python / Java / .NET), WebdriverIO, Puppeteer, Robot Framework, Cucumber, RSpec/Capybara.

---

## Diff Algorithm

Local-mode diff is performed by `@testivai/witness/report` (`compareAll` in `report/compare.ts`):

1. Enumerate every `temp/<name>/screenshot.png` produced by the run.
2. For each, look up `baselines/<name>/screenshot.png`.
3. If no baseline exists → status `new` (you'll commit the temp file as the baseline).
4. If buffers are byte-identical → status `passed`.
5. Otherwise → status `changed` with a percent-diff estimate (subject to threshold from `.testivai/config.json`).

The threshold is configurable:

```json
// .testivai/config.json
{
  "mode": "local",
  "threshold": 0.1,
  "reportDir": "visual-report",
  "maxDiffPercent": 0,
  "noiseAutoPass": false,
  "stabilize": true,
  "ignoreSelectors": []
}
```

`threshold` controls per-pixel color sensitivity. The **pass criteria** decide what happens when pixels do differ: diffs within `maxDiffPercent` / `maxDiffPixels` report as passed, and with `noiseAutoPass` enabled, DOM-identical diffs (the noise hint) within `noiseMaxDiffPercent` pass too. Auto-passed snapshots keep their diff image and carry `autoPassed: "threshold" | "noise"` in `results.json`, so tolerance never hides information.

---

## Report

`generateReport` writes:

```text
visual-report/
├── index.html          ← self-contained, opens in a browser
├── results.json        ← machine-readable summary
└── images/
    └── <name>/
        ├── baseline.png
        ├── current.png
        └── diff.png    (when status = changed)
```

`results.json` schema (excerpt):

```json
{
  "version": "2.1.0",
  "timestamp": "2026-04-30T...",
  "summary": { "total": 2, "passed": 0, "changed": 2, "newSnapshots": 0 },
  "snapshots": [
    {
      "name": "homepage",
      "status": "changed",
      "diffPercent": 0.4,
      "dom": {
        "changed": true,
        "noiseHint": false,
        "summary": { "added": 2, "removed": 1, "attributeChanges": 0 }
      }
    },
    {
      "name": "hero",
      "status": "passed",
      "diffPercent": 0.3,
      "autoPassed": "noise"
    }
  ]
}
```

This file is what your CI should fail on. See [CI/CD guide](./guides/ci-cd.md). It is also the contract for AI coding agents: an agent can run the tests, read `results.json`, and use `dom.noiseHint` vs `dom.changed` to decide whether a diff needs human attention (see "Eyes for your coding agent" in the README).

---

## Baseline Lifecycle

```text
First run         →  status: new       →  commit temp/<name>/screenshot.png as baseline
Later runs        →  status: passed    →  no action
                  →  status: changed   →  inspect visual-report/index.html
                                         either approve (replace baseline) or fix code
```

Run `npx testivai approve <name>` (or `--all`) to promote a temp capture to the new baseline. The previous baseline is backed up under `.testivai/baselines/<name>/.previous/`; `--undo` restores it.

---

→ Continue to **[Playwright adapter](./frameworks/playwright.md)** or **[WebdriverIO adapter](./frameworks/webdriverio.md)**, or read the project **[philosophy](./philosophy.md)**.
