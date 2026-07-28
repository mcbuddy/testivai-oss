# TestivAI Visual Regression Helper
# Docs: https://testiv.ai/docs/frameworks/ruby/
#
# Requires the gem:  gem "testivai", group: :test
#
# This wrapper is optional — `Testivai.witness(page, name)` works directly.
# It exists so specs can call a bare `witness("name")`.
require "testivai"

module TestivaiWitness
  def witness(name, **options)
    Testivai.witness(page, name, **options)
  end
end
