---
sidebar_position: 4
title: vs. rolling your own (Selenium)
---

# TestivAI vs. hand-rolled Selenium screenshot testing

Unlike Playwright, **Selenium ships no visual comparison at all.**
`driver.save_screenshot()` / `getScreenshotAs()` writes a PNG and stops there.
So the honest comparison isn't against a built-in feature — it's against the
200 lines almost every Selenium team ends up writing themselves.

## What everyone builds

The DIY version is genuinely reasonable, and it usually looks like this:

```python
# the shape of it, in every language
driver.save_screenshot("current.png")
baseline = Image.open("baselines/home.png")
current  = Image.open("current.png")
diff     = ImageChops.difference(baseline, current)
assert diff.getbbox() is None      # ...and then the questions start
```

Then the real work arrives:

- Byte equality fails on the first anti-aliasing difference, so you need a
  tolerance — and now you're picking a threshold with no way to tell a real
  change from render jitter.
- Baselines need a home, a naming scheme, and a per-OS story (a macOS baseline
  will not match a Linux CI runner, ever).
- Updating a baseline means copying files by hand, and the person who does it is
  usually the same person whose change caused the diff.
- CI needs the diff image *somewhere a reviewer can see it*.

Common escapes: **AShot** (Java, capture + comparison, widely used but no longer
actively maintained), **capybara-screenshot-diff** (Ruby),
**pytest-image-diff** / needle (Python), or a paid service like Applitools,
Percy, or Sauce Visual.

**If you have a working DIY setup covering a handful of pages and it doesn't
annoy you, keep it.** The diff is the easy part. TestivAI is the rest of it,
already built.

---

## What you get with the Selenium adapters

Verified against the adapter source, not aspirational:

| | |
|---|---|
| **Pixel diff + heatmap** | Difference magnitude rendered as a yellow→red heatmap over a washed baseline, with changed regions outlined. |
| **DOM capture** | The page's DOM is captured next to the screenshot, so the report can tell you *pixels differ but the DOM is identical* (render noise) from *the DOM actually changed* — with added / removed / attribute / text counts. |
| **Full-page screenshots** | Chromium via CDP `captureBeyondViewport`; Firefox natively (Python). Other browsers fall back to viewport — documented, not silent. |
| **Stabilization** | Animations and transitions collapsed, caret hidden, web fonts awaited before capture. |
| **Masks & ignored selectors** | Exclude dynamic areas; masked regions are hatched in the diff and listed in the report, so nothing hides silently. |
| **Baseline workflow** | `.testivai/baselines/` in your repo, `npx testivai approve` locally, or `/testivai approve` on a PR with the commenter's write access verified. |
| **Missing-baseline detection** | A baseline that received no capture is reported and exits `3` by default — a deleted test can't quietly stop guarding its page. |
| **One report across languages** | The JS, Python, and Java Selenium adapters write the same on-disk layout as the Playwright and WebdriverIO adapters. A mixed suite produces one baseline set and one report. |
| **Agent-readable** | `visual-report/results.json` plus [`@testivai/mcp`](./guides/ai-agents.md) for any MCP client. |

---

## What you don't get (yet)

Being precise, because these are advertised elsewhere and **they are Playwright-only
today**. The Selenium adapters capture the screenshot and the DOM, but not the
element map (selectors, bounding boxes, computed styles) that these features
require:

| Feature | Selenium | Why |
|---|---|---|
| Region → selector attribution | ❌ | Needs the element map; regions are reported as bounding boxes only |
| Style-only-change verdict | ❌ | `styleCheck` reports `unavailable` without computed-style digests |
| Page-shift detection / `shiftTolerance` | ❌ | Shift classification compares element boxes across runs |

Nothing degrades or errors — the report simply shows the pixel and DOM layers.
But if the selector-level *"style-only change on `button.cta`"* verdict is the
reason you're here, the Playwright adapter is where it lives today.

There's no technical blocker: the same `executeScript` call the adapters already
use for DOM capture could build an element map. It isn't implemented yet.

**Maturity, plainly:** `@testivai/witness-selenium` is `0.1.10`, the Python
package is `0.1.0`, and the Java artifact is `0.1.0-SNAPSHOT` and
[not yet on Maven Central](./frameworks/java.md). The Playwright adapter is
`1.7.x` and considerably more exercised. Treat the Selenium lane as early — it
works and is tested, but it hasn't been through as many real suites.

---

## Side by side

| | Hand-rolled | AShot / image-diff libs | TestivAI |
|---|---|---|---|
| Pixel diff | ✅ you write it | ✅ | ✅ |
| Diff image for review | you build it | ✅ | ✅ heatmap + regions |
| Tolerance / threshold | you tune it | ✅ | ✅ + auto-pass rules |
| Noise vs. real change | ❌ | ❌ | ✅ via DOM diff |
| Text-change detection | ❌ | ❌ | ✅ |
| Baseline store + approval flow | you build it | ❌ | ✅ CLI + PR command |
| Missing-baseline detection | ❌ | ❌ | ✅ (exit 3) |
| Per-OS baselines | you build it | you build it | ✅ `{platform}` token |
| Shared with other frameworks | ❌ | ❌ | ✅ |
| Machine-readable output | ❌ | ❌ | ✅ `results.json` + MCP |
| Selector attribution / style verdict | ❌ | ❌ | Playwright only today |
| Cost | your time | free | free (MIT) |

---

## Choosing

**Stay hand-rolled if** you have a few screenshots, the diffs are rare, and a
human comparing two PNGs is a fine review process. That is a real, defensible
setup and you shouldn't replace it out of tidiness.

**Reach for TestivAI when** you're re-approving noise you can't distinguish from
regressions, when baseline updates need review by someone other than the author,
when a Linux CI runner disagrees with every laptop baseline, or when you're
maintaining the same 200 lines in two languages because your suite is part Java
and part Python.

→ [Selenium quickstart](./frameworks/selenium.md) ·
[Python](./frameworks/python.md) · [Java](./frameworks/java.md) ·
[Playwright comparison](./vs-playwright-builtin.md)
