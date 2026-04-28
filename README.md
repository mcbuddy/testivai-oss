# TestivAI Open Source

Local-first visual regression testing SDKs for modern web applications.

This is the **public, open-source home** for the TestivAI SDKs. It contains everything you need to capture, diff, and report visual regressions locally — with optional cloud upgrade via the TestivAI hosted service.

## Packages

| Package | Description |
|---|---|
| [`@testivai/common`](./packages/common) | Shared utilities (config loading, API client, auth, compression) |
| [`@testivai/witness`](./packages/witness) | Core SDK: CLI, local diffing, baselines, HTML report generator |
| [`@testivai/witness-playwright`](./packages/playwright) | Playwright reporter/adapter built on top of `@testivai/witness` |

Plus:
- [`action/`](./action) — GitHub Action for PR-based visual approvals
- [`examples/`](./examples) — minimal real-world example projects
- [`docs/`](./docs) — public documentation
- [`e2e/`](./e2e) — OSS smoke E2E test suite

## Quick Start

```bash
# Install in your Playwright project
npm install -D @testivai/witness-playwright

# Add the reporter to playwright.config.ts:
#   reporter: [['list'], ['@testivai/witness-playwright/reporter']]

# Run tests; visual report is generated in ./visual-report/
npx playwright test
```

## Local-First, Cloud-Optional

These SDKs work fully offline:
- Capture screenshots and structure data via Chrome DevTools Protocol
- Compare against locally stored baselines under `.testivai/baselines/`
- Generate a self-contained HTML report under `./visual-report/`

To opt into the hosted TestivAI service (AI-powered analysis, dashboard, team workflow), set `TESTIVAI_API_KEY`. Cloud is optional and not required to use this OSS.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm e2e
```

## Attribution

This repository was extracted from the private TestivAI monorepo with a clean initial git history. Original development history is preserved internally; this public repository is the new source of truth for the SDKs going forward.

## License

MIT — see [LICENSE](./LICENSE).
