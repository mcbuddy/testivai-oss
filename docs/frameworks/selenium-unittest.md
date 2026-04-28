---
sidebar_position: 8
title: Selenium + unittest
---

# Selenium + unittest

Add visual regression testing to your existing Selenium + `unittest` suite. The `witness(driver, name)` helper integrates with Python's standard `unittest.TestCase` pattern.

---

## Prerequisites

- Python 3.8+
- Chrome browser
- `selenium` installed

```bash
pip install selenium
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
? Select your test framework:  › Selenium (unittest)
? Where are your test files?   › tests
```

The wizard generates two files:

| File | Purpose |
|---|---|
| `testivai_witness.py` | `witness(driver, name)` helper function |
| `tests/test_visual_example.py` | Working example test using `unittest.TestCase` |

---

## 3. Authenticate

```bash
npx testivai auth <your-api-key>
```

Get your API key from the [TestivAI Dashboard](https://dashboard.testiv.ai).

---

## 4. Chrome Setup

Add `--remote-debugging-port=9222` to your `setUp` method:

```python
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import unittest

class VisualTest(unittest.TestCase):
    def setUp(self):
        options = Options()
        options.add_argument('--remote-debugging-port=9222')
        self.driver = webdriver.Chrome(options=options)

    def tearDown(self):
        self.driver.quit()
```

---

## 5. Add Capture Calls

Import `witness` from the generated helper and call it in your test methods:

```python
from testivai_witness import witness

class VisualTest(unittest.TestCase):
    def test_homepage(self):
        self.driver.get('http://localhost:3000')
        witness(self.driver, 'homepage')

    def test_login_page(self):
        self.driver.get('http://localhost:3000/login')
        witness(self.driver, 'login-page')
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
import unittest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from testivai_witness import witness


class VisualTest(unittest.TestCase):
    def setUp(self):
        options = Options()
        options.add_argument('--remote-debugging-port=9222')
        self.driver = webdriver.Chrome(options=options)

    def tearDown(self):
        self.driver.quit()

    def test_homepage(self):
        self.driver.get('http://localhost:3000')
        witness(self.driver, 'homepage')


if __name__ == '__main__':
    unittest.main()
```

---

## 7. Run

```bash
testivai run "python -m unittest discover tests/"
```

Or run a specific test file:

```bash
testivai run "python -m unittest tests/test_visual_example.py"
```

---

## setUpClass pattern

For a shared driver across all methods in a class (faster, one Chrome instance):

```python
class VisualTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        options = Options()
        options.add_argument('--remote-debugging-port=9222')
        cls.driver = webdriver.Chrome(options=options)

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()
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
  run: testivai run "python -m unittest discover tests/"
  env:
    TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

---

## How it works

`witness(driver, name)` calls `driver.execute_script()` to invoke `window.testivaiWitness(name)` — the global function injected by the Witness SDK. The SDK captures a full snapshot and uploads it for REVEAL Engine™ analysis.

→ **[See how the sidecar model works](/how-it-works)**
