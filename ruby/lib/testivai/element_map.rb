# frozen_string_literal: true

require "json"
require "pathname"

module Testivai
  # Loads the canonical element-map collector and builds the expression the
  # adapter injects.
  #
  # `element_map.js` is GENERATED from
  # packages/witness/src/capture/element-map.ts by
  # scripts/generate-element-map-asset.js, and CI fails when it is stale.
  # Every adapter — TypeScript, Python, Java, Ruby — injects that identical
  # function. That matters because they all write into one shared
  # `.testivai/baselines/` directory: two languages producing subtly
  # different maps for the same page would show up as a phantom regression.
  module ElementMap
    # Matches DEFAULT_MAX_ELEMENTS in the TypeScript source.
    DEFAULT_MAX_ELEMENTS = 3000

    ASSET = Pathname.new(__dir__).join("element_map.js")

    class << self
      # Collector source with the generated banner stripped — that comment
      # helps a reader but is pure weight on the wire, and this string ships
      # to the browser on every capture.
      def source
        @source ||= begin
          # Explicit UTF-8: the generated asset contains non-ASCII characters,
          # and Pathname#read would otherwise use the default external
          # encoding (US-ASCII on some systems), making `strip` raise.
          raw = ASSET.read(encoding: "UTF-8")
          start = raw.index("function collectElementMap")
          if start.nil?
            raise "element_map.js is malformed: collectElementMap not found. " \
                  "Regenerate with scripts/generate-element-map-asset.js"
          end
          raw[start..].strip
        end
      end

      # Wrapped exactly as `buildElementMapExpression` does on the TypeScript
      # side. WebDriver needs the explicit `return`.
      def expression(max_elements, ignore_selectors)
        "return (#{source})(document, window, #{max_elements.to_i}, " \
          "#{JSON.generate(Array(ignore_selectors))});"
      end
    end
  end
end
