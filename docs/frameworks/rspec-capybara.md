---
sidebar_position: 12
title: RSpec + Capybara
---

# RSpec + Capybara

Add visual regression testing to your existing RSpec + Capybara feature suite. The `TestivaiWitness` module adds a `witness 'name'` method that integrates with Capybara's page object.

---

## Prerequisites

- Ruby 2.7+
- Chrome browser
- `selenium-webdriver`, `capybara`, and `rspec` in your `Gemfile`

```ruby
# Gemfile
gem 'selenium-webdriver'
gem 'capybara'
gem 'rspec'
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
? Select your test framework:  › RSpec + Capybara
? Where are your test files?   › spec
```

The wizard generates two files:

| File | Purpose |
|---|---|
| `testivai_witness.rb` | `TestivaiWitness` module with `witness` method |
| `spec/visual_example_spec.rb` | Working example spec |

---

## 3. Authenticate

```bash
npx testivai auth <your-api-key>
```

Get your API key from the [TestivAI Dashboard](https://dashboard.testiv.ai).

---

## 4. Chrome Setup

Configure Capybara to use Chrome with `--remote-debugging-port=9222` in your `spec/spec_helper.rb` or `spec/support/capybara.rb`:

```ruby
require 'capybara/rspec'
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

## 5. Add Capture Calls

Include `TestivaiWitness` in your spec and call `witness 'name'` after navigating:

```ruby
require 'spec_helper'
require_relative '../../testivai_witness'

RSpec.describe 'Visual Regression', type: :feature do
  include TestivaiWitness

  it 'captures homepage' do
    visit '/'
    witness 'homepage'
  end

  it 'captures login page' do
    visit '/login'
    witness 'login-page'
  end
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

The wizard generates this example at `spec/visual_example_spec.rb`:

```ruby
# TestivAI Visual Regression Example
require 'spec_helper'
require_relative '../../testivai_witness'

RSpec.describe 'Visual Regression', type: :feature do
  include TestivaiWitness

  it 'captures homepage' do
    visit '/'
    witness 'homepage'
  end
end
```

---

## 7. Run

```bash
testivai run "bundle exec rspec"
```

Or run a specific spec file:

```bash
testivai run "bundle exec rspec spec/visual_example_spec.rb"
```

---

## Shared context pattern

For reusing `TestivaiWitness` across all feature specs, add it to a shared context in `spec/support/testivai.rb`:

```ruby
require_relative '../../testivai_witness'

RSpec.shared_context 'testivai', type: :feature do
  include TestivaiWitness
end

RSpec.configure do |config|
  config.include_context 'testivai', type: :feature
end
```

Then require it in `spec_helper.rb` — no per-spec `include` needed.

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
  run: testivai run "bundle exec rspec"
  env:
    TESTIVAI_API_KEY: ${{ secrets.TESTIVAI_API_KEY }}
```

---

## How it works

`witness 'name'` calls `page.driver.browser.execute_script()` to invoke `window.testivaiWitness(name)` — the global function injected by the Witness SDK. The SDK captures a full snapshot and uploads it for REVEAL Engine™ analysis.

→ **[See how the sidecar model works](/how-it-works)**
