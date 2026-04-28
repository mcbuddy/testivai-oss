---
sidebar_position: 2
title: Cypress
---

# Cypress

Add visual regression testing to your existing Cypress suite in under 5 minutes. No changes to your existing tests required — just add `cy.witness('name')` wherever you want a snapshot.

---

## Prerequisites

- Node.js 18+
- Chrome browser
- Existing Cypress project (`npm install cypress`)

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
? Select your test framework:  › Cypress
? Where are your test files?   › cypress/e2e
```

The wizard generates three files:

| File | Purpose |
|---|---|
| `cypress/support/testivai-witness.js` | Adds `cy.witness()` custom command |
| `cypress/support/testivai-plugin.js` | Injects `--remote-debugging-port=9222` on Chrome launch |
| `cypress/e2e/visual-example.cy.js` | Working example test |

---

## 3. Authenticate

```bash
npx testivai auth <your-api-key>
```

Get your API key from the [TestivAI Dashboard](https://dashboard.testiv.ai).

---

## 4. Register the Plugin

In your `cypress.config.js`, import and call the plugin inside `setupNodeEvents`:

```js
const { defineConfig } = require('cypress');
const testivaiPlugin = require('./cypress/support/testivai-plugin');

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      testivaiPlugin(on, config);
      return config;
    },
  },
});
```

The plugin automatically adds `--remote-debugging-port=9222` when Chrome launches. No manual Chrome configuration needed.

---

## 5. Add Capture Calls

Import the witness helper in your support file or directly in a test:

```js
// cypress/support/e2e.js  (or import in individual tests)
import './testivai-witness';
```

Then call `cy.witness('name')` at any point in your test:

```js
it('homepage looks correct', () => {
  cy.visit('/');
  cy.witness('homepage');
});

it('login page looks correct', () => {
  cy.visit('/login');
  cy.witness('login-page');
});
```

**The generated helper file (`testivai-witness.js`):**

```js
// TestivAI Visual Regression Helper
Cypress.Commands.add('witness', (name) => {
  return cy.window().invoke('testivaiWitness', name);
});
```

---

## 6. Full Working Example

The wizard generates this example at `cypress/e2e/visual-example.cy.js`:

```js
// TestivAI Visual Regression Example
import '../support/testivai-witness';

describe('Visual Regression', () => {
  it('captures homepage', () => {
    cy.visit('/');
    cy.witness('homepage');
  });
});
```

---

## 7. Run

```bash
testivai run "cypress run --browser chrome"
```

`testivai run` wraps your normal Cypress command, connects to the browser, and captures snapshots automatically.

---

## CI/CD

Add `--headless` for headless Chrome in CI:

```bash
testivai run "cypress run --browser chrome --headless"
```

For GitHub Actions:

```yaml
- name: Run visual tests
  run: testivai run "cypress run --browser chrome --headless"
  env:
    TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

---

## How it works

`cy.witness('name')` calls `cy.window().invoke('testivaiWitness', name)` — invoking the global function injected by the Witness SDK. The Witness SDK captures a full snapshot and uploads it for REVEAL Engine™ analysis.

→ **[See how the sidecar model works](/how-it-works)**
