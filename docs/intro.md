---
sidebar_position: 1
title: Getting Started
slug: /intro
---

# Getting Started

Add visual regression testing to your test suite in under 5 minutes — fully local, no account needed.

## Prerequisites

- Node.js 18+ (Node 20+ recommended)
- A test suite that drives a real browser (Playwright, Selenium, WebdriverIO, Cypress, Puppeteer, etc.)

---

## Path A — Dedicated adapters (recommended)

Two frameworks have first-class adapter packages today: **Playwright** and **WebdriverIO**. They use the framework's native screenshot APIs — no CLI wrapper, no Chrome remote debugging port, no race conditions.

### Playwright

The Playwright adapter integrates as a reporter. Just install and add a capture call.

### 1. Install

```bash
npm install -D @testivai/witness-playwright @playwright/test
npx playwright install chromium
```

### 2. (Optional) Customize settings

Local mode is automatic when no `TESTIVAI_API_KEY` is set — the reporter compares locally and writes an HTML report with zero configuration. **No API key required.**

If you want to tune tolerances or change the report output directory, create `.testivai/config.json` at your project root:

```json
{
  "mode": "local",
  "threshold": 0.1,
  "reportDir": "visual-report",
  "autoOpen": false
}
```

Optional tolerance and capture settings (all have safe defaults):

| Field | Default | What it does |
|---|---|---|
| `maxDiffPercent` | `0` | Diffs at or below this percentage report as **passed** — your team's tolerance dial |
| `maxDiffPixels` | unset | Absolute variant: pass when changed-pixel count is at or below this |
| `noiseAutoPass` | `false` | Auto-pass diffs whose DOM is structurally identical (the noise hint), up to `noiseMaxDiffPercent` |
| `noiseMaxDiffPercent` | `1` | Upper bound (diff %) for `noiseAutoPass` |
| `stabilize` | `true` | Freeze animations/transitions, hide the caret, and wait for web fonts before every capture |
| `ignoreSelectors` | `[]` | Elements hidden (`visibility: hidden`) during capture — timestamps, ads, live widgets |
| `mask` | `[]` | Areas excluded from the pixel diff and hatched in the report — selectors or geometric regions ([details](./comparison.md)) |
| `diffRegions` | `{minSize: 10, mergeDistance: 12}` | Diff clustering tunables: noise floor + merge gap ([details](./comparison.md)) |

Auto-passed snapshots keep their diff image and are labeled in the report and in `results.json` (`autoPassed: "threshold" | "noise"`), so tolerance never hides information — it just stops demanding review for changes you've declared acceptable.

### 3. Add the reporter

In `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['@testivai/witness-playwright/reporter'],
  ],
});
```

### 4. Add a capture call

```ts
import { test } from '@playwright/test';
import { testivai } from '@testivai/witness-playwright';

test('homepage looks correct', async ({ page }, testInfo) => {
  await page.goto('http://localhost:3000');
  await testivai.witness(page, testInfo, 'homepage');
});
```

### 5. Run

```bash
npx playwright test
```

**First run:** baselines are created under `.testivai/baselines/<name>/screenshot.png` and the report shows `New: N`. Commit them to git.
**Later runs:** screenshots are compared, the HTML report opens at `visual-report/index.html`, and `results.json` is produced.

### WebdriverIO

```bash
npm install -D @testivai/witness @testivai/witness-webdriverio
```

Add the service to `wdio.conf.ts`:

```ts
import { TestivaiService } from '@testivai/witness-webdriverio/service';

export const config = {
  services: [[TestivaiService, {}]],
};
```

Capture inside a test:

```ts
import { testivai } from '@testivai/witness-webdriverio';

it('homepage looks correct', async () => {
  await browser.url('http://localhost:3000');
  await testivai.witness(browser, 'homepage');
});
```

Same `.testivai/baselines/` layout, same HTML report, same approval workflow as the Playwright lane.

→ See the full [WebdriverIO quickstart](./frameworks/webdriverio.md) for service options + cloud-mode caveat.

---

## Path B — Other Frameworks (experimental)

For Cypress, Puppeteer, Selenium, pytest, RSpec, Robot, etc., use the framework-agnostic CLI from `@testivai/witness`. It wraps your test command and captures via Chrome's DevTools Protocol.

:::warning Experimental
This sidecar mode is labeled experimental — launch coordination across frameworks is brittle. For Playwright and WebdriverIO, prefer the dedicated adapters above. See [the sidecar caveats](./sidecar-testivai-run.md) for the full picture, and [community adapter contract](./extension-api.md) if you'd like to write a proper adapter for your framework.
:::

### 1. Install the CLI

```bash
npm install -D @testivai/witness
```

### 2. Run the setup wizard

```bash
npx testivai init
```

The wizard detects your framework and generates helper files plus a `testivai.config.ts`.

### 3. Add a capture call

The wizard generates an example file. The key call is `witness('name')`:

```js
// Cypress
it('homepage looks correct', () => {
  cy.visit('/');
  cy.witness('homepage');
});
```

```python
# pytest
from testivai_witness import witness

def test_homepage(driver):
    driver.get('http://localhost:3000')
    witness(driver, 'homepage')
```

### 4. Run

```bash
# Cypress
npx testivai run "cypress run --browser chrome"

# pytest
npx testivai run "pytest tests/ -v"
```

The wrapper boots Chrome with `--remote-debugging-port=9222`, runs your tests, captures screenshots, and writes baselines + report.

---

## What gets produced (local mode)

| Path | Purpose |
|---|---|
| `.testivai/baselines/<name>/screenshot.png` | Committed baseline (track in git) |
| `.testivai/temp/` | Transient per-run captures (gitignore this) |
| `visual-report/index.html` | Self-contained HTML diff report |
| `visual-report/results.json` | Machine-readable summary |

Recommended `.gitignore`:

```
.testivai/temp/
visual-report/
```

---

## Optional — Cloud Mode

If you want AI-powered change analysis (REVEAL Engine™), a hosted dashboard, and a team approval workflow, opt into [TestivAI Cloud](https://testiv.ai):

```bash
export TESTIVAI_API_KEY=your-api-key
```

Or store it locally for the witness CLI:

```bash
npx testivai auth <your-api-key>
```

:::warning Shell environment variables only
TestivAI SDKs read configuration from **shell environment variables only**. `.env` files and `dotenv` are not loaded.
:::

When `TESTIVAI_API_KEY` is set, runs upload evidence to the cloud instead of generating a local report. Removing the variable (or removing it from CI) reverts to local mode automatically.

---

## What's Next

- **[How It Works](./how-it-works.md)** — local pipeline, capture layers, diff algorithm
- **[OSS vs Cloud](./oss-vs-cloud.md)** — capability matrix
- **[Playwright adapter](./frameworks/playwright.md)** / **[WebdriverIO adapter](./frameworks/webdriverio.md)**
- **[GitHub Action](./github-action.md)** — post results to PRs
- **[Extension API](./extension-api.md)** — write a community adapter for your framework
- **[Guides: CI/CD](./guides/ci-cd.md)** — running OSS lane in GitHub Actions
