---
sidebar_position: 1
title: testivai init
---

# testivai init

Scaffolds TestivAI in your project. In a Playwright project it sets up the dedicated reporter. For other frameworks it runs the interactive setup wizard.

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

## Detection Order

`init` checks for Playwright **first**, before any prompt or framework
detection:

1. **Playwright** — if `@playwright/test` or `playwright` appears in your
   `package.json` dependencies or devDependencies, the command runs
   [the local scaffold](#playwright-projects) and exits. No prompts.
2. **`-y, --yes`** — skips the wizard, auto-detects the framework, and writes
   `testivai.config.ts` plus per-framework setup instructions.
3. Otherwise the interactive wizard runs.

## Interactive Wizard

Without flags, in a non-Playwright project, the wizard asks:

1. **Setup type** — choosing **Playwright / local** creates `.testivai/config.json`
   and `.testivai/baselines/`, adds the `.gitignore` entries, and stops there
2. **Language** — JavaScript/TypeScript, Python, Java, or Ruby
3. **Framework** — framework choices based on language
4. **Test directory** — where to place generated example files

```
? Select mode:                 › Playwright / local — visual diffs on your machine, HTML report
? Select your language:        › JavaScript / TypeScript
? Select your test framework:  › Cypress
? Where are your test files?   › cypress/e2e
```

Cancelling the wizard (Ctrl-C) prints `Setup cancelled.` and exits 0.

## Generated Files

After the language/framework path of the wizard, the following are created in
your project:

- A **helper file** (`testivai-witness.js` / `testivai_witness.py` / etc.) — the capture function wrapper
- An **example test** showing a complete working test with a `witness()` call
- `testivai.config.ts` — project configuration

Existing files are skipped and listed as `⚠ Skipped (exists)` unless `--force`
is passed.

For **Cypress**, the wizard also creates `cypress.config.js` with the required
plugin for remote debugging port injection — or, if one already exists, prints
the `setupNodeEvents` snippet for you to paste in.

## Playwright Projects

If `@playwright/test` or `playwright` is detected in your `package.json`, `testivai init` scaffolds the local reporter flow:

- Creates `.testivai/config.json` (skipped if a config already exists, unless `--force` is set)
- Creates the `.testivai/baselines/` directory
- Adds `.gitignore` entries for `.testivai/temp/` and `visual-report/`
- Prints the reporter snippet to add to `playwright.config.ts` plus a capture example

The command is idempotent — existing config is left untouched without `--force` — and always exits 0.

### `--json` Output (Playwright)

```bash
npx testivai init --json
# {"framework":"playwright","created":[".testivai/config.json",".testivai/baselines/",".gitignore"]}
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
