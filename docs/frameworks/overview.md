---
sidebar_position: 1
title: Framework Support
---

# Framework Support

TestivAI works with any framework that can control Chrome. One SDK, every framework.

## Supported Frameworks

| Language | Framework | Capture Call | Run Command |
|---|---|---|---|
| JavaScript | Cypress | `cy.witness('name')` | `testivai run "cypress run --browser chrome"` |
| JavaScript | Selenium | `await witness(driver, 'name')` | `testivai run "npx jest tests/"` |
| JavaScript | WebdriverIO | `await browser.witness('name')` | `testivai run "npx wdio run wdio.conf.js"` |
| JavaScript | Puppeteer | `await witness(page, 'name')` | `testivai run "npx jest tests/"` |
| JavaScript | Playwright | Dedicated SDK | `npx playwright test` |
| Python | Selenium + pytest | `witness(driver, 'name')` | `testivai run "pytest tests/ -v"` |
| Python | Selenium + unittest | `witness(self.driver, 'name')` | `testivai run "python -m unittest discover"` |
| Python | Robot Framework | `Witness    name` | `testivai run "robot tests/"` |
| Java | Selenium + JUnit 5 | `TestivAIWitness.witness(driver, "name")` | `testivai run "mvn test"` |
| Java | Selenium + TestNG | `TestivAIWitness.witness(driver, "name")` | `testivai run "mvn test"` |
| Ruby | RSpec + Capybara | `witness 'name'` | `testivai run "bundle exec rspec"` |
| Ruby | Cucumber + Capybara | Step: `the "name" page looks correct` | `testivai run "bundle exec cucumber"` |

Pick your framework from the sidebar to see full setup instructions and a working example.

---

## How the Capture Works

All frameworks call the same underlying mechanism — a global `window.testivaiWitness()` function injected by the Witness SDK via Chrome's remote debugging interface. The generated helper file wraps this call in a framework-idiomatic way:

- **JS frameworks** — `executeScript` / `evaluate` wrapper
- **Python** — `driver.execute_script()` wrapper
- **Java** — `JavascriptExecutor` wrapper
- **Ruby** — `execute_script` wrapper
- **Cypress** — native `cy.window().invoke()` custom command
- **Robot Framework** — `Execute Javascript` keyword wrapper

---

## Chrome Requirement

All non-Playwright frameworks require Chrome to start with `--remote-debugging-port=9222`. The `testivai init` wizard generates configuration to do this automatically for each framework.

:::info Playwright
Playwright has its own browser integration built in. Use `@testivai/witness-playwright` instead of this SDK.
:::
