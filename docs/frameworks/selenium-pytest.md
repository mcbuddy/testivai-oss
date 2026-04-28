---
sidebar_position: 7
title: Selenium + pytest
---

# Selenium + pytest

Add visual regression testing to your existing Selenium + pytest suite. The `witness(driver, name)` helper integrates with pytest's fixture pattern — no changes to your existing test structure.

---

## Prerequisites

- Python 3.8+
- Chrome browser
- `selenium` and `pytest` installed

```bash
pip install selenium pytest
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
? Select your test framework:  › Selenium (pytest)
? Where are your test files?   › tests
```

The wizard generates two files:

| File | Purpose |
|---|---|
| `testivai_witness.py` | `witness(driver, name)` helper function |
| `tests/test_visual_example.py` | Working example test with pytest fixture |

---

## 3. Authenticate

```bash
npx testivai auth <your-api-key>
```

Get your API key from the [TestivAI Dashboard](https://dashboard.testiv.ai).

---

## 4. Chrome Setup

The generated fixture adds `--remote-debugging-port=9222` to Chrome options. Add it to your existing fixture or `conftest.py`:

```python
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

@pytest.fixture
def driver():
    options = Options()
    options.add_argument('--remote-debugging-port=9222')
    drv = webdriver.Chrome(options=options)
    yield drv
    drv.quit()
```

---

## 5. Add Capture Calls

Import `witness` from the generated helper and call it after navigating:

```python
from testivai_witness import witness

def test_homepage(driver):
    driver.get('http://localhost:3000')
    witness(driver, 'homepage')

def test_login_page(driver):
    driver.get('http://localhost:3000/login')
    witness(driver, 'login-page')
```

**The generated helper file (`testivai_witness.py`):**

```python
# TestivAI Visual Regression Helper
def witness(driver, name):
    """Capture a visual snapshot."""
    return driver.execute_script(f"return window.testivaiWitness('{name}')")
```

---

## 6. Full Working Example

The wizard generates this example at `tests/test_visual_example.py`:

```python
# TestivAI Visual Regression Example
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from testivai_witness import witness


@pytest.fixture
def driver():
    options = Options()
    options.add_argument('--remote-debugging-port=9222')
    drv = webdriver.Chrome(options=options)
    yield drv
    drv.quit()


def test_homepage(driver):
    driver.get('http://localhost:3000')
    witness(driver, 'homepage')
```

---

## 7. Run

```bash
testivai run "pytest tests/ -v"
```

---

## conftest.py pattern

For sharing the driver fixture across multiple test files, put it in `conftest.py`:

```python
# conftest.py
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

@pytest.fixture(scope='session')
def driver():
    options = Options()
    options.add_argument('--remote-debugging-port=9222')
    drv = webdriver.Chrome(options=options)
    yield drv
    drv.quit()
```

---

## CI/CD

Add headless Chrome args for CI:

```python
options.add_argument('--remote-debugging-port=9222')
options.add_argument('--headless')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
```

GitHub Actions example:

```yaml
- name: Run visual tests
  run: testivai run "pytest tests/ -v"
  env:
    TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

---

## How it works

`witness(driver, name)` calls `driver.execute_script()` to invoke `window.testivaiWitness(name)` — the global function injected by the Witness SDK. The SDK captures a full snapshot and uploads it for REVEAL Engine™ analysis.

→ **[See how the sidecar model works](/how-it-works)**
