# frozen_string_literal: true

require "pathname"

module Testivai
  # Page-settled probe: "has this page stopped changing?"
  #
  # `settle.js` is GENERATED from packages/witness/src/capture/settle.ts, so
  # every language polls the identical predicate.
  #
  # Deliberately NOT network idle. Playwright's own docs mark that DISCOURAGED
  # for testing, and it is the wrong signal for a visual snapshot anyway — a
  # page with analytics beacons never goes quiet, while a network-idle page can
  # still be animating. What matters is whether the rendered page settled.
  module Settle
    DEFAULT_QUIET_MS = 150
    DEFAULT_TIMEOUT = 5.0
    ASSET = Pathname.new(__dir__).join("settle.js")

    STOP_JS = <<~JS
      try { var s = window.__testivaiSettleState;
        if (s && s.observer && s.observer.disconnect) s.observer.disconnect(); } catch (e) {}
      try { delete window.__testivaiSettleState; } catch (e) {}
    JS

    class << self
      def source
        @source ||= begin
          # Explicit UTF-8: the generated asset is non-ASCII and Pathname#read
          # would otherwise use the default external encoding.
          raw = ASSET.read(encoding: "UTF-8")
          start = raw.index("function settleProbe")
          raise "settle.js is malformed: settleProbe not found" if start.nil?

          raw[start..].strip
        end
      end

      def expression(quiet_ms = DEFAULT_QUIET_MS)
        "return (#{source})(document, window, #{quiet_ms.to_i});"
      end

      # Poll until settled or the deadline passes. Always bounded: a page that
      # never settles yields a capture, not a hang. A browser that cannot
      # evaluate the probe returns something unusable, so we proceed at once
      # rather than paying the whole timeout on every capture.
      def wait_for(browser, quiet_ms: DEFAULT_QUIET_MS, timeout: DEFAULT_TIMEOUT)
        expr = expression(quiet_ms)
        deadline = Time.now + timeout
        loop do
          state = begin
            browser.execute_script(expr)
          rescue StandardError
            return
          end
          return unless state.is_a?(Hash)

          settled = state["settled"]
          return unless [true, false].include?(settled)
          return if settled || Time.now >= deadline

          sleep 0.05
        end
      end

      # Detach the observer so it does not linger on the page under test.
      def stop(browser)
        browser.execute_script(STOP_JS)
      rescue StandardError # rubocop:disable Lint/SuppressedException
      end
    end
  end
end
