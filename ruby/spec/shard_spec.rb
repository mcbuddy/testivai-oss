# frozen_string_literal: true

require "json"
require "tmpdir"
require "testivai"

RSpec.describe Testivai::Shard do
  describe ".parse" do
    it "accepts both forms" do
      expect(described_class.parse("3/8")).to eq(current: 3, total: 8)
      expect(described_class.parse("1of4")).to eq(current: 1, total: 4)
      expect(described_class.parse("  2 / 5 ")).to eq(current: 2, total: 5)
    end

    it "rejects nonsense" do
      ["", nil, "abc", "0/8", "9/8", "3/0"].each do |bad|
        expect(described_class.parse(bad)).to be_nil, "expected #{bad.inspect} to be rejected"
      end
    end
  end

  describe ".capture_only?" do
    it "is true when explicitly set" do
      expect(described_class.capture_only?({ "TESTIVAI_CAPTURE_ONLY" => "1" })).to be(true)
    end

    it "is false when explicitly disabled, even while sharded" do
      env = { "TESTIVAI_CAPTURE_ONLY" => "false", "TESTIVAI_SHARD" => "2/8" }
      expect(described_class.capture_only?(env)).to be(false)
    end

    it "is implied by being one shard of many" do
      expect(described_class.capture_only?({ "TESTIVAI_SHARD" => "2/8" })).to be(true)
    end

    it "is false for a single shard covering everything" do
      expect(described_class.capture_only?({ "TESTIVAI_SHARD" => "1/1" })).to be(false)
    end

    it "is false with no signal at all" do
      expect(described_class.capture_only?({})).to be(false)
    end
  end

  describe ".write_manifest" do
    it "lists the captures present and marks completion as unknown" do
      Dir.mktmpdir do |dir|
        temp = Pathname.new(dir) / "temp"
        (temp / "home").mkpath
        (temp / "checkout").mkpath

        described_class.write_manifest(temp, { current: 3, total: 8 })

        data = JSON.parse((temp / "testivai-shard.json").read)
        expect(data["shard"]).to eq("current" => 3, "total" => 8)
        expect(data["captures"]).to eq(%w[checkout home])
        # RSpec gives the gem no end-of-run hook, so this records participation
        expect(data["complete"]).to be(false)
      end
    end

    it "never raises on an unwritable target" do
      expect { described_class.write_manifest("/definitely/not/writable/xyz", { current: 1, total: 2 }) }
        .not_to raise_error
    end
  end
end

RSpec.describe Testivai::Settle do
  # Answers the probe a fixed number of times before reporting settled.
  class ProbeBrowser
    attr_reader :calls

    def initialize(settle_after: 0, answer: :normal)
      @calls = 0
      @settle_after = settle_after
      @answer = answer
    end

    def execute_script(script, *_args)
      return nil unless script.include?("settleProbe")

      @calls += 1
      return @answer unless @answer == :normal

      { "ready" => true, "imagesPending" => 0, "settled" => @calls > @settle_after }
    end
  end

  it "wraps the generated probe and strips the banner" do
    expr = described_class.expression(150)
    expect(expr).to start_with("return (function settleProbe")
    expect(expr).to end_with(")(document, window, 150);")
    expect(expr).not_to include("AUTO-GENERATED")
  end

  it "polls until the page settles" do
    b = ProbeBrowser.new(settle_after: 3)
    described_class.wait_for(b, quiet_ms: 0, timeout: 5.0)
    expect(b.calls).to eq(4)
  end

  it "gives up rather than hanging on a page that never settles" do
    b = ProbeBrowser.new(settle_after: 10**9)
    started = Time.now
    described_class.wait_for(b, quiet_ms: 0, timeout: 0.3)
    expect(Time.now - started).to be < 2.0
  end

  it "returns at once when the browser cannot evaluate the probe" do
    b = ProbeBrowser.new(answer: "not a hash")
    started = Time.now
    described_class.wait_for(b, quiet_ms: 0, timeout: 5.0)
    expect(b.calls).to eq(1)
    expect(Time.now - started).to be < 1.0
  end

  it "stops best-effort even on a browser that raises" do
    raising = Object.new
    def raising.execute_script(*) = raise("boom")
    expect { described_class.stop(raising) }.not_to raise_error
  end
end
