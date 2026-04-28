# TestivAI Visual Regression Helper for Robot Framework
# Docs: https://testiv.ai/docs#python
def witness(driver, name):
    return driver.execute_script(f"return window.testivaiWitness('{name}')")
