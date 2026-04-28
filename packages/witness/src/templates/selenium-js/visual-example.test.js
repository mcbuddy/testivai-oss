// TestivAI Visual Regression Example
// Docs: https://testiv.ai/docs#selenium
const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { witness } = require('../testivai-witness');

describe('Visual Regression', () => {
  let driver;

  beforeAll(async () => {
    const options = new chrome.Options();
    options.addArguments('--remote-debugging-port=9222');
    driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  });

  afterAll(async () => await driver.quit());

  it('captures homepage', async () => {
    await driver.get('http://localhost:3000');
    await witness(driver, 'homepage');
  });
});
