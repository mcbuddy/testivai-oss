import { TestivAIConfig } from '../src/types';

/**
 * Example configuration for structure analysis in TestivAI
 * 
 * This shows how to configure structure analysis to reduce false positives
 * and focus on meaningful structural changes.
 * 
 * @renamed Was `dom-analysis.config.ts` — renamed to conceal internal layer terminology (IP protection)
 */

export const structureAnalysisConfig: TestivAIConfig = {
  // Structure analysis settings
  // @renamed: dom → structure (IP protection)
  structure: {
    // Enable fingerprint generation (recommended for quick change detection)
    enableFingerprint: true,
    
    // Enable structural analysis (counts elements, depth, etc.)
    enableStructure: true,
    
    // Enable semantic analysis (headings, landmarks, etc.)
    enableSemantic: true,
    
    // Attributes to ignore (prevents false positives from dynamic attributes)
    ignoreAttributes: [
      'data-testid',        // Test attributes
      'data-reactid',       // React internal IDs
      'data-reactroot',     // React root marker
      'ng-version',         // Angular version
      'ng-reflect-router-outlet', // Angular router
      'data-ng-version',    // Angular data attribute
      'style',              // Inline styles (can be dynamic)
      'class',              // CSS classes (often change)
      'id',                 // IDs (can be auto-generated)
      'aria-busy',          // ARIA busy state
      'aria-expanded',      // ARIA expanded state
    ],
    
    // Elements to ignore completely
    ignoreElements: [
      'script',    // Scripts don't affect visual output
      'style',     // Style tags
      'noscript',  // Noscript content
      'meta',      // Meta tags
      'link',      // Link tags (CSS, favicons)
      'title',     // Page title
    ],
    
    // Content patterns to ignore (prevents false positives from dynamic content)
    ignoreContentPatterns: [
      /\d{4}-\d{2}-\d{2}/,     // Dates: 2024-01-12
      /\d{1,2}:\d{2}(:\d{2})?/, // Times: 10:30 or 10:30:45
      /\b\d{4}\b/,              // Years: 2024
      /\b\d+\b/,                // Any standalone number
      /uuid-/i,                 // UUID strings
      /_\d+/,                   // Underscore + number: _123
      /\$\d+\.?\d*/,            // Currency: $19.99
      /\b\d+\.\d+\b/,           // Decimal numbers
      /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i, // Full UUIDs
    ],
  },
  
  // Other TestivAI settings
  layout: {
    sensitivity: 2, // Balanced sensitivity
    tolerance: 2,
  },
  
  ai: {
    sensitivity: 2,
    confidence: 0.8,
  },
};

/**
 * Configuration for strict structure analysis (fewer false positives)
 * Use this when you want to catch only significant structural changes
 */
export const strictStructureConfig: TestivAIConfig = {
  structure: {
    enableFingerprint: true,
    enableStructure: false, // Skip element counts (too sensitive)
    enableSemantic: true,   // Focus on semantic changes only
    ignoreAttributes: [
      'data-testid', 'data-reactid', 'data-reactroot', 'ng-version',
      'style', 'class', 'id', 'aria-busy', 'aria-expanded',
      'data-cy', // Cypress testing attributes
      'data-qa', // QA attributes
    ],
    ignoreElements: [
      'script', 'style', 'noscript', 'meta', 'link', 'title',
      'span', // Inline elements (too many small changes)
    ],
    ignoreContentPatterns: [
      /\d{4}-\d{2}-\d{2}/,
      /\d{1,2}:\d{2}(:\d{2})?/,
      /\b\d{4}\b/,
      /\b\d+\b/,
      /uuid-/i,
      /_\d+/,
      /\$\d+\.?\d*/,
      /\b\d+\.\d+\b/,
      /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i,
      /\w+\d+\w*/, // Alphanumeric with numbers (IDs)
    ],
  },
  layout: {
    sensitivity: 1, // More strict
    tolerance: 1,
  },
  ai: {
    sensitivity: 1, // More conservative
    confidence: 0.9,
  },
};

/**
 * Configuration for component-focused analysis
 * Use this when you care about component changes but not structure details
 */
export const componentFocusedConfig: TestivAIConfig = {
  structure: {
    enableFingerprint: false, // Skip fingerprint
    enableStructure: false,   // Skip structure
    enableSemantic: false,    // Skip semantic
    // Focus only on component detection through data-testid
    ignoreAttributes: ['class', 'style', 'id'],
    ignoreElements: ['script', 'style', 'noscript', 'meta'],
    ignoreContentPatterns: [/\d+/], // Only ignore numbers
  },
  layout: {
    sensitivity: 2,
    tolerance: 3, // More lenient for layout
  },
  ai: {
    sensitivity: 3, // More aggressive AI analysis
    confidence: 0.7,
  },
};

/**
 * Example usage in a Playwright test
 */
/*
import { test } from '@playwright/test';
import { testivai } from '@testivai/witness-playwright';
import { structureAnalysisConfig } from './structure-analysis.config';

test('example with structure analysis', async ({ page }) => {
  await page.goto('https://example.com');
  
  // Capture snapshot with structure analysis
  await testivai.witness(page, test.info(), 'homepage', structureAnalysisConfig);
  
  // The structure analysis will be included in the snapshot metadata
  // and can be used for smarter change detection
});
*/
