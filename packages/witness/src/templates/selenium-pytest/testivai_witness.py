# TestivAI Visual Regression Helper
# Docs: https://testiv.ai/docs#python
def witness(driver, name):
    """Capture a visual snapshot."""
    return driver.execute_script(f"return window.testivaiWitness('{name}')")
