import * as fs from 'fs-extra';
import * as path from 'path';
import { TestivAIProjectConfig, TestivAIConfig, LayoutConfig, AIConfig } from '../types';

/**
 * Default configuration when no config file is found
 */
const DEFAULT_CONFIG: TestivAIProjectConfig = {
  layout: {
    sensitivity: 2,        // Balanced sensitivity (0-4 scale)
    tolerance: 1.0,        // 1 pixel base tolerance
  },
  ai: {
    sensitivity: 2,        // Balanced AI analysis (0-4 scale)
    confidence: 0.7,       // 70% confidence required for AI_BUG
  }
};

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
      console.log('⚠️  No testivai.config.ts or testivai.config.js found, using defaults');
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
    
    // Validate and merge with defaults
    return validateAndMergeConfig(config);
    
  } catch (error) {
    console.warn('⚠️  Failed to load testivai config, using defaults:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Merge per-test configuration with project configuration
 * 
 * @param projectConfig The project-level configuration
 * @param testConfig Optional per-test configuration overrides
 * @returns TestivAIConfig The effective configuration for this test
 */
export function mergeTestConfig(
  projectConfig: TestivAIProjectConfig, 
  testConfig?: TestivAIConfig
): TestivAIConfig {
  if (!testConfig) {
    return {
      layout: projectConfig.layout,
      ai: projectConfig.ai,
      // @renamed: dom → structure (IP protection)
      structure: projectConfig.structure,
      performanceMetrics: projectConfig.performanceMetrics
    };
  }
  
  return {
    layout: {
      ...projectConfig.layout,
      ...testConfig.layout
    },
    ai: {
      ...projectConfig.ai,
      ...testConfig.ai
    },
    // @renamed: dom → structure (IP protection)
    structure: {
      ...projectConfig.structure,
      ...testConfig.structure
    },
    performanceMetrics: {
      ...projectConfig.performanceMetrics,
      ...testConfig.performanceMetrics
    },
    selectors: testConfig.selectors,
    useBrowserCapture: testConfig.useBrowserCapture
  };
}

/**
 * Detect current environment (CI, development, production)
 * 
 * @returns string The detected environment
 */
export function detectEnvironment(): string {
  // Check for common CI environment variables
  if (process.env.CI || process.env.CONTINUOUS_INTEGRATION) {
    return 'ci';
  }
  
  // Check for production indicators
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  
  // Default to development
  return 'development';
}

/**
 * Apply environment-specific overrides to configuration
 * 
 * @param config The base configuration
 * @returns TestivAIProjectConfig Configuration with environment overrides applied
 */
export function applyEnvironmentOverrides(config: TestivAIProjectConfig): TestivAIProjectConfig {
  const environment = detectEnvironment();
  
  if (!config.environments) {
    return config;
  }
  
  // Type-safe environment override access
  let envOverrides: { layout?: Partial<LayoutConfig>; ai?: Partial<AIConfig> } | undefined;
  
  switch (environment) {
    case 'ci':
      envOverrides = config.environments.ci;
      break;
    case 'development':
      envOverrides = config.environments.development;
      break;
    case 'production':
      envOverrides = config.environments.production;
      break;
  }
  
  if (!envOverrides) {
    return config;
  }
  
  return {
    layout: {
      ...config.layout,
      ...envOverrides.layout
    },
    ai: {
      ...config.ai,
      ...envOverrides.ai
    },
    environments: config.environments // Keep the original environments config
  };
}

/**
 * Validate configuration values and merge with defaults
 * 
 * @param config The configuration to validate
 * @returns TestivAIProjectConfig Validated configuration
 */
function validateAndMergeConfig(config: any): TestivAIProjectConfig {
  // Guard against null/undefined config
  if (!config) {
    console.warn('⚠️  Config is null or undefined, using defaults');
    return DEFAULT_CONFIG;
  }
  
  // Basic validation
  const validatedConfig: TestivAIProjectConfig = {
    // API configuration with production default
    apiKey: config.apiKey,
    apiUrl: config.apiUrl || 'https://core-api.testiv.ai',
    layout: {
      sensitivity: validateRange(config.layout?.sensitivity ?? DEFAULT_CONFIG.layout.sensitivity, 0, 4, 'layout.sensitivity', DEFAULT_CONFIG.layout.sensitivity),
      tolerance: validateRange(config.layout?.tolerance ?? DEFAULT_CONFIG.layout.tolerance, 0, 100, 'layout.tolerance', DEFAULT_CONFIG.layout.tolerance),
      selectorTolerances: config.layout?.selectorTolerances,
      useRelativeTolerance: config.layout?.useRelativeTolerance,
      relativeTolerance: config.layout?.relativeTolerance
    },
    ai: {
      sensitivity: validateRange(config.ai?.sensitivity ?? DEFAULT_CONFIG.ai.sensitivity, 0, 4, 'ai.sensitivity', DEFAULT_CONFIG.ai.sensitivity),
      confidence: validateRange(config.ai?.confidence ?? DEFAULT_CONFIG.ai.confidence, 0, 1, 'ai.confidence', DEFAULT_CONFIG.ai.confidence),
      enableReasoning: config.ai?.enableReasoning
    },
    // @renamed: dom → structure (IP protection)
    structure: config.structure, // Pass through structure analysis configuration as-is
    performanceMetrics: config.performanceMetrics, // Pass through performance metrics configuration as-is
    environments: config.environments
  };
  
  return applyEnvironmentOverrides(validatedConfig);
}

/**
 * Validate that a number is within the expected range
 * 
 * @param value The value to validate
 * @param min Minimum allowed value
 * @param max Maximum allowed value
 * @param field Field name for error messages
 * @param defaultValue Default value to use when validation fails
 * @returns number The validated value
 */
function validateRange(value: any, min: number, max: number, field: string, defaultValue: number): number {
  const numValue = Number(value);
  
  if (isNaN(numValue)) {
    console.warn(`⚠️  Invalid ${field}: ${value}, using default: ${defaultValue}`);
    return defaultValue;
  }
  
  if (numValue < min || numValue > max) {
    console.warn(`⚠️  ${field} must be between ${min} and ${max}, got ${numValue}, using default: ${defaultValue}`);
    return defaultValue;
  }
  
  return numValue;
}
