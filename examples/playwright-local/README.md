# Example: Playwright (Local Mode)

Minimal Playwright project using `@testivai/witness-playwright` in **local mode** — no API key required.

## Run

```bash
pnpm install
pnpm --filter @testivai-oss/example-playwright-local exec playwright install chromium
pnpm --filter @testivai-oss/example-playwright-local test
```

After the run, open `visual-report/index.html` to view the local HTML report.

## What it does

- Captures a snapshot of `example.com` via Playwright
- Stores baselines under `.testivai/baselines/`
- Generates a self-contained HTML report under `visual-report/`

The local mode is configured via `.testivai/config.json`.
