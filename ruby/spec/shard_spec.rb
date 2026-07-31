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
