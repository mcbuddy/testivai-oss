# Changelog

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
