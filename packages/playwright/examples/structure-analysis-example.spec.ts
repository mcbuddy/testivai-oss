import { test, expect } from '@playwright/test';
import { testivai } from '../src';

/**
 * Structure Analysis Example
 * @renamed Was `DOM Analysis Example` — renamed to conceal internal layer terminology (IP protection)
 */
test.describe('Structure Analysis Example', () => {
  test('should capture structure analysis with snapshot', async ({ page }, testInfo) => {
    // Navigate to a test page
    await page.goto('https://example.com');
    
    // Capture snapshot with structure analysis enabled
    // @renamed: dom → structure (IP protection)
    await testivai.witness(page, testInfo, 'example-homepage', {
      structure: {
        enableFingerprint: true,
        enableStructure: true,
        enableSemantic: true,
        ignoreAttributes: ['data-testid', 'class'],
        ignoreContentPatterns: [/\d{4}-\d{2}-\d{2}/], // Ignore dates
      },
      layout: {
        sensitivity: 2,
        tolerance: 2,
      },
    });
    
    // The structure analysis will be included in the snapshot metadata
    // and can be used for smarter change detection
  });

  test('should demonstrate structure fingerprint consistency', async ({ page }, testInfo) => {
    // Load a page with dynamic content
    await page.setContent(`
      <html>
        <body>
          <h1>Test Page</h1>
          <p>Current time: <span id="time">12:34:56</span></p>
          <p>Date: <span id="date">2024-01-12</span></p>
          <button data-testid="submit-btn">Submit</button>
        </body>
      </html>
    `);
    
    // Capture first snapshot
    await testivai.witness(page, testInfo, 'dynamic-content-1', {
      structure: {
        enableFingerprint: true,
        ignoreContentPatterns: [/\d{4}-\d{2}-\d{2}/, /\d{1,2}:\d{2}:\d{2}/],
      },
    });
    
    // Update dynamic content
    await page.evaluate(() => {
      document.getElementById('time')!.textContent = '13:45:67';
      document.getElementById('date')!.textContent = '2024-01-13';
    });
    
    // Capture second snapshot
    await testivai.witness(page, testInfo, 'dynamic-content-2', {
      structure: {
        enableFingerprint: true,
        ignoreContentPatterns: [/\d{4}-\d{2}-\d{2}/, /\d{1,2}:\d{2}:\d{2}/],
      },
    });
    
    // Both snapshots should have the same fingerprint despite time/date changes
    // This demonstrates how structure analysis reduces false positives
  });

  test('should detect structural changes', async ({ page }, testInfo) => {
    // Initial page structure
    await page.setContent(`
      <html>
        <body>
          <header>
            <h1>My Site</h1>
          </header>
          <main>
            <section>
              <h2>Section 1</h2>
              <p>Content here</p>
            </section>
          </main>
        </body>
      </html>
    `);
    
    // Capture baseline
    await testivai.witness(page, testInfo, 'structure-baseline', {
      structure: {
        enableFingerprint: true,
        enableStructure: true,
        enableSemantic: true,
      },
    });
    
    // Add new element
    await page.evaluate(() => {
      const section = document.querySelector('section');
      const button = document.createElement('button');
      button.textContent = 'New Button';
      section!.appendChild(button);
    });
    
    // Capture after change
    await testivai.witness(page, testInfo, 'structure-changed', {
      structure: {
        enableFingerprint: true,
        enableStructure: true,
        enableSemantic: true,
      },
    });
    
    // The fingerprint should change, detecting the structural modification
  });
});
