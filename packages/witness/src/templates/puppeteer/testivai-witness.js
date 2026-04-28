// TestivAI Visual Regression Helper
// Docs: https://testiv.ai/docs#puppeteer
async function witness(page, name) {
  return page.evaluate((n) => window.testivaiWitness(n), name);
}
module.exports = { witness };
