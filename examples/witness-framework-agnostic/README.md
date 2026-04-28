# Example: Witness CLI (Framework-Agnostic)

Demonstrates using `@testivai/witness` directly via its CLI for any framework that controls Chrome (Cypress, Selenium, WebdriverIO, Puppeteer, pytest, etc.).

## Setup

```bash
pnpm install
pnpm --filter @testivai-oss/example-witness-cli run init
```

Then in your existing test framework, call the witness helper produced by `init`. See the [frameworks docs](../../docs/frameworks/overview.md) for per-framework adapters.

## Common Commands

```bash
# Run your tests with witness wrapping
testivai run "<your test command>"

# Approve a baseline
testivai approve <name>
```
