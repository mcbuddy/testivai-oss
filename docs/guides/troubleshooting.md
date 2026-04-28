---
sidebar_position: 4
title: Troubleshooting
---

# Troubleshooting

This guide covers common issues and solutions when using TestivAI SDKs and services.

## Table of Contents

- [Authentication Issues](#authentication-issues)
- [SDK-Specific Issues](#sdk-specific-issues)
- [CI/CD Issues](#cicd-issues)
- [Performance Issues](#performance-issues)
- [Network Issues](#network-issues)
- [Debug Mode](#debug-mode)

## Authentication Issues

### API Key Not Found / Invalid API Key

**Symptoms**: 
- "Invalid API key" error
- "API key not found" error
- Authentication failing even after running `testivai auth`

**Cause**: The `testivai auth` command validates your key but doesn't export it to your current shell session. Your test runner reads from the `TESTIVAI_API_KEY` environment variable.

**Solutions**:

1. **Export to current shell session**:
   ```bash
   export TESTIVAI_API_KEY=your-actual-api-key-here
   ```

2. **Add to shell profile** (permanent — recommended for local dev):
   ```bash
   # For zsh (macOS default)
   echo 'export TESTIVAI_API_KEY=your-actual-api-key-here' >> ~/.zshrc
   source ~/.zshrc
   
   # For bash
   echo 'export TESTIVAI_API_KEY=your-actual-api-key-here' >> ~/.bashrc
   source ~/.bashrc
   ```

3. **In CI/CD**: Set as environment variable in your pipeline:
   ```yaml
   # GitHub Actions
   env:
     TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
   ```

:::warning Do not use .env files
TestivAI SDKs read **only from shell environment variables** (`process.env`). The SDKs do not use `dotenv` or load `.env` files. Always use `export` in your shell or set variables in your CI provider's secrets.
:::

### API Key Expired

**Symptoms**: Authentication was working but suddenly stopped

**Solution**: 
1. Check your API key in the [dashboard](https://dashboard.testiv.ai)
2. Generate a new key if needed
3. Update your environment variable

## SDK-Specific Issues

### Playwright SDK

#### Tests hanging after witness() call
- **Cause**: Promise not resolving due to network issues
- **Solution**: Check network connectivity and API key validity

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

#### API key not available
```yaml
- name: Authenticate
  env:
    TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
  run: testivai auth $TESTIVAI_API_KEY
```

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

### Memory usage high

- **Playwright**: Reuse browser context between tests
- **Witness SDK**: Limit concurrent snapshots
- **General**: Clear test data regularly

## Network Issues

### Upload timeouts

**Symptoms**: Captures succeed but upload fails

**Solutions**:
1. Check internet connection
2. Verify API key is valid
3. Try reducing batch size
4. Check if TestivAI service is operational

### Proxy issues

If behind a corporate proxy:
```bash
# Set proxy environment variables
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
```

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
| "Invalid API key" | API key not set or invalid | Export TESTIVAI_API_KEY |
| "Project not found" | Wrong project ID | Check dashboard for correct ID |
| "Batch creation failed" | Network or auth issue | Check API key and connection |
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
