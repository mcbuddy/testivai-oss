# frozen_string_literal: true

require "json"
require "tmpdir"
require "base64"
require "open3"

require "testivai"

# 1x1 transparent PNG
PNG = Base64.decode64(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)

# A duck-typed browser. `execute_script` recognises the adapter's scripts the
# way a real browser would, and — crucially — the element-map branch actually
# RUNS the injected expression through Node, so the tests prove the generated
# asset is runnable JavaScript producing the shape the report consumes.
class FakeBrowser
  DOM = "<html><head></head><body><p>Hi</p></body></html>"

  attr_reader :injected_css, :scripts

  def initialize(dom: DOM, fail_element_map: false)
    @dom = dom
    @fail_element_map = fail_element_map
    @injected_css = []
    @scripts = []
    @style_removed = false
  end

  def style_removed? = @style_removed

  def execute_script(script, *args)
    @scripts << script
    if script.include?("createElement('style')")
      @injected_css << args[1]
      return nil
    end
    if script.include?("getElementById") && script.include?("removeChild")
      @style_removed = true
      return nil
    end
    return true if script.include?("document.fonts")

    if script.include?("collectElementMap")
      raise "CSP blocked" if @fail_element_map

      return run_collector(script)
    end

    if script.include?("cloneNode")
      dom = @dom
      Array(args[0]).each { |sel| dom = dom.sub(%(<div class="#{sel.delete_prefix(".")}">SECRET</div>), "") }
      return dom
    end
    nil
  end

  def screenshot_as(_format) = PNG

  private

  # Execute the adapter's real injected expression with Node against a
  # duck-typed DOM.
  def run_collector(script)
    harness = <<~JS
      const rect = { x: 0, y: 0, width: 100, height: 40 };
      const mk = (tag) => ({
        tagName: tag.toUpperCase(),
        classList: { length: 0 },
        children: [],
        parentElement: null,
        getBoundingClientRect: () => rect,
        matches: () => false,
      });
      const body = mk('body');
      const p = mk('p');
      p.parentElement = body;
      body.children = [p];
      const document = { body };
      const window = {
        devicePixelRatio: 1, scrollX: 0, scrollY: 0,
        getComputedStyle: () => ({ getPropertyValue: () => 'x' }),
      };
      const out = (function () { #{script} })();
      process.stdout.write(JSON.stringify(out));
    JS

    stdout, stderr, status = Open3.capture3("node", "-e", harness)
    raise "collector failed to run: #{stderr}" unless status.success?

    JSON.parse(stdout)
  end
end

RSpec.describe Testivai do
  around do |example|
    Dir.mktmpdir do |dir|
      @root = Pathname.new(dir)
      (@root / ".testivai").mkpath
      example.run
    end
  end

  def temp_dir(name) = @root.join(".testivai", "temp", name)

  it "writes the screenshot and DOM snapshot" do
    browser = FakeBrowser.new
    Testivai.witness(browser, "homepage", project_root: @root)

    expect(temp_dir("homepage").join("screenshot.png")).to exist
    expect(temp_dir("homepage").join("dom.html").read).to include("<p>Hi</p>")
  end

  it "writes an element map with the shape the report consumes" do
    Testivai.witness(FakeBrowser.new, "with-map", project_root: @root)

    path = temp_dir("with-map").join("elements.json")
    expect(path).to exist

    entries = JSON.parse(path.read)
    expect(entries).to be_an(Array)
    expect(entries).not_to be_empty
    entries.each do |entry|
      expect(entry["path"]).to be_a(String)
      expect(entry["x"]).to be_a(Numeric)
      expect(entry["y"]).to be_a(Numeric)
      expect(entry["width"]).to be_a(Numeric)
      expect(entry["height"]).to be_a(Numeric)
      expect(entry["styleHash"]).to be_a(String)
    end
  end

  it "skips the element map on request" do
    Testivai.witness(FakeBrowser.new, "no-map", project_root: @root, skip_element_map: true)
    expect(temp_dir("no-map").join("elements.json")).not_to exist
  end

  it "still captures when the element-map script is blocked" do
    Testivai.witness(FakeBrowser.new(fail_element_map: true), "map-fails", project_root: @root)

    expect(temp_dir("map-fails").join("screenshot.png")).to exist
    expect(temp_dir("map-fails").join("elements.json")).not_to exist
  end

  it "injects and then removes the stabilization CSS" do
    browser = FakeBrowser.new
    Testivai.witness(browser, "stable", project_root: @root)

    expect(browser.injected_css.first).to include("animation-duration")
    expect(browser).to be_style_removed
  end

  it "hides ignore_selectors and strips them from the DOM snapshot" do
    browser = FakeBrowser.new(dom: %(<html><body><div class="live">SECRET</div><p>Hi</p></body></html>))
    Testivai.witness(browser, "ignored", project_root: @root, ignore_selectors: [".live"])

    expect(browser.injected_css.first).to include(".live { visibility: hidden !important; }")
    expect(temp_dir("ignored").join("dom.html").read).not_to include("SECRET")
  end

  it "unwraps a Capybara-style session to its driver browser" do
    browser = FakeBrowser.new
    driver = Struct.new(:browser).new(browser)
    session = Struct.new(:driver).new(driver)

    Testivai.witness(session, "capybara", project_root: @root)
    expect(temp_dir("capybara").join("screenshot.png")).to exist
  end

  it "prefers a full-page CDP capture when the browser offers one" do
    browser = FakeBrowser.new
    called = []
    browser.define_singleton_method(:execute_cdp) do |cmd, params|
      called << [cmd, params]
      { "data" => Base64.strict_encode64(PNG) }
    end

    Testivai.witness(browser, "fullpage", project_root: @root)

    expect(called.first[0]).to eq("Page.captureScreenshot")
    expect(called.first[1]["captureBeyondViewport"]).to be(true)
  end
end
