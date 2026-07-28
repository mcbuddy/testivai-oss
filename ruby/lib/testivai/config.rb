# frozen_string_literal: true

require "json"
require "pathname"

module Testivai
  # Reads `.testivai/config.json`, the same file every other TestivAI adapter
  # reads. Absent or malformed config falls back to defaults rather than
  # raising: a broken config should not fail somebody's test suite.
  module Config
    DEFAULTS = {
      "stabilize" => true,
      "ignoreSelectors" => [],
      "baselinesDir" => nil
    }.freeze

    # Walk up from `start` looking for a `.testivai/` directory, the way
    # Bundler finds a Gemfile. Falls back to `start` so a first run in a
    # fresh project still writes somewhere sensible.
    def self.project_root(start = Dir.pwd)
      current = Pathname.new(start).expand_path
      current.ascend do |dir|
        return dir if dir.join(".testivai").directory?
      end
      Pathname.new(start).expand_path
    end

    def self.load(root)
      path = Pathname.new(root).join(".testivai", "config.json")
      return DEFAULTS.dup unless path.file?

      DEFAULTS.merge(JSON.parse(path.read))
    rescue JSON::ParserError, SystemCallError
      DEFAULTS.dup
    end
  end
end
