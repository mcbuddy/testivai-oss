import { test } from '@playwright/test';
import { testivai } from '@testivai/witness-playwright';

test('example.com homepage', async ({ page }, testInfo) => {
  await page.goto('https://example.com');
  await testivai.witness(page, testInfo, 'example-homepage');
});
