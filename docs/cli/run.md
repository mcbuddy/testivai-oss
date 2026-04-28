---
sidebar_position: 3
title: testivai run
---

# testivai run

Wraps your test command, connects to Chrome via remote debugging, and captures visual snapshots.

## Usage

```bash
testivai run "<your-test-command>" [options]
```

## Examples

```bash
# Cypress
testivai run "cypress run --browser chrome"

# pytest
testivai run "pytest tests/ -v"

# Jest + Selenium
testivai run "npx jest tests/"

# Maven / JUnit
testivai run "mvn test"

# Robot Framework
testivai run "robot tests/"

# RSpec
testivai run "bundle exec rspec"
```

## How It Works

1. Starts your test command as a child process
2. Waits for Chrome to open `--remote-debugging-port=9222`
3. Connects via browser WebSocket
4. Injects `window.testivaiWitness` globally
5. Each `witness()` call triggers a full snapshot capture
6. Uploads the batch to TestivAI when tests complete

## Options

| Flag | Description |
|---|---|
| `--project <id>` | Override the project ID from `testivai.config.ts` |
| `--branch <name>` | Override the branch name (defaults to current git branch) |
| `--debug` | Print verbose browser connection logs |
