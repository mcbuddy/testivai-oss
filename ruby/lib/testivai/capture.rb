# frozen_string_literal: true

require "base64"
require "json"
require "fileutils"
require "pathname"

require_relative "config"
require_relative "element_map"

module Testivai
  # Capture half of the pipeline: writes `.testivai/temp/<name>/` with the
  # screenshot, the DOM snapshot, and the element map. The compare half is
  # `npx testivai report`, shared with every other adapter.
  #
  # Works against any Capybara session or a bare Selenium driver — all this
  # needs is `execute_script` plus some way to take a screenshot, which is
  # exactly what every Capybara driver already exposes.
  module Capture
    STYLE_ID = "__testivai_capture_style__"

    # Collapses animations and transitions to ~0s, hides the caret, and
    # disables smooth scrolling — the top causes of flaky visual diffs.
    # Near-zero rather than `none` so animations land on their final frame
    # instead of never rendering.
    STABILIZE_CSS = <<~CSS
      *, *::before, *::after {
        animation-duration: 0.001s !important;
        animation-delay: 0s !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
      }
    CSS

    INJECT_STYLE_JS = <<~JS
      var s = document.createElement('style');
      s.id = arguments[0];
      s.textContent = arguments[1];
      document.head.appendChild(s);
    JS

    REMOVE_STYLE_JS = <<~JS
      var s = document.getElementById(arguments[0]);
      if (s && s.parentNode) { s.parentNode.removeChild(s); }
    JS

    FONTS_READY_JS = <<~JS
      return !document.fonts || document.fonts.status === 'loaded';
    JS

    DOM_SNAPSHOT_JS = <<~JS
      var clone = document.documentElement.cloneNode(true);
      var sels = arguments[0] || [];
      for (var i = 0; i < sels.length; i++) {
        try {
          var found = clone.querySelectorAll(sels[i]);
          for (var j = 0; j < found.length; j++) { found[j].remove(); }
        } catch (e) {}
      }
      return clone.outerHTML;
    JS

    module_function

    # Capture a snapshot.
    #
    # @param session  a Capybara session (`page`) or a Selenium driver
    # @param name     snapshot name; becomes the directory under temp/
    # @return [Pathname] the temp directory written
    def witness(session, name,
                ignore_selectors: nil,
                stabilize: nil,
                skip_dom: false,
                skip_element_map: false,
                max_elements: nil,
                project_root: nil)
      browser = resolve_browser(session)
      root = Pathname.new(project_root || Config.project_root)
      config = Config.load(root)

      selectors = ((config["ignoreSelectors"] || []) + (ignore_selectors || [])).uniq
      stabilize = config["stabilize"] if stabilize.nil?
      stabilize = true if stabilize.nil?

      temp_dir = root.join(".testivai", "temp", name.to_s)
      FileUtils.mkdir_p(temp_dir)

      css = +""
      css << STABILIZE_CSS if stabilize
      css << hide_css(selectors) unless selectors.empty?

      injected = false
      unless css.empty?
        injected = inject_css(browser, css)
        wait_for_fonts(browser) if stabilize
      end

      begin
        screenshot = capture_screenshot(browser)
      ensure
        remove_css(browser) if injected
      end

      File.binwrite(temp_dir.join("screenshot.png"), screenshot)

      # DOM snapshot — best-effort. Losing it only costs the noise hint;
      # it must never break the screenshot path.
      unless skip_dom
        begin
          dom = browser.execute_script(DOM_SNAPSHOT_JS, selectors)
          temp_dir.join("dom.html").write(dom) if dom.is_a?(String) && !dom.empty?
        rescue StandardError # rubocop:disable Lint/SuppressedException
        end
      end

      # Element map — same best-effort contract. Powers region→selector
      # attribution, shift classification, and the style fingerprint.
      unless skip_element_map
        begin
          expr = ElementMap.expression(max_elements || ElementMap::DEFAULT_MAX_ELEMENTS, selectors)
          map = browser.execute_script(expr)
          if map.is_a?(Array) && !map.empty?
            temp_dir.join("elements.json").write(JSON.generate(map))
          end
        rescue StandardError # rubocop:disable Lint/SuppressedException
        end
      end

      temp_dir
    end

    # Capybara sessions wrap the real driver; a bare Selenium driver is
    # already what we want. Accept both so this works in RSpec/Capybara,
    # Cucumber, or plain selenium-webdriver.
    def resolve_browser(session)
      return session.driver.browser if session.respond_to?(:driver) && session.driver.respond_to?(:browser)
      return session.browser if session.respond_to?(:browser)

      session
    end

    def hide_css(selectors)
      selectors.map { |s| "#{s} { visibility: hidden !important; }" }.join("\n")
    end

    def inject_css(browser, css)
      browser.execute_script(INJECT_STYLE_JS, STYLE_ID, css)
      true
    rescue StandardError
      false
    end

    def remove_css(browser)
      browser.execute_script(REMOVE_STYLE_JS, STYLE_ID)
    rescue StandardError # rubocop:disable Lint/SuppressedException
    end

    def wait_for_fonts(browser, timeout: 10.0)
      deadline = Time.now + timeout
      loop do
        return if browser.execute_script(FONTS_READY_JS)
        return if Time.now > deadline

        sleep 0.05
      end
    rescue StandardError # rubocop:disable Lint/SuppressedException
    end

    # Full page where the browser offers it, viewport otherwise.
    #
    #   - Chromium: CDP Page.captureScreenshot with captureBeyondViewport,
    #     the same mechanism Playwright uses — a true full-page capture with
    #     no window resizing (resizing breaks 100vh layouts).
    #   - Firefox: selenium-webdriver exposes save_full_page_screenshot.
    #   - anything else: the plain viewport screenshot.
    def capture_screenshot(browser)
      if browser.respond_to?(:execute_cdp)
        begin
          result = browser.execute_cdp("Page.captureScreenshot",
                                       "captureBeyondViewport" => true, "format" => "png")
          data = result && (result["data"] || result[:data])
          return Base64.decode64(data) if data
        rescue StandardError # rubocop:disable Lint/SuppressedException
        end
      end

      if browser.respond_to?(:full_screenshot_as)
        begin
          return browser.full_screenshot_as(:png)
        rescue StandardError # rubocop:disable Lint/SuppressedException
        end
      end

      browser.screenshot_as(:png)
    end
  end
end
