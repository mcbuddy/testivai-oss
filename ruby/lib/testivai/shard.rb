# frozen_string_literal: true

require "json"
require "time"
require "pathname"

module Testivai
  # Shard participation for parallel and sharded runs.
  #
  # Playwright can tell its reporter `--shard=i/N`; RSpec cannot. So the
  # mechanism is the environment, not a framework API, and every TestivAI
  # adapter honours the same two variables:
  #
  #   TESTIVAI_CAPTURE_ONLY=1   capture, do not compare
  #   TESTIVAI_SHARD=3/8        this process is shard 3 of 8
  #
  # That is what keeps a Ruby suite a first-class citizen of the same sharded
  # CI flow as Playwright rather than a second-class one.
  module Shard
    PATTERN = %r{\A\s*(\d+)\s*(?:/|of)\s*(\d+)\s*\z}i
    MANIFEST = "testivai-shard.json"

    module_function

    # Parse TESTIVAI_SHARD; nil when unset or malformed.
    def from_env(env = ENV)
      parse(env["TESTIVAI_SHARD"])
    end

    def parse(raw)
      m = PATTERN.match(raw.to_s)
      return nil unless m

      current = m[1].to_i
      total = m[2].to_i
      return nil if total < 1 || current < 1 || current > total

      { current: current, total: total }
    end

    def capture_only?(env = ENV)
      raw = env["TESTIVAI_CAPTURE_ONLY"].to_s
      return !%w[0 false].include?(raw.downcase) unless raw.empty?

      s = from_env(env)
      !s.nil? && s[:total] > 1
    end

    # Write (or refresh) the manifest merge-captures reads.
    #
    # RSpec gives the gem no end-of-run hook, so this is refreshed on every
    # capture and `complete` stays false — it records that the shard
    # participated, not that it finished.
    def write_manifest(temp_dir, shard, complete: false)
      dir = Pathname.new(temp_dir)
      dir.mkpath
      captures = dir.children.select(&:directory?).map { |p| p.basename.to_s }.sort
      dir.join(MANIFEST).write(
        JSON.pretty_generate(
          "shard" => { "current" => shard[:current], "total" => shard[:total] },
          "captures" => captures,
          "complete" => complete,
          "timestamp" => Time.now.utc.iso8601
        )
      )
    rescue StandardError # rubocop:disable Lint/SuppressedException
      # Never fail a capture over a manifest.
    end
  end
end
