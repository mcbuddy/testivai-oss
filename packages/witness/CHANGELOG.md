# Changelog

## 1.3.1

### Patch Changes

- 7cb179f: `TESTIVAI_MODE=cloud|local` now overrides `.testivai/config.json` for lane selection. Repos hosting both lanes side by side (like the demo app) previously had the cloud lane silently hijacked into local mode by the OSS lane's `{ "mode": "local" }` marker file.

## 1.3.0

### Minor Changes

- 767385e: Added `--dry-run` flag to `testivai approve` that prints what would be approved without modifying files. Also changed `testivai approve --undo` (without a name) to automatically undo the last approval by finding the most recent `.previous/` backup — no longer requires an explicit snapshot name.
- 0158619: New `testivai report` command — the language-agnostic half of the adapter contract. Any Playwright binding (Python, Java, .NET, …) can capture by writing `.testivai/temp/<name>/screenshot.png` (+ `dom.html`) with its native APIs, then run `testivai report` for diffing, tolerances, the noise hint, the HTML report, and CI exit codes (`--fail-on-diff`, `--open`). This powers the new `testivai` Python package (PyPI) and the experimental Java adapter.

## 1.2.0

### Minor Changes

- d239b31: Attack the top reasons teams abandon visual testing — flaky captures and pixel-perfect strictness:

  **Stabilized captures (both adapters, on by default).** Before every screenshot: CSS animations and transitions are frozen, the text caret is hidden, smooth scrolling is forced instant, and the capture waits (bounded 3s) for web fonts to finish loading. Disable with `stabilize: false` — globally in `.testivai/config.json`, per project in `testivai.config.ts` (Playwright), or per call.

  **Human-intuitive pass criteria (`@testivai/witness`).** New `.testivai/config.json` fields:

  - `maxDiffPercent` (default 0) — diffs at or below this percentage report as passed
  - `maxDiffPixels` — absolute changed-pixel variant; either criterion passing is enough
  - `noiseAutoPass` (default false) + `noiseMaxDiffPercent` (default 1) — DOM-identical diffs (the noise hint) within the bound auto-pass instead of demanding review

  Auto-passed snapshots keep their diff image and carry `autoPassed: "threshold" | "noise"` in `results.json` (additive schema change); the HTML report labels them. Byte-different but visually identical captures (nothing above the per-pixel threshold) now report as passed instead of `changed 0.01%`.

  **WebdriverIO parity: `ignoreSelectors`.** The WebdriverIO adapter now honors `ignoreSelectors` from `.testivai/config.json` and accepts per-call `ignoreSelectors` in `witness()` options, hiding matched elements (`visibility: hidden`, layout-preserving) for the duration of the capture — matching the Playwright adapter.

- c0ac195: Zero-test-suite mode: `testivai witness <url>` captures a running app with no test framework at all — built for AI-generated and vibe-coded apps that ship without tests.

  ```bash
  npx testivai witness http://localhost:3000
  ```

  - Discovers same-origin pages by crawling the start page's links (cap with `--max-pages`), or capture exactly the routes you list via `--pages "/,/pricing"` or `pages` in `.testivai/config.json`
  - Launches its own headless Chrome (or reuses a debuggable one via `--port`); set `TESTIVAI_CHROME_PATH` to point at any Chrome/Chromium binary, including a Playwright-downloaded one
  - Full-page screenshot + DOM snapshot per page, with the same capture stabilization and `ignoreSelectors` handling as the test-suite adapters
  - Everything downstream is the standard pipeline: baselines, pixel diff with your configured tolerances, DOM noise hint, HTML report, `testivai approve`, and the GitHub Action PR flow
  - New config fields: `pages`, `maxPages`, `viewport`; new flags: `--pages`, `--max-pages`, `--viewport`

  The existing sidecar form (`testivai witness <name>` against an already-running debuggable Chrome) is unchanged.

- 6a74d40: Dogfooding fixes — found by running `testivai witness` against our own marketing site:

  **Stabilization no longer hides entry-animated content.** The injected CSS now uses near-zero durations (`animation-duration: 0.001s`, one iteration, `transition-duration: 0.001s`) instead of `animation/transition: none`, so animations **complete instantly at their final state**. Pages whose content starts at `opacity: 0` and reveals via entry animations or class transitions — most modern marketing/vibe-coded sites — render fully instead of capturing blank.

  **Standalone mode reveals scroll-triggered content.** `testivai witness <url>` now scrolls stepwise through the page (bounded) and returns to the top before capturing, so IntersectionObserver reveal-on-scroll sections actually render — without resizing the viewport, which would break `100vh` layouts.

  **The DOM diff now sees text.** Visible text nodes are tokenized (whitespace-normalized; script/style bodies stay opaque) and reported as `textChanges` in the DOM summary. Previously a wording change (`Free` → `Gratis`) read as "structurally identical" — harmless when the noise hint was only a label, but with `noiseAutoPass` enabled it silently auto-passed real text regressions. Text changes now mark the DOM as changed, never auto-pass, and appear in the HTML report, the PR comment, and MCP verdicts (`results.json` schema addition, backward compatible).

  **`ignoreSelectors` now excludes elements from the DOM snapshot too.** Ignored elements were only hidden visually; with the text-aware DOM diff, dynamic ignored content (live counters, feeds) would flag DOM changes the pixels could not show. All three capture paths now serialize the DOM with ignored elements removed — one consistent semantic: ignored means excluded from both signals.

  **Standalone capture hardening (from live-site dogfooding):** layout metrics are polled until non-zero (fresh Chrome can report 0-width before first layout), and the web-font wait is extended to 10s bounded — a fallback-font capture diffs 30%+ against a webfont baseline on real networks.

### Patch Changes

- aa66850: Fix the `testivai` CLI crashing on startup with commander 14. Commander 14 treats conflicting flags as fatal, and the CLI declared `-v` for both `--version` and `--verbose`; every invocation threw `Cannot add option '-v, --verbose'`. Version now uses the conventional `-V, --version`, leaving `-v` for `--verbose`. The startup banner also now uses local-first wording.

## 1.1.0

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

## 1.0.4

### Patch Changes

- d37a2bc: fix: properly decode PNG files before pixel diff

  The diff image in the visual report was rendering as a broken image
  because the compare engine was treating compressed PNG buffers as raw
  RGBA pixel data. Added `pngjs` to decode PNG → RGBA before diffing
  and encode the diff output back to a valid PNG file. Diff percentages
  and diff heatmap images in the HTML report now display correctly.

## 1.0.3

### Patch Changes

- 60a886f: **DOM diff noise-hint** — `@testivai/witness` now runs a lightweight DOM comparison alongside every pixel diff. When screenshots diverge but the DOM tree is structurally identical, the diff is flagged with `"noiseHint": true` in `results.json` and in the GitHub Action PR comment, signalling render-timing or anti-aliasing noise rather than a real UI change. No external dependencies added (~5 KB gzipped).

  `@testivai/witness-playwright` reporter updated to read and surface the `dom` field from `results.json` in the HTML report and via `mcbuddy/testivai-oss@v1` PR comments.

All notable changes to @testivai/witness will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Local mode support for visual regression testing without cloud
- Baseline store for local filesystem storage
- HTML report generator
- CLI commands: `init`, `run`, `approve`
- Subpath exports: `/diff`, `/baselines`, `/config`, `/report`

## [1.0.1] - 2026-03-19

### Changed

- Renamed from `@testivai/witness-cdp` to `@testivai/witness`
- Updated terminology for IP protection (CDP → browser integration)

## [1.0.0] - 2025-01-15

### Added

- Initial release
- Visual diff engine with pbd algorithm
- Screenshot capture via browser integration
- DOM structure analysis
- CSS computed styles capture
- Layout metrics capture
