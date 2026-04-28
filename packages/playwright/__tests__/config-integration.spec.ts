import { test, expect } from '@playwright/test';
import { snapshot } from '../src/snapshot';
import * as fs from 'fs-extra';
import * as path from 'path';

test.describe('Configuration Integration', () => {
  
  test('loads default configuration when no config file exists', async ({ page }) => {
    // Remove any existing config file
    const configPath = path.join(process.cwd(), 'testivai.config.ts');
    if (await fs.pathExists(configPath)) {
      await fs.remove(configPath);
    }
    
    await page.goto('data:text/html,<html><body><h1>Test Page</h1></body></html>');
    
    // Mock TestInfo object
    const mockTestInfo = {
      title: 'Configuration Test'
    } as any;
    
    // This should use default configuration
    await snapshot(page, mockTestInfo, 'test-no-config');
    
    // Check that metadata was created with default config
    const tempDir = path.join(process.cwd(), '.testivai', 'temp');
    const files = await fs.readdir(tempDir);
    const metadataFile = files.find(f => f.endsWith('.json'));
    
    expect(metadataFile).toBeDefined();
    
    const metadata = await fs.readJson(path.join(tempDir, metadataFile!));
    expect(metadata.testivaiConfig).toBeDefined();
    expect(metadata.testivaiConfig.layout.sensitivity).toBe(2);
    expect(metadata.testivaiConfig.layout.tolerance).toBe(1.0);
    expect(metadata.testivaiConfig.ai.sensitivity).toBe(2);
    expect(metadata.testivaiConfig.ai.confidence).toBe(0.7);
  });
  
  test('uses custom configuration when provided', async ({ page }) => {
    await page.goto('data:text/html,<html><body><h1>Test Page</h1></body></html>');
    
    // Mock TestInfo object
    const mockTestInfo = {
      title: 'Custom Config Test'
    } as any;
    
    // Test with custom configuration
    const customConfig = {
      layout: {
        sensitivity: 0,  // Strict
        tolerance: 0.5
      },
      ai: {
        sensitivity: 4,  // Aggressive
        confidence: 0.9
      },
      selectors: ['h1']
    };
    
    await snapshot(page, mockTestInfo, 'test-custom-config', customConfig);
    
    // Check that metadata was created with custom config
    const tempDir = path.join(process.cwd(), '.testivai', 'temp');
    const files = await fs.readdir(tempDir);
    const metadataFile = files.find(f => f.includes('test_custom_config') && f.endsWith('.json'));
    
    expect(metadataFile).toBeDefined();
    
    const metadata = await fs.readJson(path.join(tempDir, metadataFile!));
    expect(metadata.testivaiConfig).toBeDefined();
    expect(metadata.testivaiConfig.layout.sensitivity).toBe(0);
    expect(metadata.testivaiConfig.layout.tolerance).toBe(0.5);
    expect(metadata.testivaiConfig.ai.sensitivity).toBe(4);
    expect(metadata.testivaiConfig.ai.confidence).toBe(0.9);
    expect(metadata.testivaiConfig.selectors).toEqual(['h1']);
  });
  
  test('CLI generates valid configuration file', async () => {
    // Remove existing config
    const configPath = path.join(process.cwd(), 'testivai.config.ts');
    if (await fs.pathExists(configPath)) {
      await fs.remove(configPath);
    }
    
    // Run CLI init using direct file system operations
    const { createConfigFile } = require('../dist/cli/init');
    await createConfigFile();
    
    // Verify config file was created
    expect(await fs.pathExists(configPath)).toBe(true);
    
    // Verify config file content
    const configContent = await fs.readFile(configPath, 'utf8');
    expect(configContent).toContain('export default');
    expect(configContent).toContain('sensitivity: 2');
    expect(configContent).toContain('tolerance: 1.0');
    expect(configContent).toContain('confidence: 0.7');
    expect(configContent).toContain('Custom Configuration Examples');
  });
  
});
