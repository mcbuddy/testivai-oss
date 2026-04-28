// TestivAI Visual Regression Example
// Docs: https://testiv.ai/docs#puppeteer
const puppeteer = require('puppeteer');
const { witness } = require('../testivai-witness');

describe('Visual Regression', () => {
  let browser, page;

  beforeAll(async () => {
    browser = await puppeteer.launch({ args: ['--remote-debugging-port=9222'] });
    page = await browser.newPage();
  });

  afterAll(async () => await browser.close());

  it('captures homepage', async () => {
    await page.goto('http://localhost:3000');
    await witness(page, 'homepage');
  });
});
