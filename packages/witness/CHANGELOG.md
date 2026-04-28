# Changelog

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
