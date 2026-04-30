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

1. **Capture** — the SDK takes a full-page screenshot via the test framework's native screenshot API and writes it to `.testivai/temp/<name>/screenshot.png`.
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
  "reportDir": "visual-report"
}
```

A `threshold` of `0.1` (10%) means small below-threshold drift still flags as `changed`; you decide whether to approve or investigate.

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
  "version": "2.0.0",
  "timestamp": "2026-04-30T...",
  "summary": { "total": 2, "passed": 0, "changed": 2, "newSnapshots": 0 },
  "snapshots": [
    { "name": "homepage", "status": "changed", "diffPercent": 0.4, ... }
  ]
}
```

This file is what your CI should fail on. See [CI/CD guide](./guides/ci-cd.md).

---

## Baseline Lifecycle

```text
First run         →  status: new       →  commit temp/<name>/screenshot.png as baseline
Later runs        →  status: passed    →  no action
                  →  status: changed   →  inspect visual-report/index.html
                                         either approve (replace baseline) or fix code
```

See [Concepts: Baselines](./concepts/baselines.md) for the full approval flow.

---

## Optional: Cloud Mode

If `TESTIVAI_API_KEY` is set (and `.testivai/config.json` is **not** in local mode), the reporter uploads evidence to the TestivAI cloud instead of generating a local report. Cloud mode adds:

- **REVEAL Engine™** — multi-layer non-AI + AI-assisted analysis
- **Hosted dashboard** — team workflow, PR comments, approval gates
- **Smart Baselines** — automatic baseline branching per environment

Cloud mode is **opt-in**. The OSS SDKs work entirely without it.

→ Continue to **[Frameworks](./frameworks/overview.md)**
