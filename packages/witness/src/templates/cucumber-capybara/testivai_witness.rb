# TestivAI Visual Regression Helper
# Docs: https://testiv.ai/docs#ruby
module TestivaiWitness
  def witness(name)
    page.driver.browser.execute_script("return window.testivaiWitness('#{name}')")
  end
end
