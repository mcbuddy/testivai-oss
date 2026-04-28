---
sidebar_position: 9
title: Robot Framework
---

# Robot Framework

Add visual regression testing to your existing Robot Framework suite. TestivAI generates a `Witness` keyword that integrates natively with Robot's keyword-driven style.

---

## Prerequisites

- Python 3.8+
- Chrome browser
- `robotframework` and `robotframework-seleniumlibrary` installed

```bash
pip install robotframework robotframework-seleniumlibrary
```

---

## 1. Install the CLI

```bash
npm install -g @testivai/witness
```

:::note
The CLI is a Node.js tool. Node.js 18+ is required even for Python projects.
:::

---

## 2. Run the Setup Wizard

```bash
npx testivai init
```

Select when prompted:

```
? Select your language:        › Python
? Select your test framework:  › Robot Framework
? Where are your test files?   › tests
```

The wizard generates three files:

| File | Purpose |
|---|---|
| `testivai_witness.py` | Python helper used by the keyword library |
| `testivai_keywords.robot` | Robot resource file with the `Witness` keyword |
| `tests/visual_example.robot` | Working example test suite |

---

## 3. Authenticate

```bash
npx testivai auth <your-api-key>
```

Get your API key from the [TestivAI Dashboard](https://dashboard.testiv.ai).

---

## 4. Chrome Setup

Open Chrome with `--remote-debugging-port=9222` using `SeleniumLibrary`'s `Open Browser` keyword:

```robot
Open Browser    ${URL}    chrome    options=add_argument("--remote-debugging-port=9222")
```

---

## 5. Add Capture Calls

Import the `testivai_keywords.robot` resource file in your test suite and use the `Witness` keyword:

```robot
*** Settings ***
Library    SeleniumLibrary
Resource   ../testivai_keywords.robot

*** Variables ***
${URL}    http://localhost:3000

*** Test Cases ***
Homepage Visual Test
    Open Browser    ${URL}    chrome    options=add_argument("--remote-debugging-port=9222")
    Witness    homepage
    Close Browser

Login Page Visual Test
    Open Browser    ${URL}/login    chrome    options=add_argument("--remote-debugging-port=9222")
    Witness    login-page
    Close Browser
```

**The generated keyword resource (`testivai_keywords.robot`):**

```robot
*** Settings ***
Library    SeleniumLibrary
Library    testivai_witness.py

*** Keywords ***
Witness
    [Arguments]    ${name}
    Execute Javascript    return window.testivaiWitness('${name}')
```

---

## 6. Full Working Example

The wizard generates this example at `tests/visual_example.robot`:

```robot
*** Settings ***
Library    SeleniumLibrary
Resource   ../testivai_keywords.robot

*** Variables ***
${URL}    http://localhost:3000

*** Test Cases ***
Homepage Visual Test
    Open Browser    ${URL}    chrome    options=add_argument("--remote-debugging-port=9222")
    Witness    homepage
    Close Browser
```

---

## 7. Run

```bash
testivai run "robot tests/"
```

Or run a specific test file:

```bash
testivai run "robot tests/visual_example.robot"
```

---

## Suite Setup pattern

For a shared browser across all tests in a suite:

```robot
*** Settings ***
Library    SeleniumLibrary
Resource   ../testivai_keywords.robot
Suite Setup       Open Browser    ${URL}    chrome    options=add_argument("--remote-debugging-port=9222")
Suite Teardown    Close Browser

*** Test Cases ***
Homepage Visual Test
    Go To    ${URL}
    Witness    homepage

Dashboard Visual Test
    Go To    ${URL}/dashboard
    Witness    dashboard
```

---

## CI/CD

Add headless Chrome options for CI:

```robot
Open Browser    ${URL}    chrome
...    options=add_argument("--remote-debugging-port=9222");add_argument("--headless");add_argument("--no-sandbox");add_argument("--disable-dev-shm-usage")
```

GitHub Actions example:

```yaml
- name: Run visual tests
  run: testivai run "robot tests/"
  env:
    TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

---

## How it works

The `Witness` keyword calls `Execute Javascript` to invoke `window.testivaiWitness(name)` — the global function injected by the Witness SDK. The SDK captures a full snapshot and uploads it for REVEAL Engine™ analysis.

→ **[See how the sidecar model works](/how-it-works)**
