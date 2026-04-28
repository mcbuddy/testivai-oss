// TestivAI Visual Regression Helper
// Docs: https://testiv.ai/docs#selenium
async function witness(driver, name) {
  return driver.executeScript(`return window.testivaiWitness('${name}')`);
}
module.exports = { witness };
