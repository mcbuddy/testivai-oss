---
sidebar_position: 1
title: REVEAL Engine
---

# REVEAL Engine™

TestivAI's proprietary REVEAL Engine™ (Regression Vision Evidence & Analysis Layer) uses intelligent multi-layer analysis to catch visual bugs while minimizing false positives. It processes each snapshot through a series of increasingly sophisticated checks, exiting early when possible to maximize speed.

---

## How It Works

The engine runs in **3 phases**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   📦 PHASE 1: Structural Check                                      │
│   Compares page structure and computed styles                       │
│                                                                     │
│   ✅ Both identical → PASSED (fast exit, no screenshots needed)     │
│   ⚠️  Any difference → Continue to Phase 2                          │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   👁️ PHASE 2: Visual Check                                          │
│   Compares element positions AND screenshots pixel-by-pixel         │
│                                                                     │
│   ✅ Layout clean AND 0 pixel differences → PASSED                  │
│   ⚠️  Layout OR Perceptual has diff → Continue to Phase 3           │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   🤖 PHASE 3: AI Analysis                                           │
│   AI analyzes the visual changes                                    │
│                                                                     │
│   ✅ AI says: "Trivial/Intentional" → PASSED                        │
│   🟠 AI says: "Potential Bug" → UI_CHANGE_DETECTED                  │
│   🟠 AI unavailable/timeout → UI_CHANGE_DETECTED                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Analysis Layers

### Structure Analysis
Compares the HTML structure of your page — element hierarchy, text content, interactive elements, and element counts.

**Catches:** Missing or extra elements, changed text, removed buttons or links.

### Styles Analysis
Compares computed visual styling — colors, typography, dimensions, borders, shadows, opacity, and visibility.

**Catches:** Color changes, font modifications, spacing adjustments.

### Layout Analysis
Compares element positions and sizes — X/Y coordinates, width/height, and relative positioning.

Layout is a **gate**: differences trigger AI Analysis even if screenshots look identical, catching layout shifts early.

### Perceptual Analysis
Compares screenshots pixel-by-pixel and generates a diff heatmap.

Perceptual is a **gate** alongside Layout — both must be clean for the test to pass without AI review.

### AI Analysis
Uses Google's Gemini AI to classify visual changes as **Trivial**, **Intentional**, or **Potential Bug**.

Only called when Layout or Perceptual detects differences — keeps costs low while providing intelligent analysis when needed.

---

## Decision Flow

| Structure | Styles | Layout | Perceptual | AI | Result |
|-----------|--------|--------|------------|-----|--------|
| ✅ | ✅ | — | — | — | **PASSED** |
| ❌ | ✅ | ✅ | ✅ | — | **PASSED** |
| ✅ | ❌ | ✅ | ✅ | — | **PASSED** |
| * | * | ❌ | * | PASS | **PASSED** |
| * | * | ❌ | * | FAIL | **UI_CHANGE_DETECTED** |
| * | * | * | ❌ | PASS | **PASSED** |
| * | * | * | ❌ | FAIL | **UI_CHANGE_DETECTED** |

**Legend:** ✅ Identical, ❌ Different, — Not checked, * Any

---

## Performance

- **Fast Exit**: If Structure and Styles are both identical, no screenshots are compared (~95% time saved)
- **Parallel Processing**: All data downloaded simultaneously (~50-60% faster)
- **Smart Caching**: Baseline files cached in memory with 24-hour TTL (~90% fewer downloads)

| Metric | REVEAL Engine | Competitors |
|--------|-------------------|-------------|
| **Speed** | 1-4 seconds | 10-30 seconds |
| **Accuracy** | 95% | ~85% |
| **AI Usage** | Only when needed | Always on |

---

## Configuration

- **Pixel threshold** (0.0–1.0): Percentage of pixels that must differ
- **Layout tolerance**: `strict` (1px), `balanced` (3px), `lenient` (5px)
- **Protected branches**: Branches that trigger smart baseline flow

→ **[Learn about baselines](/concepts/baselines)**
→ **[Learn about test statuses](/concepts/test-statuses)**
