---
sidebar_position: 2
title: Browser Integration
---

# Browser Integration SDK

The TestivAI Witness SDK (`@testivai/witness`) is a framework-agnostic visual testing solution that works with any browser automation tool that supports Chrome/Chromium remote debugging.

## Overview

The Witness SDK operates as a **sidecar process** that:
1. Connects to your browser via remote debugging
2. Captures comprehensive snapshots when invoked
3. Uploads data to TestivAI for analysis
4. Works with any framework (Selenium, Playwright, Puppeteer, etc.)

## Quick Start

### 1. Install the Witness SDK

```bash
npm install -g @testivai/witness
# or
yarn global add @testivai/witness
```

### 2. Start the Witness Process

```bash
# Start with default port (9222)
testivai start

# Or specify custom port
testivai start --port 9333
```

### 3. Configure Your Browser

Add the remote debugging flag when launching your browser:

```javascript
// Chrome/Chromium
--remote-debugging-port=9222

// Example with Selenium (Java)
ChromeOptions options = new ChromeOptions();
options.addArguments("--remote-debugging-port=9222");
```

### 4. Add Witness Calls

In your tests, call the global `testivaiWitness` function:

```javascript
// JavaScript
await page.evaluate(() => window.testivaiWitness('homepage'));

// Python with Selenium
driver.execute_script("window.testivaiWitness('homepage')");

// Java with Selenium
((JavascriptExecutor)driver).executeScript("window.testivaiWitness('homepage')");

// Ruby with Capybara
page.driver.execute_script("window.testivaiWitness('homepage')")
```

## Framework Integration

### Selenium (JavaScript)

```javascript
const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

// Configure Chrome with remote debugging
const options = new chrome.Options();
options.addArguments('--remote-debugging-port=9222');
options.addArguments('--headless');
options.addArguments('--no-sandbox');
options.addArguments('--disable-dev-shm-usage');

const driver = await new Builder()
  .forBrowser('chrome')
  .setChromeOptions(options)
  .build();

// Take a snapshot
await driver.get('https://example.com');
await driver.executeScript("window.testivaiWitness('homepage')");
```

### Selenium (Python)

```python
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

# Configure Chrome with remote debugging
options = Options()
options.add_argument('--remote-debugging-port=9222')
options.add_argument('--headless')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')

driver = webdriver.Chrome(options=options)

# Take a snapshot
driver.get('https://example.com')
driver.execute_script("window.testivaiWitness('homepage')")
```

### Selenium (Java)

```java
ChromeOptions options = new ChromeOptions();
options.addArguments("--remote-debugging-port=9222");
options.addArguments("--headless");
options.addArguments("--no-sandbox");
options.addArguments("--disable-dev-shm-usage");

WebDriver driver = new ChromeDriver(options);
driver.get("https://example.com");

// Take a snapshot
((JavascriptExecutor)driver).executeScript("window.testivaiWitness('homepage')");
```

### Playwright

```javascript
const { chromium } = require('playwright');

// Connect to existing Chrome instance
const browser = await chromium.connect('ws://localhost:9222/devtools/browser');
const context = await browser.newContext();
const page = await context.newPage();

// Take a snapshot
await page.goto('https://example.com');
await page.evaluate(() => window.testivaiWitness('homepage'));
```

### Puppeteer

```javascript
const puppeteer = require('puppeteer');

// Connect to existing Chrome instance
const browser = await puppeteer.connect({
  browserURL: 'http://localhost:9222'
});

const page = await browser.newPage();
await page.goto('https://example.com');

// Take a snapshot
await page.evaluate(() => window.testivaiWitness('homepage'));
```

### Cypress

```javascript
// In cypress/support/e2e.js
before(() => {
  // Start Witness process before tests
  cy.exec('testivai start --port 9222', { failOnNonZeroExit: false });
});

// In your test file
it('should capture homepage', () => {
  cy.visit('/');
  cy.window().then((win) => {
    win.testivaiWitness('homepage');
  });
});
```

## Configuration Options

### CLI Options

```bash
testivai start --help

Options:
  --port <number>      Port for browser debugging (default: 9222)
  --host <string>      Host to bind to (default: localhost)
  --timeout <number>   Connection timeout in ms (default: 5000)
  --verbose            Enable verbose logging
```

### Environment Variables

```bash
# API endpoint
TESTIVAI_API_URL=https://api.testiv.ai

# API key (alternative to testivai auth)
TESTIVAI_API_KEY=your-api-key

# Debug mode
DEBUG=testivai:*
```

## What Gets Captured

Each `testivaiWitness()` call captures:

| Layer | Description |
|-------|-------------|
| **Screenshot** | Full-viewport PNG image |
| **DOM Tree** | Complete HTML structure |
| **CSS Styles** | Computed styles for all elements |
| **Layout Info** | Element positions and dimensions |
| **Performance** | Web Vitals and timing metrics |
| **Metadata** | Browser info, timestamp, viewport |

## Advanced Usage

### Multiple Browser Instances

```bash
# Start multiple witness instances
testivai start --port 9222 &
testivai start --port 9223 &
testivai start --port 9224 &
```

### Custom Namespacing

```javascript
// Use custom names for better organization
window.testivaiWitness('feature-login-form');
window.testivaiWitness('feature-dashboard-chart');
window.testivaiWitness('feature-user-profile');
```

### Conditional Capturing

```javascript
// Only capture on specific conditions
if (process.env.NODE_ENV === 'test') {
  window.testivaiWitness('critical-page');
}

// Or based on feature flags
if (featureFlags.visualTesting) {
  window.testivaiWitness('new-feature');
}
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Start Witness Process
  run: |
    testivai start &
    sleep 2  # Wait for Witness to start

- name: Run Tests
  run: npm test
  env:
    TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

### Docker

```dockerfile
FROM selenium/standalone-chrome:latest

# Install TestivAI Witness SDK
RUN npm install -g @testivai/witness

# Expose debugging port
EXPOSE 9222

# Start Witness with Chrome
CMD ["sh", "-c", "testivai start & /opt/bin/entry_point.sh"]
```

## Troubleshooting

### Connection Refused

1. Ensure Chrome is running with `--remote-debugging-port=9222`
2. Check if the port is available: `lsof -i :9222`
3. Try a different port if needed

### Witness Function Not Found

1. Verify the Witness SDK is running
2. Check browser console for errors
3. Ensure you're on an HTTP/HTTPS page (not file://)

### Slow Performance

1. Use `--headless` mode in CI
2. Disable unnecessary Chrome flags
3. Consider using parallel execution

## Best Practices

1. **Use descriptive names** for witness calls
2. **Group related snapshots** with consistent naming
3. **Clean up old baselines** regularly
4. **Use environment variables** for configuration
5. **Run Witness in background** for long-running test suites

## Migration from Framework-Specific SDKs

If you're using a framework-specific SDK (e.g., `@testivai/playwright`), migrating to the Witness SDK is simple:

1. Install `@testivai/witness`
2. Replace framework-specific imports with global function calls
3. Add Chrome debugging flags
4. Start the Witness process before tests

The benefit is a unified approach that works across all frameworks!

## Need Help?

- Check our [Troubleshooting Guide](/guides/troubleshooting)
- Visit our [GitHub Issues](https://github.com/testivai/testivai/issues)
- Contact support at hello@testiv.ai
