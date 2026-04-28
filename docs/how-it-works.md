---
sidebar_position: 2
title: How It Works
---

# How It Works

TestivAI integrates seamlessly with your existing test framework through a simple function call. No complex dependencies required.

---

## Simple Integration

```
// In your test
testivaiWitness('homepage-test')

// That's it! TestivAI handles the rest
```

TestivAI captures visual snapshots and analyzes them for regressions, all without modifying your test logic.

---

## Framework Support

TestivAI works with all major test frameworks:

- Cypress
- Playwright
- Selenium
- WebdriverIO
- Puppeteer
- And more...

No framework lock-in - use what works for your team.

---

## REVEAL Engine™

TestivAI's proprietary REVEAL Engine uses intelligent multi-layer analysis to catch visual bugs while minimizing false positives:

### Non-AI Analysis (Fast & Deterministic)
- **Structural checks** — detects missing or broken elements instantly
- **Visual comparison** — catches style, layout, and positioning regressions
- **Perceptual analysis** — filters out meaningless visual noise like anti-aliasing

### AI-Assisted Analysis (Smart & Context-Aware)
- **Intelligent change analysis** — explains if changes are bugs or expected updates
- **Plain English reasoning** — provides human-readable explanations for every flagged change

This multi-layer approach ensures only meaningful visual changes are flagged for review.

---

## Chrome Setup

Chrome must start with `--remote-debugging-port=9222`. The `testivai init` wizard adds this automatically for supported frameworks:

- **Cypress**: Injects via `cypress.config.js` `setupNodeEvents` plugin
- **Selenium**: Adds `ChromeOptions` arg in the generated helper file
- **WebdriverIO**: Documents the `goog:chromeOptions` config
- **Puppeteer**: Adds `--remote-debugging-port=9222` to `puppeteer.launch()` args

---

## Baseline Management

```
First test run    → Creates NEW_BASELINE
Future runs       → Compared against baseline:
   No changes     → Test passes
   Changes found  → Analyzed for impact
   Needs review   → Flagged for your attention
```

The first time a test runs, it gets a **NEW_BASELINE** status (🆕) and becomes the reference point for future comparisons. This ensures accurate tracking from the very beginning.

→ **[Learn more about baselines and the approval flow](/concepts/baselines)**
→ **[Learn about all test statuses](/concepts/test-statuses)**
