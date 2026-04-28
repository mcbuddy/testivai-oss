---
sidebar_position: 5
title: GitHub Integration
---

# GitHub Integration

This guide shows you how to integrate TestivAI with GitHub Actions for automated visual testing in your CI/CD pipeline.

## Prerequisites

- A TestivAI account (sign up at [dashboard.testiv.ai](https://dashboard.testiv.ai))
- A GitHub repository
- Admin access to the repository (for adding secrets)

## Step 1: Get Your API Key

1. Log in to the [TestivAI Dashboard](https://dashboard.testiv.ai)
2. Navigate to **Settings** → **API Keys**
3. Click **Generate New API Key**
4. Give it a descriptive name (e.g., "GitHub Actions")
5. Copy the API key - you won't be able to see it again

## Step 2: Add API Key to GitHub Secrets

1. In your GitHub repository, go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name it `TESTIVAI_API_KEY`
4. Paste the API key you copied
5. Click **Add secret**

:::tip Security Best Practice
Never commit your API key to your repository. Always use GitHub Secrets to keep it secure.
:::

## Step 3: Configure Your Workflow

Create a new file at `.github/workflows/testivai.yml` in your repository:

### Basic Example

```yaml
name: Visual Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  visual-tests:
    runs-on: ubuntu-latest    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install TestivAI CLI
        run: npm install -g @testivai/cli
        
      - name: Authenticate TestivAI
        run: testivai auth
        env:
          TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
          
      - name: Run visual tests
        run: testivai run "npm test"
        env:
          TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

### Framework-Specific Examples

#### Playwright

```yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: Run visual tests
  run: npx playwright test
  env:
    TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

#### Cypress

```yaml
- name: Run visual tests
  run: testivai run "cypress run --browser chrome --headless"
  env:
    TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

#### Selenium (JavaScript)

```yaml
- name: Run visual tests
  run: testivai run "npx jest tests/"
  env:
    TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

#### Selenium (Python)

```yaml
- name: Setup Python
  uses: actions/setup-python@v4
  with:
    python-version: '3.9'

- name: Install dependencies
  run: pip install -r requirements.txt

- name: Run visual tests
  run: testivai run "pytest tests/ -v"
  env:
    TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

#### Selenium (Java)

```yaml
- name: Set up JDK 17
  uses: actions/setup-java@v4
  with:
    java-version: '17'
    distribution: 'temurin'

- name: Run visual tests
  run: testivai run "mvn test"
  env:
    TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

## Step 4: Optional - Set Up Webhooks

For automatic test runs when you push changes:

1. In the TestivAI Dashboard, go to **Project Settings**
2. Find the **Webhook URL** (it looks like: `https://api.testiv.ai/webhooks/github/{project-id}`)
3. In your GitHub repository, go to **Settings** → **Webhooks**
4. Click **Add webhook**
5. Paste the webhook URL
6. Select:
   - **Content type**: `application/json`
   - **Which events would you like to trigger this webhook?**: 
     - Pushes
     - Pull requests
7. Click **Add webhook**

## Advanced Configuration

### Custom Baseline Branch

To control which branch is used for baselines:

```yaml
- name: Run visual tests
  run: |
    if [[ $GITHUB_REF == refs/heads/main ]]; then
      testivai run "npm test" --baseline main
    else
      testivai run "npm test" --baseline main
    fi
  env:
    TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

### Parallel Execution

For faster test runs with multiple shards:

```yaml
jobs:
  visual-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    
    steps:
      # ... setup steps ...
      
      - name: Run visual tests (shard ${{ matrix.shard }})
        run: npx playwright test --shard=${{ matrix.shard }}/4
        env:
          TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

### Conditional Testing

Run visual tests only on specific paths:

```yaml
- name: Detect changes
  id: changes
  uses: dorny/paths-filter@v2
  with:
    filters: |
      visual:
        - 'src/**/*.css'
        - 'src/**/*.scss'
        - 'src/components/**/*'
        - 'pages/**/*'

- name: Run visual tests
  if: steps.changes.outputs.visual == 'true'
  run: npx playwright test
  env:
    TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

## Troubleshooting

### API Key Not Working

1. Verify the secret name is exactly `TESTIVAI_API_KEY`
2. Check that the API key hasn't expired
3. Ensure the key has the correct permissions for the project

### Tests Fail in CI

1. Make sure you're running tests in headless mode
2. Check browser dependencies are installed
3. Verify the TestivAI CLI is installed globally or locally

### Permission Denied Errors

```yaml
- name: Fix permissions
  run: chmod +x node_modules/.bin/testivai
```

### Slow Test Runs

1. Use the `--parallel` flag for supported frameworks
2. Consider using GitHub Actions caching
3. Optimize your test suite to run only what's needed

## Best Practices

1. **Always use GitHub Secrets** for API keys
2. **Pin your dependencies** to ensure consistent runs
3. **Use matrix builds** for parallel execution
4. **Cache dependencies** between runs
5. **Run tests on PRs** to catch issues early
6. **Set status checks** to prevent merging failing visual tests

### Status Checks Example

```yaml
- name: Check visual test results
  run: |
    if [ $? -ne 0 ]; then
      echo "Visual tests failed!"
      echo "Check the TestivAI dashboard for details"
      exit 1
    fi
```

## Need Help?

- Check our [Troubleshooting Guide](/guides/troubleshooting)
- Visit our [Documentation](/)
- Contact support at hello@testiv.ai
