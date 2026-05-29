# Changelog

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
