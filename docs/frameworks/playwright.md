---
sidebar_position: 6
title: Playwright
---

# Playwright

Playwright has its own dedicated TestivAI SDK — `@testivai/witness-playwright`. Unlike other frameworks, Playwright does **not** use the sidecar approach. The SDK integrates directly with Playwright's built-in browser control.

---

## Prerequisites

- Node.js 18+
- `@playwright/test` installed in your project

```bash
npm install @playwright/test
```

---

## 1. Install the Playwright SDK

```bash
npm install -D @testivai/witness-playwright @playwright/test
npx playwright install chromium
```

:::info No CLI required
Playwright uses a dedicated SDK, not the `@testivai/witness` CLI. Do not run `testivai run` with Playwright.
:::

---

## 2. Choose your mode

The Playwright SDK supports two modes. **You only need to configure one.**

### Mode A — Local mode (recommended for OSS)

No API key required. Diffs and reports are produced on disk.

Create `.testivai/config.json` at your project root:

```json
{
  "mode": "local",
  "threshold": 0.1,
  "reportDir": "visual-report",
  "autoOpen": false
}
```

The reporter detects this file and switches to local mode automatically. **Skip to step 3.**

### Mode B — Cloud mode (optional, hosted)

Get your API key from the [TestivAI Dashboard](https://dashboard.testiv.ai) and set it as a **shell environment variable**:

```bash
export TESTIVAI_API_KEY=your-api-key
```

To make this permanent, add it to your shell profile:

```bash
# zsh (macOS default)
echo 'export TESTIVAI_API_KEY=your-api-key' >> ~/.zshrc
source ~/.zshrc

# bash
echo 'export TESTIVAI_API_KEY=your-api-key' >> ~/.bashrc
source ~/.bashrc
```

:::warning Shell environment variables only
TestivAI SDKs read configuration **exclusively from shell environment variables** (`process.env`). Do **not** use `.env` files or `dotenv` — the SDK will not load them. Always `export` your variables in your shell or CI environment.
:::

---

## 3. Configure Reporter

Add the TestivAI reporter to your `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['html'], // Keep Playwright's HTML reporter
    ['@testivai/witness-playwright/reporter', {
      // Optional configuration
      debug: false, // Set to true for verbose logging
      compression: {
        compressUploads: true, // Enable compression for large payloads
        compressionThreshold: 5 * 1024 * 1024, // 5MB threshold
      }
    }]
  ],
  use: {
    // Your Playwright configuration
  },
});
```

### Reporter Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `debug` | `boolean` | `false` | Enable verbose logging. Can also be set via `TESTIVAI_DEBUG=true` |
| `apiUrl` | `string` | `https://core-api.testiv.ai` | Custom API endpoint URL |
| `apiKey` | `string` | `process.env.TESTIVAI_API_KEY` | API key (overrides environment variable) |
| `compression` | `object` | `{}` | Compression settings for uploads |

---

## 4. Add Capture Calls

Import `testivai` from the SDK and call `testivai.witness(page, testInfo, 'name')` in your tests:

```ts
import { test } from '@playwright/test';
import { testivai } from '@testivai/witness-playwright';

test('homepage looks correct', async ({ page }, testInfo) => {
  await page.goto('http://localhost:3000');
  await testivai.witness(page, testInfo, 'homepage');
});

test('login page looks correct', async ({ page }, testInfo) => {
  await page.goto('http://localhost:3000/login');
  await testivai.witness(page, testInfo, 'login-page');
});
```

---

## 5. Full Working Example

```ts
import { test, expect } from '@playwright/test';
import { testivai } from '@testivai/witness-playwright';

test.describe('Visual Regression', () => {
  test('homepage', async ({ page }, testInfo) => {
    await page.goto('/');
    await testivai.witness(page, testInfo, 'homepage');
  });

  test('navigation state', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.click('nav a[href="/about"]');
    await testivai.witness(page, testInfo, 'about-page');
  });

  test('mobile viewport', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await testivai.witness(page, testInfo, 'homepage-mobile');
  });
});
```

---

## 6. Run

Run your tests normally with Playwright — no `testivai run` wrapper needed:

```bash
npx playwright test
```

---

## CI/CD

GitHub Actions example:

```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: Run visual tests
  run: npx playwright test
  env:
    TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

---

## What gets captured

| Data | Local mode | Cloud mode |
|---|---|---|
| Full-page PNG screenshot | ✅ | ✅ |
| Subdirectory layout (`temp/<name>/screenshot.png`) | ✅ | — |
| Page HTML (structure) | — | ✅ |
| Computed styles | — | ✅ |
| Bounding boxes / layout JSON | — | ✅ |
| Performance metrics (Web Vitals) | — | ✅ |

In local mode, only the screenshot is captured. Cloud mode additionally captures structural and performance data for REVEAL Engine™ analysis.

---

## How it works

The Playwright SDK uses Playwright's native `page.screenshot()`, `page.evaluate()`, and browser session APIs directly — no external Chrome debugging port required. This makes it the most seamless integration for Playwright users.

→ **[See all captured layers](/how-it-works)**

---

## Version History

- **v1.1.3** (Latest) — Fix: local-mode snapshots now write the subdirectory layout expected by `@testivai/witness/report`, so the HTML report is correctly populated.
- **v1.1.2** — First release from [`testivai-oss`](https://github.com/mcbuddy/testivai-oss); URLs/workspace topology updates only.
- **v1.1.0** — Local mode (config-driven) added.
- **v1.0.0** — REVEAL Engine terminology rename.
- **v0.3.1** — Fixed dist build.
- **v0.3.0** — Reporter crash fix, debug logging, unified format with Witness SDK.
- **v0.2.0** — Structure analysis and styles fingerprinting.
- **v0.1.13** — Initial public release.
