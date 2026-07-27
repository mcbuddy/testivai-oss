---
sidebar_position: 1
title: testivai init
---

# testivai init

Scaffolds TestivAI in your project. In a Playwright project it sets up local mode with the dedicated reporter. For other frameworks it runs the interactive setup wizard.

## Usage

```bash
npx testivai init [options]
```

## Options

| Flag | Description |
|---|---|
| `-f, --force` | Overwrite existing files (including `.testivai/config.json`) |
| `-y, --yes` | Skip prompts and auto-detect framework (non-Playwright projects) |
| `--json` | Print a machine-readable result to stdout (Playwright projects) |

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

## Playwright Projects

If `@playwright/test` or `playwright` is detected in your `package.json`, `testivai init` scaffolds the local reporter flow:

- Creates `.testivai/config.json` with `mode: "local"` (skipped if a config already exists, unless `--force` is set)
- Creates the `.testivai/baselines/` directory
- Adds `.gitignore` entries for `.testivai/temp/` and `visual-report/`
- Prints the reporter snippet to add to `playwright.config.ts` plus a capture example

The command is idempotent — existing config is left untouched without `--force` — and always exits 0.

### `--json` Output (Playwright)

```bash
npx testivai init --json
# {"framework":"playwright","mode":"local","created":[".testivai/config.json",".testivai/baselines/",".gitignore"]}
```

### What You See

```
✓ TestivAI is set up for Playwright (local mode).
✓ .testivai/config.json
✓ .testivai/baselines/
✓ .gitignore

1. Add the reporter to playwright.config.ts:
    reporter: [['list'], ['@testivai/witness-playwright/reporter']],

2. Capture a snapshot in a test:
    import { witness } from '@testivai/witness-playwright';
    await witness(page, testInfo, 'homepage');

3. Run, review, approve:
    npx playwright test
    open visual-report/index.html
    npx testivai approve --all   # then commit .testivai/baselines/
```
