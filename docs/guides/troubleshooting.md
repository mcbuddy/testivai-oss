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
```groovy
withCredentials([string(credentialsId: 'testivai-api-key', variable: 'API_KEY')]) {
  sh 'export TESTIVAI_API_KEY=$API_KEY'
  sh 'testivai run "npm test"'
}
```

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
DEBUG=testivai:* npx playwright test
```

### Witness SDK
```bash
DEBUG=testivai:* npm test
# or
testivai run "npm test" --debug
```

### What debug logs show:
- API requests and responses
- Capture progress
- Network errors
- Performance metrics

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "results.json not found" | Tests didn't run before `testivai report` | Run your test suite first (captures land in `.testivai/temp/`) |
| "Browser connection failed" | Chrome not running | Start Chrome with --remote-debugging-port |
| "Snapshot timeout" | Page loading too slow | Increase timeout or check page |

## Getting Help

1. **Check debug logs** for detailed error information
2. **Search existing issues** on [GitHub](https://github.com/testivai/testivai-monorepo/issues)
3. **Join our Discord** for community support
4. **Email support** at hello@testiv.ai

When reporting issues, please include:
- SDK version
- Error message
- Debug logs (if available)
- Steps to reproduce
- Your test framework and version
