---
sidebar_position: 13
title: Cucumber + Capybara
---

# Cucumber + Capybara

Add visual regression testing to your existing Cucumber + Capybara suite. TestivAI generates a reusable step definition — `Then the "name" page looks correct` — that plugs directly into your existing feature files.

---

## Prerequisites

- Ruby 2.7+
- Chrome browser
- `selenium-webdriver`, `capybara`, and `cucumber` in your `Gemfile`

```ruby
# Gemfile
gem 'selenium-webdriver'
gem 'capybara'
gem 'cucumber'
gem 'cucumber-capybara'
```

Then run:

```bash
bundle install
```

---

## 1. Install the CLI

```bash
npm install -g @testivai/witness
```

:::note
The CLI is a Node.js tool. Node.js 18+ is required even for Ruby projects.
:::

---

## 2. Run the Setup Wizard

```bash
npx testivai init
```

Select when prompted:

```
? Select your language:        › Ruby
? Select your test framework:  › Cucumber + Capybara
? Where are your test files?   › features
```

The wizard generates three files:

| File | Purpose |
|---|---|
| `testivai_witness.rb` | `TestivaiWitness` module with `witness` method |
| `features/step_definitions/testivai_steps.rb` | Step definition for `the "name" page looks correct` |
| `features/visual_example.feature` | Working example feature file |

---

## 3. Authenticate

```bash
npx testivai auth <your-api-key>
```

Get your API key from the [TestivAI Dashboard](https://dashboard.testiv.ai).

---

## 4. Chrome Setup

Configure Capybara to use Chrome with `--remote-debugging-port=9222` in your `features/support/env.rb`:

```ruby
require 'capybara/cucumber'
require 'selenium-webdriver'

Capybara.register_driver :chrome_debug do |app|
  options = Selenium::WebDriver::Chrome::Options.new
  options.add_argument('--remote-debugging-port=9222')
  Capybara::Selenium::Driver.new(app, browser: :chrome, options: options)
end

Capybara.default_driver    = :chrome_debug
Capybara.javascript_driver = :chrome_debug
```

---

## 5. Add Capture Steps

The generated step definition registers the `Then the "name" page looks correct` step. Use it in any feature file:

```gherkin
Feature: Visual Regression

  Scenario: Homepage visual test
    Given I visit the homepage
    Then the "homepage" page looks correct

  Scenario: Login page visual test
    Given I visit the login page
    Then the "login-page" page looks correct
```

**The generated step definition (`features/step_definitions/testivai_steps.rb`):**

```ruby
# TestivAI Step Definitions
require_relative '../../testivai_witness'
World(TestivaiWitness)

Then('the {string} page looks correct') do |name|
  witness name
end
```

**The generated helper module (`testivai_witness.rb`):**

```ruby
# TestivAI Visual Regression Helper
module TestivaiWitness
  def witness(name)
    page.driver.browser.execute_script("return window.testivaiWitness('#{name}')")
  end
end
```

---

## 6. Full Working Example

**Feature file** (`features/visual_example.feature`):

```gherkin
Feature: Visual Regression
  Scenario: Homepage visual test
    Given I visit the homepage
    Then the "homepage" page looks correct
```

**Step definitions** (`features/step_definitions/testivai_steps.rb`):

```ruby
require_relative '../../testivai_witness'
World(TestivaiWitness)

Given('I visit the homepage') do
  visit '/'
end

Then('the {string} page looks correct') do |name|
  witness name
end
```

---

## 7. Run

```bash
testivai run "bundle exec cucumber"
```

Or run a specific feature file:

```bash
testivai run "bundle exec cucumber features/visual_example.feature"
```

Or run by tag:

```bash
testivai run "bundle exec cucumber --tags @visual"
```

---

## Tagging visual scenarios

Tag your visual scenarios for selective runs:

```gherkin
Feature: Visual Regression

  @visual
  Scenario: Homepage visual test
    Given I visit the homepage
    Then the "homepage" page looks correct
```

---

## CI/CD

Add headless Chrome for CI:

```ruby
options.add_argument('--remote-debugging-port=9222')
options.add_argument('--headless')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
```

GitHub Actions example:

```yaml
- name: Set up Ruby
  uses: ruby/setup-ruby@v1
  with:
    bundler-cache: true

- name: Run visual tests
  run: testivai run "bundle exec cucumber"
  env:
    TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

---

## How it works

The `witness` method calls `page.driver.browser.execute_script()` to invoke `window.testivaiWitness(name)` — the global function injected by the Witness SDK. The SDK captures a full snapshot and uploads it for REVEAL Engine™ analysis.

→ **[See how the sidecar model works](/how-it-works)**
