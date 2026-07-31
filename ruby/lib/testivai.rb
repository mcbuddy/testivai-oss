# frozen_string_literal: true

require_relative "testivai/version"
require_relative "testivai/config"
require_relative "testivai/element_map"
require_relative "testivai/shard"
require_relative "testivai/capture"

# TestivAI — local-first visual regression testing for Ruby test suites.
#
#   require "testivai"
#
#   it "renders the homepage" do
#     visit "/"
#     Testivai.witness(page, "homepage")
#   end
#
# Then compare and build the report:
#
#   npx testivai report
module Testivai
  # Capture a snapshot. See Testivai::Capture.witness for options.
  def self.witness(session, name, **options)
    Capture.witness(session, name, **options)
  end
end
