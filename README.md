# TestivAI Open Source

[![@testivai/common](https://img.shields.io/npm/v/@testivai/common.svg?label=%40testivai%2Fcommon)](https://www.npmjs.com/package/@testivai/common)
[![@testivai/witness](https://img.shields.io/npm/v/@testivai/witness.svg?label=%40testivai%2Fwitness)](https://www.npmjs.com/package/@testivai/witness)
[![@testivai/witness-playwright](https://img.shields.io/npm/v/@testivai/witness-playwright.svg?label=%40testivai%2Fwitness-playwright)](https://www.npmjs.com/package/@testivai/witness-playwright)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Local-first visual regression testing SDKs for modern web applications.**

This is the public, open-source home for the TestivAI SDKs. It contains everything you need to capture, diff, and report visual regressions **fully locally** — with optional cloud upgrade via the TestivAI hosted service.

## Packages

| Package | Latest | Description |
|---|---|---|
| [`@testivai/common`](./packages/common) | `0.2.2` | Shared utilities (config loading, API client, auth, compression) |
| [`@testivai/witness`](./packages/witness) | `1.0.2` | Core SDK: CLI, local diffing, baselines, HTML report generator |
| [`@testivai/witness-playwright`](./packages/playwright) | `1.1.3` | Playwright reporter/adapter built on top of `@testivai/witness` |

Plus:
- [`action/`](./action) — GitHub Action for PR-based visual approvals
- [`examples/`](./examples) — minimal real-world example projects
- [`docs/`](./docs) — public documentation
- [`e2e/`](./e2e) — OSS smoke E2E test suite

## Quick Start (Playwright, Local Mode)

```bash
# 1. Install
npm install -D @testivai/witness-playwright @playwright/test
npx playwright install chromium
```

```jsonc
// 2. Tell TestivAI to run in local mode (no API key, no upload)
// File: .testivai/config.json
{
  "mode": "local",
  "threshold": 0.1,
  "reportDir": "visual-report",
  "autoOpen": false
}
```

```ts
// 3. Wire the reporter — playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['@testivai/witness-playwright/reporter'],
  ],
});
```

```ts
// 4. Add a capture call — tests/example.spec.ts
import { test } from '@playwright/test';
import { testivai } from '@testivai/witness-playwright';

test('homepage looks correct', async ({ page }, testInfo) => {
  await page.goto('http://localhost:3000');
  await testivai.witness(page, testInfo, 'homepage');
});
```

```bash
# 5. Run
npx playwright test
```

**First run:** baselines are written to `.testivai/baselines/`.
**Later runs:** screenshots are diffed and a self-contained HTML report is written to `./visual-report/`.

## What you get out of the box (free, no account)

- ✅ Full-page screenshot capture via Playwright
- ✅ Local pixel diff with configurable threshold
- ✅ Self-contained HTML report (`visual-report/index.html`)
- ✅ Machine-readable results (`visual-report/results.json`)
- ✅ Committed baselines under `.testivai/baselines/` (just `git add` them)

## Optional: Cloud Mode

Set `TESTIVAI_API_KEY` in your shell to opt into the [hosted TestivAI service](https://testiv.ai), which adds:
- AI-powered change analysis (REVEAL Engine™)
- Hosted dashboard, team workflow, PR-based approvals
- Smart Baseline approval flow

Cloud mode is **opt-in**. The SDKs work entirely locally without it.

## Real-World Example

A complete consumer application using the OSS lane lives at [`testivai-demo-app`](https://github.com/mcbuddy/testivai-demo-app) under `tests-oss/` and `playwright.oss.config.ts`. It runs against the published packages on every commit.

## Repository Layout

```
packages/
  common/      @testivai/common
  witness/     @testivai/witness
  playwright/  @testivai/witness-playwright
action/        GitHub Action for PR comments
examples/      framework-specific minimal examples
docs/          public documentation (Markdown)
e2e/           OSS smoke E2E
```

## Development

```bash
# Prereqs: Node 20+, pnpm 10+
pnpm install
pnpm build       # tsc all 3 packages
pnpm test        # 199 unit tests
pnpm e2e         # smoke E2E
pnpm pack:dry    # validate publish artifacts
```

## Contributing

Bug reports, feature requests, and PRs welcome. Please see:
- [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md)
- [`.github/ISSUE_TEMPLATE/`](./.github/ISSUE_TEMPLATE/)

## Releases

Releases are published to npm under the `latest` dist-tag. See [`CUTOVER.md`](./CUTOVER.md) for the release runbook and [`.github/workflows/release.yml`](./.github/workflows/release.yml) for the release workflow.

## Attribution

This repository was extracted from the private TestivAI monorepo with a clean initial git history. Original development history is preserved internally; this public repository is the new source of truth for the SDKs going forward.

## License

MIT — see [LICENSE](./LICENSE).
