# Changelog

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
