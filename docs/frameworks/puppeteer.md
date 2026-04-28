---
sidebar_position: 5
title: Puppeteer
---

# Puppeteer

Add visual regression testing to your existing Puppeteer test suite. The `witness(page, name)` helper wraps Puppeteer's `page.evaluate()` to capture snapshots via the Witness SDK.

---

## Prerequisites

- Node.js 18+
- `puppeteer` installed in your project

```bash
npm install puppeteer
```

---

## 1. Install the CLI

```bash
npm install -g @testivai/witness
```

---

## 2. Run the Setup Wizard

```bash
npx testivai init
```

Select when prompted:

```
? Select your language:        › JavaScript / TypeScript
? Select your test framework:  › Puppeteer
? Where are your test files?   › tests
```

The wizard generates two files:

| File | Purpose |
|---|---|
| `testivai-witness.js` | `witness(page, name)` helper function |
| `tests/visual-example.test.js` | Working example test |

---

## 3. Authenticate

```bash
npx testivai auth <your-api-key>
```

Get your API key from the [TestivAI Dashboard](https://dashboard.testiv.ai).

---

## 4. Chrome Setup

Pass `--remote-debugging-port=9222` in your `puppeteer.launch()` args:

```js
const browser = await puppeteer.launch({
  args: ['--remote-debugging-port=9222'],
});
```

:::tip
Puppeteer controls Chrome directly, so `--remote-debugging-port=9222` is added to the launch args — not `ChromeOptions` like in Selenium.
:::

---

## 5. Add Capture Calls

Import `witness` from the generated helper and call it after navigating:

```js
const puppeteer = require('puppeteer');
const { witness } = require('../testivai-witness');

const browser = await puppeteer.launch({ args: ['--remote-debugging-port=9222'] });
const page = await browser.newPage();

await page.goto('http://localhost:3000');
await witness(page, 'homepage');

await page.goto('http://localhost:3000/login');
await witness(page, 'login-page');
```

**The generated helper file (`testivai-witness.js`):**

```js
// TestivAI Visual Regression Helper
async function witness(page, name) {
  return page.evaluate((n) => window.testivaiWitness(n), name);
}
module.exports = { witness };
```

---

## 6. Full Working Example

The wizard generates this example at `tests/visual-example.test.js`:

```js
// TestivAI Visual Regression Example
const puppeteer = require('puppeteer');
const { witness } = require('../testivai-witness');

describe('Visual Regression', () => {
  let browser, page;

  beforeAll(async () => {
    browser = await puppeteer.launch({ args: ['--remote-debugging-port=9222'] });
    page = await browser.newPage();
  });

  afterAll(async () => await browser.close());

  it('captures homepage', async () => {
    await page.goto('http://localhost:3000');
    await witness(page, 'homepage');
  });
});
```

---

## 7. Run

```bash
testivai run "npx jest tests/"
```

---

## CI/CD

Add `--headless`, `--no-sandbox`, and `--disable-dev-shm-usage` for CI:

```js
const browser = await puppeteer.launch({
  args: [
    '--remote-debugging-port=9222',
    '--headless',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ],
});
```

GitHub Actions example:

```yaml
- name: Run visual tests
  run: testivai run "npx jest tests/"
  env:
    TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

---

## How it works

`witness(page, name)` uses Puppeteer's `page.evaluate()` to call `window.testivaiWitness(name)` — the global function injected by the Witness SDK. The SDK captures a full snapshot and uploads it for REVEAL Engine™ analysis.

→ **[See how the sidecar model works](/how-it-works)**
