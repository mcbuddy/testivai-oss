# TestivAI Step Definitions
# Docs: https://testiv.ai/docs#ruby
require_relative '../../testivai_witness'
World(TestivaiWitness)

Then('the {string} page looks correct') do |name|
  witness name
end
