# Contributing to TestivAI OSS

Thanks for your interest in contributing! This repo is the public home of the TestivAI SDKs.

## Origin

This repository was extracted from the private TestivAI monorepo with a fresh git history. Going forward, **this repo is the source of truth** for:

- `@testivai/common`
- `@testivai/witness`
- `@testivai/witness-playwright`
- The TestivAI GitHub Action

## Setup

Requirements:
- Node.js 20+
- pnpm 10+

```bash
pnpm install
pnpm build
pnpm test
```

## Workflow

1. Create a topic branch from `main`
2. Make focused changes (one logical change per PR)
3. Run `pnpm build`, `pnpm test`, and `pnpm e2e` locally
4. Open a PR with a clear description and rationale

## Code Style

- TypeScript everywhere
- Follow the existing module boundaries (`common` → `witness` → `playwright`)
- Keep runtime dependencies lean; prefer adding to `common` over duplicating

## Reporting Issues

Use [GitHub Issues](https://github.com/testivai/testivai-oss/issues). Include:
- SDK package and version
- Node.js version
- Reproduction steps
- Expected vs. actual behavior

## License

By contributing, you agree your contributions are licensed under the MIT License.
