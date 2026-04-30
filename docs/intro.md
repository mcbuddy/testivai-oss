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

## Path A — Playwright (recommended)

Playwright has a dedicated TestivAI SDK that integrates as a reporter. No CLI wrapper, no Chrome remote debugging port — just install and add a capture call.

### 1. Install

```bash
npm install -D @testivai/witness-playwright @playwright/test
npx playwright install chromium
```

### 2. Enable local mode

Create `.testivai/config.json` at your project root:

```json
{
  "mode": "local",
  "threshold": 0.1,
  "reportDir": "visual-report",
  "autoOpen": false
}
```

This tells the reporter to compare locally and write an HTML report instead of uploading to the cloud. **No API key required.**

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

---

## Path B — Other Frameworks (Cypress, Selenium, WebdriverIO, pytest, etc.)

For non-Playwright frameworks, use the framework-agnostic CLI from `@testivai/witness`. It wraps your test command and captures via Chrome's DevTools Protocol.

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
- **[Frameworks](./frameworks/overview.md)** — per-framework setup guides
- **[Concepts: Baselines](./concepts/baselines.md)** — baseline lifecycle & approval
- **[Guides: CI/CD](./guides/ci-cd.md)** — running OSS lane in GitHub Actions
