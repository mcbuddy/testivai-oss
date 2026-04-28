# TestivAI Visual Regression Example
# Docs: https://testiv.ai/docs#ruby
require 'spec_helper'
require_relative '../../testivai_witness'

RSpec.describe 'Visual Regression', type: :feature do
  include TestivaiWitness

  it 'captures homepage' do
    visit '/'
    witness 'homepage'
  end
end
