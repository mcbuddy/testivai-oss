---
sidebar_position: 4
title: WebdriverIO
---

# WebdriverIO

Add visual regression testing to your existing WebdriverIO suite. The `browser.witness()` command is added as a custom WDIO command — no changes to your existing tests structure required.

---

## Prerequisites

- Node.js 18+
- Chrome browser
- Existing WebdriverIO project (`npm install @wdio/cli`)

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
? Select your test framework:  › WebdriverIO
? Where are your test files?   › test/specs
```

The wizard generates two files:

| File | Purpose |
|---|---|
| `testivai-witness.js` | Registers `browser.witness()` custom command |
| `test/specs/visual-example.js` | Working example test |

---

## 3. Authenticate

```bash
npx testivai auth <your-api-key>
```

Get your API key from the [TestivAI Dashboard](https://dashboard.testiv.ai).

---

## 4. Chrome Setup

Add `--remote-debugging-port=9222` to your `wdio.conf.js` Chrome options:

```js
// wdio.conf.js
exports.config = {
  capabilities: [{
    browserName: 'chrome',
    'goog:chromeOptions': {
      args: ['--remote-debugging-port=9222'],
    },
  }],
};
```

Also require the witness helper in your `wdio.conf.js` so `browser.witness()` is available globally:

```js
// wdio.conf.js
exports.config = {
  before: function () {
    require('./testivai-witness');
  },
  // ...
};
```

---

## 5. Add Capture Calls

`browser.witness('name')` is available in any spec file after requiring the helper:

```js
describe('Visual Regression', () => {
  it('homepage looks correct', async () => {
    await browser.url('/');
    await browser.witness('homepage');
  });

  it('dashboard looks correct', async () => {
    await browser.url('/dashboard');
    await browser.witness('dashboard');
  });
});
```

**The generated helper file (`testivai-witness.js`):**

```js
// TestivAI Visual Regression Helper
browser.addCommand('witness', function (name) {
  return this.execute('return window.testivaiWitness(arguments[0])', name);
});
```

---

## 6. Full Working Example

The wizard generates this example at `test/specs/visual-example.js`:

```js
// TestivAI Visual Regression Example
const { expect } = require('@wdio/globals');

describe('Visual Regression', () => {
  it('captures homepage', async () => {
    await browser.url('/');
    await browser.witness('homepage');
  });
});
```

---

## 7. Run

```bash
testivai run "npx wdio run wdio.conf.js"
```

---

## CI/CD

Add headless Chrome args for CI:

```js
// wdio.conf.js
'goog:chromeOptions': {
  args: [
    '--remote-debugging-port=9222',
    '--headless',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ],
},
```

GitHub Actions example:

```yaml
- name: Run visual tests
  run: testivai run "npx wdio run wdio.conf.js"
  env:
    TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

---

## How it works

`browser.witness('name')` uses WebdriverIO's `execute()` to call `window.testivaiWitness(name)` — the global function injected by the Witness SDK. The SDK captures a full snapshot and uploads it for REVEAL Engine™ analysis.

→ **[See how the sidecar model works](/how-it-works)**
