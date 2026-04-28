---
sidebar_position: 3
title: Selenium (JavaScript)
---

# Selenium (JavaScript)

Add visual regression testing to your existing Selenium + JavaScript test suite. Works with Jest, Mocha, or any other JS test runner.

---

## Prerequisites

- Node.js 18+
- Chrome browser
- `selenium-webdriver` installed in your project

```bash
npm install selenium-webdriver
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
? Select your test framework:  › Selenium
? Where are your test files?   › tests
```

The wizard generates two files:

| File | Purpose |
|---|---|
| `testivai-witness.js` | `witness(driver, name)` helper function |
| `tests/visual-example.test.js` | Working example test |

---

## 3. Authenticate

```bash
npx testivai auth <your-api-key>
```

Get your API key from the [TestivAI Dashboard](https://dashboard.testiv.ai).

---

## 4. Chrome Setup

The generated example adds `--remote-debugging-port=9222` to your Chrome options. Add it to your existing driver setup:

```js
const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const options = new chrome.Options();
options.addArguments('--remote-debugging-port=9222');

const driver = await new Builder()
  .forBrowser('chrome')
  .setChromeOptions(options)
  .build();
```

---

## 5. Add Capture Calls

Import `witness` from the generated helper and call it after navigating:

```js
const { witness } = require('../testivai-witness');

it('homepage looks correct', async () => {
  await driver.get('http://localhost:3000');
  await witness(driver, 'homepage');
});

it('login page looks correct', async () => {
  await driver.get('http://localhost:3000/login');
  await witness(driver, 'login-page');
});
```

**The generated helper file (`testivai-witness.js`):**

```js
// TestivAI Visual Regression Helper
async function witness(driver, name) {
  return driver.executeScript(`return window.testivaiWitness('${name}')`);
}
module.exports = { witness };
```

---

## 6. Full Working Example

The wizard generates this example at `tests/visual-example.test.js`:

```js
// TestivAI Visual Regression Example
const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { witness } = require('../testivai-witness');

describe('Visual Regression', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options();
    options.addArguments('--remote-debugging-port=9222');
    driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  });

  afterAll(async () => await driver.quit());

  it('captures homepage', async () => {
    await driver.get('http://localhost:3000');
    await witness(driver, 'homepage');
  });
});
```

---

## 7. Run

```bash
testivai run "npx jest tests/"
```

Or with Mocha:

```bash
testivai run "npx mocha tests/**/*.test.js"
```

---

## CI/CD

Add `--headless` and `--no-sandbox` for CI environments:

```js
options.addArguments('--remote-debugging-port=9222');
options.addArguments('--headless');
options.addArguments('--no-sandbox');
options.addArguments('--disable-dev-shm-usage');
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

`witness(driver, name)` calls `driver.executeScript()` to invoke `window.testivaiWitness(name)` — the global function injected by the Witness SDK. The SDK captures a full snapshot and uploads it for REVEAL Engine™ analysis.

→ **[See how the sidecar model works](/how-it-works)**
