// TestivAI Plugin for Cypress
// Docs: https://testiv.ai/docs#cypress
module.exports = function testivaiPlugin(on, config) {
  on('before:browser:launch', (browser, launchOptions) => {
    if (browser.family === 'chromium') {
      launchOptions.args.push('--remote-debugging-port=9222');
    }
    return launchOptions;
  });
  return config;
};
