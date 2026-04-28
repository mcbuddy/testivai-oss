# @testivai/common

Shared utilities for TestivAI SDKs and CLI.

This package is part of [testivai-oss](https://github.com/testivai/testivai-oss). It is typically consumed transitively via `@testivai/witness` or `@testivai/witness-playwright` — you don't usually need to install it directly.

## Exports

- `CoreApiClient`, `DEFAULT_CORE_API_URL` — optional cloud API client
- `getApiKey`, `saveCredentials`, `loadCredentials`, `deleteCredentials`, `isAuthenticated` — credential helpers
- `loadConfig`, `findConfigFile`, `configExists`, `getOutputDir`, `DEFAULT_CONFIG` — config loader
- `CompressionHelper`, `compressionHelper` — GZIP helpers
- `testivai`, `witness` — optional Playwright helper (requires `playwright` peer dependency)

## Installation

```bash
npm install @testivai/common
```

## License

MIT
