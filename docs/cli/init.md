---
sidebar_position: 1
title: testivai init
---

# testivai init

Runs the interactive setup wizard that generates helper files and example tests for your framework.

## Usage

```bash
npx testivai init [options]
```

## Options

| Flag | Description |
|---|---|
| `-f, --force` | Overwrite existing files |
| `-y, --yes` | Skip prompts and auto-detect framework |

## Interactive Wizard

Without flags, the wizard asks:

1. **Language** — JavaScript/TypeScript, Python, Java, or Ruby
2. **Framework** — framework choices based on language
3. **Test directory** — where to place generated example files

```
? Select your language:        › JavaScript / TypeScript
? Select your test framework:  › Cypress
? Where are your test files?   › cypress/e2e
```

## Generated Files

After running `init`, the following files are created in your project:

- A **helper file** (`testivai-witness.js` / `testivai_witness.py` / etc.) — the capture function wrapper
- An **example test** showing a complete working test with a `witness()` call
- `testivai.config.ts` — project configuration with your API key placeholder

For **Cypress**, the wizard also detects or creates `cypress.config.js` with the required plugin for remote debugging port injection.

## Playwright Detection

If `@playwright/test` is detected in your `package.json`, `testivai init` exits early and directs you to the dedicated Playwright SDK:

```bash
npm install @testivai/witness-playwright
```
