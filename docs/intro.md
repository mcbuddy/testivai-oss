---
sidebar_position: 1
title: Getting Started
slug: /intro
---

# Getting Started

Add visual regression testing to your existing test suite in under 5 minutes. TestivAI works with **any framework that controls Chrome** — no framework-specific SDK required.

## Prerequisites

- Node.js 18+
- Chrome browser (local or in CI)
- Your existing test suite (Cypress, Selenium, WebdriverIO, pytest, JUnit, etc.)

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

The interactive wizard asks two questions and generates helper files for your framework:

```
  ╔══════════════════════════════════════╗
  ║   TestivAI Visual Regression Setup   ║
  ╚══════════════════════════════════════╝

? Select your language:   › JavaScript / TypeScript
? Select your test framework:   › Cypress
? Where are your test files?   › cypress/e2e

  ✓ Created: cypress/support/testivai-witness.js
  ✓ Created: cypress/support/testivai-plugin.js
  ✓ Created: cypress/e2e/visual-example.cy.js
  ✓ Created: testivai.config.ts
```

:::tip Playwright users
If Playwright is detected, `testivai init` will direct you to the dedicated Playwright SDK: `@testivai/witness-playwright`
:::

---

## 3. Authenticate

Get your API key from the [TestivAI Dashboard](https://dashboard.testiv.ai) and export it in your shell:

```bash
export TESTIVAI_API_KEY=your-api-key
```

To make it permanent, add the export to your shell profile (`~/.zshrc` or `~/.bashrc`).

For the Witness SDK, you can also store the key locally:

```bash
npx testivai auth <your-api-key>
```

:::warning Shell environment variables only
TestivAI SDKs read configuration from **shell environment variables only**. Do not use `.env` files or `dotenv` — the SDKs will not load them.
:::

---

## 4. Add a Capture Call

The wizard generates an example file. The key call is `witness('name')` — add it anywhere in your test at the moment you want a snapshot:

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="framework">
<TabItem value="cypress" label="Cypress">

```js
it('homepage looks correct', () => {
  cy.visit('/');
  cy.witness('homepage');
});
```

</TabItem>
<TabItem value="selenium-js" label="Selenium (JS)">

```js
const { witness } = require('../testivai-witness');

it('homepage looks correct', async () => {
  await driver.get('http://localhost:3000');
  await witness(driver, 'homepage');
});
```

</TabItem>
<TabItem value="pytest" label="pytest">

```python
from testivai_witness import witness

def test_homepage(driver):
    driver.get('http://localhost:3000')
    witness(driver, 'homepage')
```

</TabItem>
</Tabs>

---

## 5. Run

Wrap your normal test command with `testivai run`:

```bash
# Cypress
testivai run "cypress run --browser chrome"

# pytest
testivai run "pytest tests/ -v"

# JUnit (Maven)
testivai run "mvn test"
```

That's it. TestivAI captures screenshots and metadata automatically — then runs REVEAL Engine™ analysis in the cloud.

---

## What Happens Next

| First run | Baselines are created — no diff yet |
|---|---|
| Subsequent runs | Each snapshot is compared against the baseline |
| Visual change detected | Dashboard shows side-by-side diff with AI analysis |
| You approve/reject | Baseline is updated or the change is flagged |

→ **[See how it works under the hood](/how-it-works)**
