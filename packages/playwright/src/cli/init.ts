#!/usr/bin/env node

import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Basic CLI init script for TestivAI Playwright SDK
 * Creates a testivai.config.ts file with sensible defaults
 */

const DEFAULT_CONFIG = `/**
 * TestivAI Configuration File
 * 
 * This file configures how TestivAI analyzes visual differences in your tests.
 * 
 * Layout Settings:
 * - sensitivity: 0-4 scale (0=strict/precise, 4=very lenient)
 * - tolerance: Base pixel tolerance for layout differences
 * 
 * AI Settings:
 * - sensitivity: 0-4 scale (0=conservative, 4=aggressive)
 * - confidence: 0.0-1.0 scale (minimum confidence required for AI_BUG verdict)
 * 
 * Custom Configuration Examples:
 * 
 * // For strict testing (critical components):
 * export default {
 *   layout: { sensitivity: 0, tolerance: 0.5 },
 *   ai: { sensitivity: 0, confidence: 0.9 }
 * };
 * 
 * // For lenient testing (dynamic content):
 * export default {
 *   layout: { sensitivity: 4, tolerance: 3.0 },
 *   ai: { sensitivity: 3, confidence: 0.6 }
 * };
 * 
 * // Per-selector tolerances (advanced):
 * export default {
 *   layout: { 
 *     sensitivity: 2, 
 *     tolerance: 1.0,
 *     selectorTolerances: {
 *       '.carousel': 4.0,      // Carousel components shift
 *       '.dropdown': 2.0,      // Dropdowns can vary
 *       '.tooltip': 5.0,       // Tooltips are highly variable
 *       '.submit-button': 0.5  // Critical buttons need precision
 *     }
 *   },
 *   ai: { sensitivity: 2, confidence: 0.7 }
 * };
 * 
 * // Environment-specific overrides:
 * export default {
 *   layout: { sensitivity: 2, tolerance: 1.0 },
 *   ai: { sensitivity: 2, confidence: 0.7 },
 *   environments: {
 *     ci: {
 *       layout: { sensitivity: 1, tolerance: 0.5 },  // Stricter in CI
 *       ai: { sensitivity: 1, confidence: 0.8 }
 *     },
 *     development: {
 *       layout: { sensitivity: 3, tolerance: 2.0 },  // More lenient locally
 *       ai: { sensitivity: 3, confidence: 0.6 }
 *     }
 *   }
 * };
 */

export default {
  // Your TestivAI API key - get this from the dashboard after creating a project
  apiKey: process.env.TESTIVAI_API_KEY || '',
  
  // API endpoint - automatically points to production
  apiUrl: process.env.TESTIVAI_API_URL || 'https://core-api.testiv.ai',
  
  layout: {
    sensitivity: 2,        // Balanced sensitivity (0-4 scale)
    tolerance: 1.0,        // 1 pixel base tolerance
  },
  ai: {
    sensitivity: 2,        // Balanced AI analysis (0-4 scale)
    confidence: 0.7,       // 70% confidence required for AI_BUG
  }
};
`;

async function createConfigFile(): Promise<void> {
  const configPath = path.join(process.cwd(), 'testivai.config.ts');
  
  // Check if config already exists
  if (await fs.pathExists(configPath)) {
    console.log('❌ TestivAI config already exists at:', configPath);
    console.log('   Delete it first if you want to regenerate it.');
    process.exit(1);
  }
  
  try {
    // Create the config file
    await fs.writeFile(configPath, DEFAULT_CONFIG, 'utf8');
    console.log('✅ TestivAI configuration created successfully!');
    console.log('📁 Config file:', configPath);
    console.log('');
    console.log('📖 Next steps:');
    console.log('   1. Set up your API key:');
    console.log('      TESTIVAI_API_KEY=tstvai-your-key-here');
    console.log('');
    console.log('   2. Update your playwright.config.ts to use TestivAI reporter:');
    console.log('      reporter: [[\'@testivai/witness-playwright/reporter\']]');
    console.log('');
    console.log('   3. Review and customize testivai.config.ts');
    console.log('   4. Run your tests: npx playwright test');
    console.log('');
    console.log('💡 Get your API key from: https://dashboard.testiv.ai');
    console.log('💡 The SDK automatically connects to the production API - no URL configuration needed!');
    
  } catch (error) {
    console.error('❌ Failed to create configuration file:', error);
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  createConfigFile().catch(error => {
    console.error('❌ CLI init failed:', error);
    process.exit(1);
  });
}

export { createConfigFile };
