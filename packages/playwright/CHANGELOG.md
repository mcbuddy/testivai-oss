# Changelog

## 1.7.0

### Minor Changes

- f94048d: `witness()` is now the canonical capture call — aligning the Playwright adapter with the package family (`@testivai/witness*`) and the other adapters: `import { witness } from '@testivai/witness-playwright'`. `snapshot` and `testivai.witness` remain as fully compatible aliases; nothing breaks.

### Patch Changes

- Updated dependencies [f94048d]
- Updated dependencies [8de6c13]
  - @testivai/witness@1.11.0

## 1.6.4

### Patch Changes

- Updated dependencies [271f30d]
  - @testivai/witness@1.10.0

## 1.6.3

### Patch Changes

- Updated dependencies [381279b]
  - @testivai/witness@1.9.0

## 1.6.2

### Patch Changes

- Updated dependencies [139d28d]
- Updated dependencies [1c4c883]
  - @testivai/witness@1.8.0

## 1.6.1

### Patch Changes

- Updated dependencies [fa0deb5]
- Updated dependencies [e37eb33]
  - @testivai/witness@1.7.1

## 1.6.0

### Minor Changes

- 5bfdca5: `ignoreSelectors` now supports per-selector modes. Entries may be a bare CSS
  string (default **mask** — `visibility:hidden`, layout preserved) or an object
  `{ selector, mode }` where `mode: "collapse"` uses `display:none` to remove the
  element's layout influence entirely. Collapse fixes the flake class where a
  variable-height ignored region (e.g. a dynamic footer) shifts everything below
  it. The `string[]` shape stays fully valid; both shapes can be mixed and are
  honored from `.testivai/config.json`, `testivai.config.ts`, and per-`snapshot()`
  overrides.
- 9db57c2: Local-first is now the zero-config default. With no `TESTIVAI_API_KEY`, the Playwright reporter runs in **local mode** — capturing to `.testivai/temp/<name>/` and writing the HTML report — instead of disabling itself. The scary `API Key is not configured. Disabling reporter.` error is gone, replaced by a single quiet info line; cloud mode activates only when a key is present.

  Mode is now resolved from a shared rule (`TESTIVAI_MODE` env → `.testivai/config.json` → API-key presence) used by both the reporter and `snapshot()`, fixing a mismatch where worker processes never saw the reporter's runtime mode.

  Local mode also writes a **single canonical layout** — the flat `<timestamp>_<name>.{png,json}` duplicates are no longer emitted alongside `.testivai/temp/<name>/`.

  Restored the named `snapshot` export (`import { snapshot } from '@testivai/witness-playwright'`) as documented, kept as an alias of `testivai.witness`.

### Patch Changes

- Updated dependencies [5bfdca5]
- Updated dependencies [9db57c2]
  - @testivai/witness@1.7.0

## 1.5.2

### Patch Changes

- e885125: Element maps now honor the ignoreSelectors consistency rule: elements covered by `ignoreSelectors` (and their subtrees) are excluded from the captured element map, and `visibility: hidden` elements are skipped (invisible pixels cannot explain a diff; their children still walk since visibility is overridable). Without this, an ignored dynamic element's randomized styles could trip the style fingerprint into suppressing a legitimate noise hint — found by dogfooding in the demo app on day one.

## 1.5.1

### Patch Changes

- Updated dependencies [2168b81]
  - @testivai/witness@1.6.0

## 1.5.0

### Minor Changes

- a13563e: Element attribution + shift classification. The Playwright adapter captures an element map (`elements.json`: deterministic CSS path, rect, computed-style digest per visible element) alongside every local-mode screenshot. The comparison engine intersects diff regions with the map to name WHICH element changed, and classifies pure translations from layout — same element, same size, same style digest, new position → "shifted +8px vertically — content unchanged", with exact (dx, dy). A whole-page pass reports "everything below y=N shifted" (the injected-banner signature) as `pageShift`. All additive in results.json (regions[].elements/classification/shift, snapshot pageShift); image-only inputs and older captures degrade gracefully to plain regions. `approve` carries the element map to the baseline.

### Patch Changes

- Updated dependencies [a13563e]
  - @testivai/witness@1.5.0

## 1.4.0

### Minor Changes

- a8cbabf: Masking DSL + diff clustering. Config/per-call `mask` accepts CSS selectors (geometry captured at capture time) or geometric regions (px, 0–1 ratios, "NN%", single-edge shorthands like `{ top: 24 }`); masked areas are excluded from the pixel diff AND hatched in the diff image with a full audit trail in the report — never silent. Changed pixels are clustered into regions (`results.json` 2.2.0, additive: `regions[]`, `masks[]`, `maskWarnings[]`) with `diffRegions.minSize` / `mergeDistance` tunables; the report shows clickable region chips. Also fixes results.json's schema version field, which previously carried the package version.

### Patch Changes

- Updated dependencies [a8cbabf]
  - @testivai/witness@1.4.0

## 1.3.3

### Patch Changes

- Updated dependencies [7cb179f]
  - @testivai/witness@1.3.1

## 1.3.2

### Patch Changes

- Updated dependencies [767385e]
- Updated dependencies [0158619]
  - @testivai/witness@1.3.0

## 1.3.1

### Patch Changes

- cc6f3eb: Fix per-call `ignoreSelectors` (and `stabilize`) being dropped by the config merge. `testivai.witness(page, testInfo, 'name', { ignoreSelectors: ['.badge'] })` silently ignored the selectors — the elements were neither hidden from the screenshot nor excluded from the DOM snapshot. Long masked by the diff engine's cumulated threshold absorbing the few leaked pixels; surfaced by the text-aware DOM diff correctly flagging the leaked dynamic text.

## 1.3.0

### Minor Changes

- e98903b: Fix baseline keying collisions in multi-project / multi-capability runs.

  Previously, two Playwright projects (e.g. `chromium-desktop` and `mobile-safari`) capturing the same snapshot name silently overwrote each other's baselines under `.testivai/baselines/<name>/` — making cross-browser and responsive configs unusable.

  The variant is now folded into the snapshot name:

  - **Playwright**: when the config runs more than one project, snapshots become `<name>__<project>` (e.g. `homepage__mobile-safari`). Single-project configs are completely untouched — `homepage` stays `homepage`, and existing baselines keep working.
  - **WebdriverIO**: new per-call `variant` option — `testivai.witness(browser, 'homepage', { variant: 'firefox-mobile' })` — for multi-capability runs.

  Because the variant lives in the name, the on-disk layout, `results.json` schema, HTML report, `testivai approve`, and `/testivai approve` PR comments all work unchanged.

- d239b31: Attack the top reasons teams abandon visual testing — flaky captures and pixel-perfect strictness:

  **Stabilized captures (both adapters, on by default).** Before every screenshot: CSS animations and transitions are frozen, the text caret is hidden, smooth scrolling is forced instant, and the capture waits (bounded 3s) for web fonts to finish loading. Disable with `stabilize: false` — globally in `.testivai/config.json`, per project in `testivai.config.ts` (Playwright), or per call.

  **Human-intuitive pass criteria (`@testivai/witness`).** New `.testivai/config.json` fields:

  - `maxDiffPercent` (default 0) — diffs at or below this percentage report as passed
  - `maxDiffPixels` — absolute changed-pixel variant; either criterion passing is enough
  - `noiseAutoPass` (default false) + `noiseMaxDiffPercent` (default 1) — DOM-identical diffs (the noise hint) within the bound auto-pass instead of demanding review

  Auto-passed snapshots keep their diff image and carry `autoPassed: "threshold" | "noise"` in `results.json` (additive schema change); the HTML report labels them. Byte-different but visually identical captures (nothing above the per-pixel threshold) now report as passed instead of `changed 0.01%`.

  **WebdriverIO parity: `ignoreSelectors`.** The WebdriverIO adapter now honors `ignoreSelectors` from `.testivai/config.json` and accepts per-call `ignoreSelectors` in `witness()` options, hiding matched elements (`visibility: hidden`, layout-preserving) for the duration of the capture — matching the Playwright adapter.

- aa66850: Remove the duplicate `testivai` bin and the undocumented `./cli` subpath export from `@testivai/witness-playwright`.

  Both `@testivai/witness` and `@testivai/witness-playwright` declared a `testivai` bin, so which CLI answered `npx testivai` depended on install/hoisting order. When the playwright package's init-only CLI won, documented commands like `testivai approve --all` failed. `@testivai/witness` (a dependency of this package) is now the single owner of the `testivai` bin; its CLI provides `init`, `auth`, `run`, `witness`, and `approve`, so `npx testivai init` keeps working.

### Patch Changes

- 6a74d40: Dogfooding fixes — found by running `testivai witness` against our own marketing site:

  **Stabilization no longer hides entry-animated content.** The injected CSS now uses near-zero durations (`animation-duration: 0.001s`, one iteration, `transition-duration: 0.001s`) instead of `animation/transition: none`, so animations **complete instantly at their final state**. Pages whose content starts at `opacity: 0` and reveals via entry animations or class transitions — most modern marketing/vibe-coded sites — render fully instead of capturing blank.

  **Standalone mode reveals scroll-triggered content.** `testivai witness <url>` now scrolls stepwise through the page (bounded) and returns to the top before capturing, so IntersectionObserver reveal-on-scroll sections actually render — without resizing the viewport, which would break `100vh` layouts.

  **The DOM diff now sees text.** Visible text nodes are tokenized (whitespace-normalized; script/style bodies stay opaque) and reported as `textChanges` in the DOM summary. Previously a wording change (`Free` → `Gratis`) read as "structurally identical" — harmless when the noise hint was only a label, but with `noiseAutoPass` enabled it silently auto-passed real text regressions. Text changes now mark the DOM as changed, never auto-pass, and appear in the HTML report, the PR comment, and MCP verdicts (`results.json` schema addition, backward compatible).

  **`ignoreSelectors` now excludes elements from the DOM snapshot too.** Ignored elements were only hidden visually; with the text-aware DOM diff, dynamic ignored content (live counters, feeds) would flag DOM changes the pixels could not show. All three capture paths now serialize the DOM with ignored elements removed — one consistent semantic: ignored means excluded from both signals.

  **Standalone capture hardening (from live-site dogfooding):** layout metrics are polled until non-zero (fresh Chrome can report 0-width before first layout), and the web-font wait is extended to 10s bounded — a fallback-font capture diffs 30%+ against a webfont baseline on real networks.

- Updated dependencies [aa66850]
- Updated dependencies [d239b31]
- Updated dependencies [c0ac195]
- Updated dependencies [6a74d40]
  - @testivai/witness@1.2.0

## 1.2.1

### Patch Changes

- db80bc5: refactor: extract ignoreSelectors logic into pure testable helper module

  Move the `collectIgnoreSelectors`, `buildIgnoreSelectorsCSS`, and
  `readWitnessConfigSelectors` functions from inline code inside `snapshot.ts`
  into a dedicated `src/config/ignore-selectors.ts` module.

  No behaviour change — the logic is identical. The refactor makes the
  three-source selector merge and CSS generation unit-testable without
  a browser (26 unit tests added covering all edge cases).

## 1.2.0

### Minor Changes

- 0897932: feat: OSS noise warning in HTML report + ignoreSelectors support

  **HTML report** — adds an "OSS mode — pixel-exact" notice in the sidebar
  explaining that dynamic content may cause false positives, how to reduce
  noise (`threshold`, `ignoreSelectors`), and a pointer to TestivAI Cloud
  for AI-powered noise filtering.

  **ignoreSelectors** — new config option that hides matched CSS elements
  (via `visibility: hidden`) before the screenshot is taken, so dynamic
  content never contributes to the diff. Works in both baseline and
  candidate runs so hidden areas are always identical.

  Configure globally in `.testivai/config.json`:

  ```json
  { "ignoreSelectors": [".version-badge", "[data-testivai-ignore]"] }
  ```

  Or per-snapshot in the test:

  ```ts
  await testivai.witness(page, testInfo, "home", {
    ignoreSelectors: ["#live-chat-widget"],
  });
  ```

### Patch Changes

- Updated dependencies [0897932]
  - @testivai/witness@1.1.0

## 1.1.5

### Patch Changes

- Updated dependencies [d37a2bc]
  - @testivai/witness@1.0.4

## 1.1.4

### Patch Changes

- 60a886f: **DOM diff noise-hint** — `@testivai/witness` now runs a lightweight DOM comparison alongside every pixel diff. When screenshots diverge but the DOM tree is structurally identical, the diff is flagged with `"noiseHint": true` in `results.json` and in the GitHub Action PR comment, signalling render-timing or anti-aliasing noise rather than a real UI change. No external dependencies added (~5 KB gzipped).

  `@testivai/witness-playwright` reporter updated to read and surface the `dom` field from `results.json` in the HTML report and via `mcbuddy/testivai-oss@v1` PR comments.

- Updated dependencies [60a886f]
  - @testivai/witness@1.0.3

All notable changes to @testivai/witness-playwright will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Local mode support for visual regression testing without cloud
- Reporter detects local mode via `.testivai/config.json`
- Screenshot-only capture in local mode (skips DOM/CSS/performance)
- Integration with `@testivai/witness` for report generation

## [1.1.1] - 2026-03-19

### Changed

- Renamed from `@testivai/witness-cdp-playwright` to `@testivai/witness-playwright`
- Updated `useCDP` option to `useBrowserCapture` for IP protection

## [1.1.0] - 2026-02-28

### Added

- Unified performance metrics capture via browser Performance.getMetrics
- Integration with TestivAI Core API performance comparison service

## [1.0.0] - 2025-01-15

### Added

- Initial release
- Playwright test reporter for TestivAI
- Screenshot capture with scroll-and-stitch
- Browser integration for full-page screenshots
- DOM structure capture
- CSS computed styles capture
- Layout metrics capture
