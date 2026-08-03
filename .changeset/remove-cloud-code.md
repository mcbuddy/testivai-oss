---
"@testivai/witness": major
"@testivai/witness-playwright": major
"@testivai/witness-webdriverio": minor
---

Remove the retired cloud/hosted-service code paths. TestivAI is local-only; every capture now produces full evidence (screenshot, DOM snapshot, computed-style digest, element map) unconditionally.

BREAKING (`@testivai/witness`):

- The `testivai auth` CLI command is removed. There is no account and no API key.
- `mode` is removed from `.testivai/config.json` (`LocalConfig`). Existing configs that still carry it load fine — the field is ignored.
- Removed exports: `authCommand`, `isLocalMode`, and the `@testivai/common` re-exports (`CoreApiClient`, `DEFAULT_CORE_API_URL`, `saveCredentials`, `loadCredentials`, `deleteCredentials`, `getApiKey`, `isAuthenticated`, `findConfigFile`, `loadConfig`, `configExists`, `getOutputDir`, `CompressionHelper`, `compressionHelper`).
- Removed types: `GitInfo`, `BrowserInfo`, `BatchPayload`, `CiInfoPayload`, `BatchResult`, `PerformanceTimings`, `LighthouseResults`.
- `testivai run` no longer takes `--batch-id` and never contacts a server.
- The `@testivai/common` package is retired; nothing depends on it anymore.

BREAKING (`@testivai/witness-playwright`):

- `TESTIVAI_API_KEY`, `TESTIVAI_API_URL`, and `TESTIVAI_MODE` no longer affect the adapter. Previously a stray API key silently switched the reporter into a cloud-upload path that skipped DOM/style capture and report generation.
- Reporter options `apiUrl`, `apiKey`, and `compression` are removed (`debug` and `captureOnly` remain).
- `TestivAIConfig` is reduced to the options the local pipeline consumes: `useBrowserCapture`, `ignoreSelectors`, `stabilize`, `mask`. The cloud-analysis knobs (`layout`, `ai`, `structure`, `performanceMetrics`, `selectors`, `environments`, plus `apiKey`/`apiUrl` in `testivai.config.ts`) are removed and were ignored locally.
- Removed exports: `testivai.ci` and the `StructureAnalysis`/`StructureAnalysisConfig` types.
- Runtime dependencies dropped: `axios`, `cross-fetch`, `simple-git`, `chalk`, `commander`, `@testivai/common`.

`@testivai/witness-webdriverio`:

- The service now generates the report unconditionally in `onComplete`. Previously a project without `.testivai/config.json` (or with a legacy `mode: "cloud"` value) got no report at all and a "Cloud mode is not yet supported" log line. Zero-config projects now work like the other adapters.

Also fixes a latent bug: DOM snapshots larger than 5 MB were gzip-compressed and then stored as a UTF-8 string, corrupting the stored HTML. The compression step (an upload optimization) is gone.
