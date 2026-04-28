/**
 * Configuration loader for TestivAI
 * Loads testivai.config.ts from the project root
 */

import * as fs from 'fs';
import * as path from 'path';
import { TestivaiConfig } from './types';

const CONFIG_FILE_NAMES = ['testivai.config.ts', 'testivai.config.js'];

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: TestivaiConfig = {
  outputDir: './visual-tests',
  viewport: {
    width: 1280,
    height: 720,
  },
};

/**
 * Find the config file in the current directory or parent directories
 */
export function findConfigFile(startDir: string = process.cwd()): string | null {
  let currentDir = startDir;

  while (currentDir !== path.dirname(currentDir)) {
    for (const fileName of CONFIG_FILE_NAMES) {
      const configPath = path.join(currentDir, fileName);
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

/**
 * Load configuration from file
 * Returns default config if no config file is found
 */
export async function loadConfig(configPath?: string): Promise<TestivaiConfig> {
  const resolvedPath = configPath || findConfigFile();

  if (!resolvedPath) {
    return DEFAULT_CONFIG;
  }

  try {
    // For TypeScript files, we need to use dynamic import
    // This requires the project to have ts-node or similar configured
    const configModule = await import(resolvedPath);
    const userConfig = configModule.default || configModule;

    return {
      ...DEFAULT_CONFIG,
      ...userConfig,
    };
  } catch (error) {
    console.warn(`Warning: Could not load config from ${resolvedPath}. Using defaults.`);
    return DEFAULT_CONFIG;
  }
}

/**
 * Check if a config file exists in the current directory
 */
export function configExists(dir: string = process.cwd()): boolean {
  for (const fileName of CONFIG_FILE_NAMES) {
    if (fs.existsSync(path.join(dir, fileName))) {
      return true;
    }
  }
  return false;
}

/**
 * Get the output directory from config, resolved to absolute path
 */
export function getOutputDir(config: TestivaiConfig, baseDir: string = process.cwd()): string {
  const outputDir = config.outputDir || DEFAULT_CONFIG.outputDir!;
  return path.isAbsolute(outputDir) ? outputDir : path.join(baseDir, outputDir);
}
