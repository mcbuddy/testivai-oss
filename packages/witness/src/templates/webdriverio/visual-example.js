// TestivAI Visual Regression Example
// Docs: https://testiv.ai/docs#webdriverio
const { expect } = require('@wdio/globals');

describe('Visual Regression', () => {
  it('captures homepage', async () => {
    await browser.url('/');
    await browser.witness('homepage');
  });
});
