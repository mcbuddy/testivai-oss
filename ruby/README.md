# testivai (Ruby)

Local-first visual regression testing for Capybara and Selenium suites.
Part of [testivai-oss](https://github.com/testivai/testivai-oss) — MIT, no
account, nothing uploaded.

```ruby
# Gemfile
gem "testivai", group: :test
```

```ruby
require "testivai"

RSpec.describe "Homepage", type: :feature do
  it "looks right" do
    visit "/"
    Testivai.witness(page, "homepage")
  end
end
```

Run your suite exactly as you already do, then compare:

```bash
bundle exec rspec
npx testivai report
```

The first run writes baselines under `.testivai/baselines/` — commit them.
Later runs diff against them and write `visual-report/index.html`.

## Options

```ruby
Testivai.witness(page, "checkout",
  ignore_selectors: [".live-chat"],  # hidden from pixels and the DOM signal
  stabilize: true,                   # freeze animations, hide caret, await fonts
  skip_dom: false,                   # DOM snapshot powers the noise hint
  skip_element_map: false,           # element map powers selector attribution
  max_elements: 3000)
```

## What it captures

| File | Purpose |
|---|---|
| `screenshot.png` | Full page on Chromium (CDP) and Firefox; viewport elsewhere |
| `dom.html` | Powers the noise hint and text-change detection |
| `elements.json` | Powers region→selector attribution, shift detection, style checks |

The element-map collector is generated from one TypeScript source shared by
every TestivAI adapter, so Ruby, Python, Java, and JavaScript lanes produce
identical maps against the same baselines.

## Why `npx testivai report`?

Capture is native Ruby; the diff engine and HTML report are shared across all
languages and live in the `@testivai/witness` npm package. Same split as the
Python and Java adapters — one comparison implementation, not five.

Docs: <https://testiv.ai/docs/frameworks/ruby/>
