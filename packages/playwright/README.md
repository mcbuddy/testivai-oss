# @testivai/witness-playwright

Official Playwright adapter for TestivAI visual regression testing.

## Installation

```bash
npm install -D @testivai/witness-playwright
```

## Quick Start (Local Mode — Free)

1. **Initialize your project**
   ```bash
   npx testivai init
   # Select "Local Mode" when prompted
   ```

2. **Add the reporter to your Playwright config**
   ```typescript
   // playwright.config.ts
   import { defineConfig } from '@playwright/test';

   export default defineConfig({
     reporter: [
       ['line'],
       ['@testivai/witness-playwright/reporter', {
         // No API key needed for local mode!
       }]
     ],
   });
   ```

3. **Capture snapshots in your tests**
   ```typescript
   import { test, expect } from '@playwright/test';
   import { snapshot } from '@testivai/witness-playwright';

   test('homepage visual', async ({ page }, testInfo) => {
     await page.goto('https://example.com');
     await snapshot(page, testInfo, 'homepage');
   });
   ```

4. **Run your tests**
   ```bash
   npx playwright test
   ```

5. **View the report**
   Open `visual-report/index.html` in your browser.

6. **Approve changes**
   ```bash
   npx testivai approve --all
   ```

## Configuration

### Local Mode (Default)

No configuration needed! Just run `npx testivai init` and select "Local Mode".

### Cloud Mode

For team dashboards and collaboration:

```typescript
// playwright.config.ts
export default defineConfig({
  reporter: [
    ['line'],
    ['@testivai/witness-playwright/reporter', {
      apiKey: process.env.TESTIVAI_API_KEY,
    }]
  ],
});
```

## API Reference

### `snapshot(page, testInfo, name?, config?)`

Capture a visual snapshot of the current page.

```typescript
import { snapshot } from '@testivai/witness-playwright';

// Basic usage
await snapshot(page, testInfo, 'my-snapshot');

// With custom config
await snapshot(page, testInfo, 'checkout-page', {
  threshold: 0.05,  // 5% difference tolerance
  fullPage: true,   // Capture full page
});
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Visual Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install chromium
      - run: npx playwright test
      - uses: testivai/testivai-action@v1
        if: always()
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          report-dir: visual-report
```

## License

MIT

## Support

- Documentation: https://github.com/mcbuddy/testivai-oss/tree/main/packages/playwright
- Issues: https://github.com/mcbuddy/testivai-oss/issues
- Website: https://testiv.ai
