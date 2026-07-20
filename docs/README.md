# TestivAI OSS Documentation

The public, open-source documentation for `@testivai/witness` and the framework adapters. Everything here applies to the **local-first OSS lane**: no account, no API key, no upload — capture, diff, report, approve, all on disk.

For cloud-only features (REVEAL AI counselor, dashboard, history, team approval, smart baselines, the other 11 frameworks), see [testiv.ai/docs](https://testiv.ai/docs).

## Start here

- **[Getting Started](./intro.md)** — install + first capture, 5 minutes
- **[How It Works](./how-it-works.md)** — high-level architecture
- **[Comparison: masks, regions, tolerances](./comparison.md)** — excluding dynamic areas, region-level diffs
- **[OSS vs Cloud](./oss-vs-cloud.md)** — capability matrix, where the boundary is drawn

## Frameworks (OSS adapters)

Pick the framework you use:

- **[Playwright](./frameworks/playwright.md)** — `@testivai/witness-playwright`
- **[Selenium](./frameworks/selenium.md)** — native adapters for JS, Python, and Java
- **[WebdriverIO](./frameworks/webdriverio.md)** — `@testivai/witness-webdriverio` (local mode)
- **[Python](./frameworks/python.md)** — `testivai` on PyPI (playwright-python + Selenium)
- **[Java](./frameworks/java.md)** — `ai.testiv:testivai` (playwright-java + Selenium, experimental)
- **[Other frameworks](./frameworks/cloud-only-frameworks.md)** — Cypress, Puppeteer, Robot, RSpec, Cucumber

## CLI Reference

- **[`testivai init`](./cli/init.md)** — set up local mode in your project
- **[`testivai run`](./cli/run.md)** — experimental sidecar for non-adapter frameworks (see also [sidecar caveats](./sidecar-testivai-run.md))
- **[`testivai capture`](./cli/capture.md)** — manual single-snapshot capture
- **[`testivai auth`](./cli/auth.md)** — authenticate against the cloud service (cloud lane only)

## Reference

- **[`results.json` schema + on-disk layout (Extension API)](./extension-api.md)** — the contract for community adapters and third-party reporters
- **[GitHub Action](./github-action.md)** — `mcbuddy/testivai-oss@v1` for PR comments + commit status
- **[`testivai run` experimental sidecar](./sidecar-testivai-run.md)** — what it is, why it's labeled experimental, when to use it anyway

## Guides

- **[Python (playwright-python)](./frameworks/python.md)**
- **[Java (playwright-java)](./frameworks/java.md)**
- **[AI agents & code assistants](./guides/ai-agents.md)**
- **[Vibe-coded apps (Lovable, Bolt, v0)](./guides/vibe-coded-apps.md)**
- **[CI/CD](./guides/ci-cd.md)**
- **[GitHub Integration](./guides/github-integration.md)**
- **[Headless](./guides/headless.md)**
- **[Docker](./guides/docker.md)**
- **[Troubleshooting](./guides/troubleshooting.md)**

## Source of truth

The canonical OSS docs live in this repo at [`/docs`](https://github.com/mcbuddy/testivai-oss/tree/main/docs). They sync to the public docs site automatically on each release. To propose a change, open a PR here. Issues: [GitHub Issues](https://github.com/mcbuddy/testivai-oss/issues).
