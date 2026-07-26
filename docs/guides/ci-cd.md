---
sidebar_position: 1
title: CI/CD Integration
---

# CI/CD Integration

Run TestivAI visual tests automatically on every push and pull request — fully local, no account, no API key, no external services. TestivAI auto-detects your CI environment and attaches metadata (provider, PR number, run URL) to each report.

---

## The CI Gate

The core setup: capture, diff, and gate on visual changes. Baselines are committed to git; a changed snapshot fails the gate; the reviewer downloads the report artifact, inspects the diff, and approves locally.

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
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - run: npx playwright install chromium --with-deps

      - run: npm run build

      - run: npm test

      - name: Visual diff gate
        run: npx testivai report --fail-on-diff

      - name: Upload visual report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-report
          path: visual-report/
```

Baselines live in `.testivai/baselines/` — commit them to git (`git add .testivai/baselines/`).

### How the gate works

Baselines are committed to the repository. When a PR changes the rendering, the Playwright test run captures new screenshots into `.testivai/temp/`, and `npx testivai report --fail-on-diff` compares them against the committed baselines. Any snapshot with a pixel diff exits non-zero, failing the CI job — exit `1` for changed snapshots, exit `2` for new-only (add `--allow-new` on first runs). See the [`testivai report` reference](../cli/report.md) for the full exit-code contract and `--json` output.

The reviewer downloads the `visual-report` workflow artifact from the failed run, opens `index.html` to inspect the side-by-side diffs, and decides whether the changes are intentional. To accept, re-run the tests locally, approve with `npx testivai approve --all` (or commit the updated baselines directly), and push — the next CI run passes.

> For a richer PR workflow with inline diff comments and `/testivai approve` commands, see the **[GitHub Action](/github-action)**.

---

## Baselines belong to the environment that compares them

Font rasterization differs between macOS, Windows, and Linux, so a baseline captured on your laptop will report diffs on a Linux CI runner every time. If CI is where comparisons happen, adopt CI's own captures as baselines: the [GitHub Action](/github-action) bundles every changed capture into the artifact as `visual-report/pending-baselines/`, and a `/testivai approve` PR comment commits them back to the branch.

---

## Advanced: Matrix Testing

Run visual tests across multiple browsers:

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

      - name: Visual diff gate
        run: npx testivai report --fail-on-diff
```

> Snapshot names should include the browser (e.g. `homepage-${browserName}`) so matrix runs don't overwrite each other's baselines.

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
```

---

## Other CI Providers

The same recipe works anywhere Node and a browser run — no provider configuration needed:

### GitLab CI

```yaml title=".gitlab-ci.yml"
visual-tests:
  image: mcr.microsoft.com/playwright:v1.48.0-noble
  stage: test
  script:
    - npm ci
    - npx playwright test
    - npx testivai report --fail-on-diff
  artifacts:
    when: on_failure
    paths:
      - visual-report/
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
      - run: npx playwright test
      - run:
          name: Visual diff gate
          command: npx testivai report --fail-on-diff
      - store_artifacts:
          path: visual-report
```

### Jenkins

```groovy title="Jenkinsfile"
pipeline {
    agent any
    stages {
        stage('Visual Tests') {
            steps {
                sh 'npm ci'
                sh 'npx playwright install --with-deps chromium'
                sh 'npx playwright test'
                sh 'npx testivai report --fail-on-diff'
            }
        }
    }
    post {
        failure {
            archiveArtifacts artifacts: 'visual-report/**'
        }
    }
}
```

---

## Next Steps

- **[GitHub Action](/github-action)** — PR comments, commit statuses, and `/testivai approve`
- **[`testivai report`](../cli/report.md)** — exit codes and `--json` for scripting the gate
- **[Troubleshooting](/guides/troubleshooting)** — common CI issues and solutions
