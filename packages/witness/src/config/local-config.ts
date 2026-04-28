/**
 * TestivAI Local Configuration
 *
 * Reads/writes `.testivai/config.json` for local mode settings.
 * This file is the primary signal that a project is in local mode.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface LocalConfig {
  /** Operating mode: 'local' or 'cloud' */
  mode: 'local' | 'cloud';
  /** Pixel diff threshold (0-1). Default: 0.1 */
  threshold: number;
  /** Auto-open HTML report in browser after test run. Default: true */
  autoOpen: boolean;
  /** Fail the test run if any diffs are detected. Default: false */
  failOnDiff: boolean;
  /** Directory for baselines relative to project root. Default: '.testivai/baselines' */
  baselinesDir?: string;
  /** Directory for report output. Default: 'visual-report' */
  reportDir?: string;
}

const DEFAULT_CONFIG: LocalConfig = {
  mode: 'local',
  threshold: 0.1,
  autoOpen: true,
  failOnDiff: false,
};

const CONFIG_FILENAME = 'config.json';
const CONFIG_DIR = '.testivai';

/**
 * Load local config from `.testivai/config.json`.
 * Returns defaults if the file does not exist.
 *
 * @param projectRoot - Root of the project (where `.testivai/` lives)
 */
export function loadLocalConfig(projectRoot: string): LocalConfig {
  const configPath = getConfigPath(projectRoot);
  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
    };
  } catch {
    // If the file is malformed, return defaults
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Create a default `.testivai/config.json` file.
 * Creates the `.testivai/` directory if it doesn't exist.
 *
 * @param projectRoot - Root of the project
 * @param overrides - Optional config values to override defaults
 * @returns The config that was written
 */
export function createDefaultConfig(
  projectRoot: string,
  overrides?: Partial<LocalConfig>,
): LocalConfig {
  const config: LocalConfig = {
    ...DEFAULT_CONFIG,
    ...overrides,
  };

  const configDir = path.join(projectRoot, CONFIG_DIR);
  fs.mkdirSync(configDir, { recursive: true });

  const configPath = getConfigPath(projectRoot);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

  return config;
}

/**
 * Check if a local config file exists.
 */
export function localConfigExists(projectRoot: string): boolean {
  return fs.existsSync(getConfigPath(projectRoot));
}

/**
 * Detect if the project is in local mode.
 * Priority: `.testivai/config.json` → check for mode field → default false.
 */
export function isLocalMode(projectRoot: string): boolean {
  if (!localConfigExists(projectRoot)) {
    return false;
  }
  const config = loadLocalConfig(projectRoot);
  return config.mode === 'local';
}

/**
 * Get the full path to the config file.
 */
export function getConfigPath(projectRoot: string): string {
  return path.join(projectRoot, CONFIG_DIR, CONFIG_FILENAME);
}

/**
 * Get default config values (useful for testing).
 */
export function getDefaultConfig(): LocalConfig {
  return { ...DEFAULT_CONFIG };
}
