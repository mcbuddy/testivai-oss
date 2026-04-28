// TestivAI Visual Regression Helper
// Docs: https://testiv.ai/docs#webdriverio
browser.addCommand('witness', function (name) {
  return this.execute('return window.testivaiWitness(arguments[0])', name);
});
