# TestivAI OSS Documentation

Welcome to the open-source documentation for the TestivAI SDKs.

This documentation covers the **local-first, free, open-source** workflow:
- Capture screenshots locally with `@testivai/witness` (CLI + library)
- Compare against locally stored baselines under `.testivai/baselines/`
- Generate a self-contained HTML report under `./visual-report/`
- Optionally upgrade to the [TestivAI cloud service](https://testiv.ai) for AI-powered analysis and a hosted dashboard

## Quick Links

- **[Getting Started](./intro.md)** — install + first capture
- **[How It Works](./how-it-works.md)** — high-level architecture
- **[Frameworks](./frameworks/overview.md)** — Playwright, Cypress, Selenium, WebdriverIO, etc.
- **[CLI Reference](./cli/init.md)** — `init`, `run`, `capture`, `auth`
- **[Concepts](./concepts/baselines.md)** — baselines, statuses, REVEAL Engine, performance metrics
- **[Guides](./guides/ci-cd.md)** — CI/CD, GitHub integration, troubleshooting

## Local-First vs Cloud Mode

| Capability | Local Mode (OSS) | Cloud Mode (optional) |
|---|---|---|
| Capture screenshots & structure | ✅ | ✅ |
| Local pixel diff & ignore regions | ✅ | ✅ |
| Local HTML report | ✅ | ✅ |
| Baseline approval CLI | ✅ | ✅ |
| AI-powered analysis (Gemini) | — | ✅ |
| Hosted dashboard & team workflow | — | ✅ |
| Smart Baseline approval flow | — | ✅ |

Sections that mention `TESTIVAI_API_KEY`, the dashboard, or the REVEAL Engine cloud pipeline apply to **Cloud Mode** and are optional. The local OSS workflow does not require an account.

## Source of Truth

The canonical OSS docs live in this repo at [`/docs`](https://github.com/mcbuddy/testivai-oss/tree/main/docs). Issues and contributions are welcome via [GitHub Issues](https://github.com/mcbuddy/testivai-oss/issues).
