import * as fs from 'fs-extra';
import * as path from 'path';
import { TestivAIProjectConfig, TestivAIConfig } from '../types';

/**
 * Default configuration when no config file is found
 */
const DEFAULT_CONFIG: TestivAIProjectConfig = {};

/**
 * Load TestivAI configuration from file system
 * Supports both .ts and .js config files
 *
 * @returns Promise<TestivAIProjectConfig> The loaded configuration or defaults
 */
export async function loadConfig(): Promise<TestivAIProjectConfig> {
  // Try TypeScript config first, then JavaScript
  const tsConfigPath = path.join(process.cwd(), 'testivai.config.ts');
  const jsConfigPath = path.join(process.cwd(), 'testivai.config.js');

  try {
    let configPath: string;
    let configModule: any;

    // Check for TypeScript config
    if (await fs.pathExists(tsConfigPath)) {
      configPath = tsConfigPath;
    } else if (await fs.pathExists(jsConfigPath)) {
      configPath = jsConfigPath;
    } else {
      // No config file is the normal zero-config case — silently use defaults
      return DEFAULT_CONFIG;
    }

    // Load configuration based on file type
    if (configPath.endsWith('.js')) {
      // For .js files, use require to get CommonJS module
      // Clear require cache to ensure fresh load
      delete require.cache[require.resolve(configPath)];
      configModule = require(configPath);
    } else {
      // For .ts files, use dynamic import (ES module)
      configModule = await import(configPath);
    }

    const config = configModule.default || configModule;
    if (!config) {
      return DEFAULT_CONFIG;
    }

    return {
      ignoreSelectors: config.ignoreSelectors,
      stabilize: config.stabilize,
    };
  } catch (error) {
    console.warn('Warning: failed to load testivai config, using defaults:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Merge per-snapshot configuration with project configuration
 *
 * @param projectConfig The project-level configuration
 * @param testConfig Optional per-snapshot configuration overrides
 * @returns TestivAIConfig The effective configuration for this snapshot
 */
export function mergeTestConfig(
  projectConfig: TestivAIProjectConfig,
  testConfig?: TestivAIConfig
): TestivAIConfig {
  if (!testConfig) {
    return {};
  }

  return {
    useBrowserCapture: testConfig.useBrowserCapture,
    // Per-call capture options must survive the merge: without these,
    // witness(page, testInfo, name, { ignoreSelectors }) silently ignored
    // the selectors (masked for a long time by the diff engine's cumulated
    // threshold absorbing the tiny leaked pixels).
    // Project-level ignoreSelectors and stabilize are read separately
    // (collectIgnoreRules / resolveStabilize) so they are NOT merged here.
    ignoreSelectors: testConfig.ignoreSelectors,
    stabilize: testConfig.stabilize,
    mask: testConfig.mask,
  };
}
