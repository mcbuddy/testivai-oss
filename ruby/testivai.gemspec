# frozen_string_literal: true

require_relative "lib/testivai/version"

Gem::Specification.new do |spec|
  spec.name        = "testivai"
  spec.version     = Testivai::VERSION
  spec.authors     = ["Budi Sugianto"]
  spec.email       = ["testivai.app@gmail.com"]

  spec.summary     = "Local-first visual regression testing for Ruby test suites"
  spec.description = <<~DESC
    Capture screenshots, DOM snapshots, and element maps from Capybara or
    Selenium, diff them against baselines committed to your repository, and
    get a self-contained HTML report that explains what changed and why.
    No account, no API key, nothing uploaded.
  DESC
  spec.homepage    = "https://testiv.ai"
  spec.license     = "MIT"

  spec.required_ruby_version = ">= 2.7.0"

  spec.metadata["homepage_uri"]      = spec.homepage
  spec.metadata["source_code_uri"]   = "https://github.com/testivai/testivai-oss"
  spec.metadata["documentation_uri"] = "https://testiv.ai/docs/frameworks/ruby/"
  spec.metadata["changelog_uri"]     = "https://github.com/testivai/testivai-oss/releases"

  # element_map.js is generated (scripts/generate-element-map-asset.js) and
  # MUST ship — the adapter reads it at capture time.
  spec.files = Dir["lib/**/*.rb", "lib/**/*.js", "README.md", "LICENSE"]
  spec.require_paths = ["lib"]
end
