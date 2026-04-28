/**
 * TestivAI helper for visual regression testing
 * 
 * This is a lightweight wrapper that can be used in generated test scripts.
 * 
 * NOTE: The witness function uses the deprecated submitVisualCheck method.
 * For new implementations, use the batch ingest flow instead.
 */

import { CoreApiClient } from './core-api-client';
import { getApiKey } from './auth';
import type { Page } from 'playwright';

/**
 * Capture a visual snapshot and submit to TestivAI
 * 
 * This is the main function for capturing visual evidence.
 * Aligns with the @testivai/witness-playwright SDK terminology.
 */
export async function witness(page: Page, name: string): Promise<void> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('TestivAI API key not found. Run: testivai auth <your-api-key>');
  }

  // Take screenshot
  const screenshot = await page.screenshot({ fullPage: true });
  
  // Get page URL and HTML
  const url = page.url();
  const html = await page.content();
  
  // Submit to TestivAI
  const client = new CoreApiClient(apiKey);
  
  try {
    const result = await client.submitVisualCheck({
      name,
      url,
      screenshot,
      html,
      viewport: page.viewportSize() || { width: 1280, height: 720 },
    });
    
    if (result.hasDiff) {
      throw new Error(`Visual diff detected for "${name}". View results at: ${result.dashboardUrl || 'https://dashboard.testiv.ai'}`);
    }
    
    console.log(`✓ Visual check passed: ${name}`);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to submit visual check: ${error}`);
  }
}

/**
 * TestivAI namespace for use in generated scripts
 * 
 * Provides the main witness function for capturing visual evidence.
 */
export const testivai = {
  witness,
};
