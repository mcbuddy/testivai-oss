---
sidebar_position: 4
title: Troubleshooting
---

# Troubleshooting

This guide covers common issues and solutions when using TestivAI SDKs and services.

## Table of Contents

- [SDK-Specific Issues](#sdk-specific-issues)
- [CI/CD Issues](#cicd-issues)
- [Performance Issues](#performance-issues)
- [Debug Mode](#debug-mode)

## SDK-Specific Issues

### Playwright SDK

#### Tests hanging after witness() call
- **Cause**: Promise not resolving (slow page, large capture)
- **Solution**: Check the page finishes loading; raise the test timeout for very tall pages

#### "window.testivai is not defined"
- **Cause**: TestivAI not properly imported or test.use() not configured
- **Solution**: Ensure proper setup in your config file

### Witness SDK

#### Browser debugging endpoint not found
```
❌ Browser debugging endpoint not found
```

**Solution**: Make sure Chrome is running with remote debugging:
```bash
chrome --remote-debugging-port=9222
```

#### Connection timeout
```
❌ Failed to connect to browser: Connection timeout
```

**Solution**: 
1. Check if Chrome is running
2. Verify the port number (default: 9222)
3. Check for firewall issues

### Cypress

#### "window.testivaiWitness is not a function"
- **Solution**: Ensure Witness SDK is connected before tests run
- **Add to cypress.config.js**: `chromeWebSecurity: false`

## CI/CD Issues

### GitHub Actions

#### Chrome not starting in CI
```yaml
- name: Start Chrome
  run: |
    google-chrome \
      --remote-debugging-port=9222 \
      --no-sandbox \
      --disable-dev-shm-usage \
      --headless &
```

### Jenkins

#### Environment variables not passed
No credentials are needed — TestivAI runs entirely on disk. Set the mode and
run in a single step so the environment survives:

```groovy
withEnv(['TESTIVAI_MODE=local']) {
  sh 'testivai run "npm test"'
}
```

Baselines live in `.testivai/baselines/` in the repo, so make sure the
workspace is a full checkout rather than a shallow copy that excludes them.

## Performance Issues

### Tests running slowly

1. **Use component testing** when possible
2. **Add ignore regions** for dynamic content
3. **Disable animations** during tests
4. **Reduce screenshot size** by testing specific components

See also: [Stable Baselines](./stable-baselines.md) — a guide to freezing animations, using `ignoreSelectors` modes, and tuning tolerance to eliminate flaky diffs.

### Memory usage high

- **Playwright**: Reuse browser context between tests
- **Witness SDK**: Limit concurrent snapshots
- **General**: Clear test data regularly

## Debug Mode

Enable debug logging to troubleshoot issues:

### Playwright SDK
```bash
TESTIVAI_DEBUG=true npx playwright test
```

### Witness SDK
```bash
TESTIVAI_DEBUG=true npm test
# or
testivai run "npm test" --debug
```

### What debug logs show:
Lines are prefixed with `[TestivAI]`:

- The resolved configuration (project config, per-call overrides, effective config, local mode)
- Which capture path was taken — browser full-page capture or scroll-and-stitch — and the page/viewport dimensions behind that choice
- How many element styles were captured
- DOM capture failures (which make the noise hint unavailable)

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "results.json not found" | Tests didn't run before `testivai report` | Run your test suite first (captures land in `.testivai/temp/`) |
| "Browser connection failed" | Chrome not running | Start Chrome with --remote-debugging-port |
| "Snapshot timeout" | Page loading too slow | Increase timeout or check page |

## Getting Help

1. **Check debug logs** for detailed error information
2. **Search existing issues** on [GitHub](https://github.com/mcbuddy/testivai-oss/issues)
3. **Ask in [GitHub Discussions](https://github.com/mcbuddy/testivai-oss/discussions)** for community support
4. **Email** testivai.app@gmail.com

When reporting issues, please include:
- SDK version
- Error message
- Debug logs (if available)
- Steps to reproduce
- Your test framework and version
