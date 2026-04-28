---
sidebar_position: 1
title: CI/CD Integration
---

# CI/CD Integration

Run TestivAI visual tests automatically on every push and pull request. TestivAI auto-detects your CI environment and attaches metadata (provider, PR number, run URL) to each batch — no extra configuration needed.

---

## GitHub Actions

### Playwright SDK

This is the recommended setup for Playwright projects. It uses the dedicated `@testivai/witness-playwright` SDK.

```yaml title=".github/workflows/visual-tests.yml"
name: Visual Regression Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run visual regression tests
        run: npx playwright test
        env:
          TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

### Witness SDK (Cypress, Selenium, WebdriverIO, etc.)

For all other frameworks, use the `@testivai/witness` CLI wrapper.

```yaml title=".github/workflows/visual-tests.yml"
name: Visual Regression Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install TestivAI CLI
        run: npm install -g @testivai/witness

      - name: Run visual regression tests
        run: testivai run "npx cypress run --browser chrome --headless"
        env:
          TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

:::tip Replace the test command
Swap the Cypress command for your framework's equivalent:
- **Selenium (pytest)**: `testivai run "pytest tests/ -v"`
- **Selenium (JUnit)**: `testivai run "mvn test"`
- **WebdriverIO**: `testivai run "npx wdio run wdio.conf.js"`
- **Puppeteer**: `testivai run "npx jest --testPathPattern=visual"`
:::

### Setting Up the `TESTIVAI_API_KEY` Secret

1. Go to the [TestivAI Dashboard](https://dashboard.testiv.ai) and copy your project API key
2. In your GitHub repo, go to **Settings → Secrets and variables → Actions**
3. Click **New repository secret**
4. Name: `TESTIVAI_API_KEY`
5. Value: paste your API key
6. Click **Add secret**

---

## What Gets Captured Automatically in CI

TestivAI SDKs auto-detect GitHub Actions and attach the following metadata to every batch:

| Field | Source | Example |
|-------|--------|---------|
| `provider` | `GITHUB_ACTIONS` env var | `github_actions` |
| `buildId` | `GITHUB_RUN_ID` | `8734562910` |
| `runUrl` | Computed from `GITHUB_SERVER_URL`, `GITHUB_REPOSITORY`, `GITHUB_RUN_ID` | `https://github.com/owner/repo/actions/runs/8734562910` |
| `prNumber` | `GITHUB_EVENT_NUMBER` (on `pull_request` events) | `42` |

This metadata is displayed on the batch detail page in the dashboard and is used by the [GitHub Integration](/guides/github-integration) to post commit statuses and PR comments.

**You don't need to configure any of this** — it's automatic when running in a supported CI environment.

---

## Advanced: Matrix Testing

Run visual tests across multiple browsers or viewports:

```yaml title=".github/workflows/visual-matrix.yml"
name: Visual Regression Matrix

on:
  pull_request:
    branches: [main]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps ${{ matrix.browser }}

      - name: Run visual tests (${{ matrix.browser }})
        run: npx playwright test --project=${{ matrix.browser }}
        env:
          TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

---

## Advanced: Only Run on Visual Changes

Skip visual tests when no UI code changed:

```yaml
      - name: Check for visual changes
        uses: dorny/paths-filter@v3
        id: changes
        with:
          filters: |
            visual:
              - 'src/**/*.{tsx,jsx,css,scss}'
              - 'public/**'

      - name: Run visual tests
        if: steps.changes.outputs.visual == 'true'
        run: npx playwright test
        env:
          TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

---

## Other CI Providers

TestivAI auto-detects these providers — no SDK configuration needed:

### GitLab CI

```yaml title=".gitlab-ci.yml"
visual-tests:
  image: mcr.microsoft.com/playwright:v1.48.0-noble
  stage: test
  script:
    - npm ci
    - npx playwright test
  variables:
    TESTIVAI_API_KEY: $TESTIVAI_API_KEY
```

### CircleCI

```yaml title=".circleci/config.yml"
version: 2.1
jobs:
  visual-tests:
    docker:
      - image: mcr.microsoft.com/playwright:v1.48.0-noble
    steps:
      - checkout
      - run: npm ci
      - run:
          name: Run visual tests
          command: npx playwright test
          environment:
            TESTIVAI_API_KEY: $TESTIVAI_API_KEY
```

### Jenkins

```groovy title="Jenkinsfile"
pipeline {
    agent any
    environment {
        TESTIVAI_API_KEY = credentials('testivai-api-key')
    }
    stages {
        stage('Visual Tests') {
            steps {
                sh 'npm ci'
                sh 'npx playwright install --with-deps chromium'
                sh 'npx playwright test'
            }
        }
    }
}
```

---

## Next Steps

- **[GitHub Integration](/guides/github-integration)** — Post commit statuses and PR comments with test results
- **[Troubleshooting](/guides/troubleshooting)** — Common CI issues and solutions
