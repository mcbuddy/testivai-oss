/**
 * TestivAI Witness SDK
 * Framework-agnostic visual regression testing CLI
 */

// Export types
export * from './types';

// Export browser modules
export { BrowserClient } from './browser/client';
export { BrowserCapture } from './browser/capture';
export { BrowserBinding } from './browser/binding';
export { BrowserDiscovery, BrowserDiscoveryError } from './browser/discovery';

// Export utilities
export { logger, createLogger } from './utils/logger';
export { toSafeFilename, generateUniqueFilename, extractNameFromUrl, sanitizeTestName, isSafeFilename } from './utils/file-naming';
export { ProcessManager, spawnProcess, setupSignalHandlers, commandExists } from './utils/process';
export { FrameworkDetector } from './utils/framework-detect';

// Export diff engine
export * from './diff';

// Export baselines
export { BaselineStore } from './baselines';
export type { BaselineMetadata } from './baselines';

// Export local config
export {
  loadLocalConfig,
  createDefaultConfig,
  localConfigExists,
  isLocalMode,
  getConfigPath,
  getDefaultConfig,
} from './config';
export type { LocalConfig } from './config';

// Export report generator
export { generateReport, compareAll, renderHtml } from './report';
export type { GenerateReportOptions, CompareOptions, ReportData, ReportSummary, SnapshotResult, SnapshotStatus } from './report';

// Export commands (for programmatic use)
export { authCommand } from './commands/auth';
export { initCommand } from './commands/init';
export { runCommand } from './commands/run';
export { witnessCommand } from './commands/capture';
export { approveCommand } from './commands/approve';

// Re-export common utilities
export {
  CoreApiClient,
  DEFAULT_CORE_API_URL,
  saveCredentials,
  loadCredentials,
  deleteCredentials,
  getApiKey,
  isAuthenticated,
  findConfigFile,
  loadConfig,
  configExists,
  getOutputDir,
  CompressionHelper,
  compressionHelper,
} from '@testivai/common';

// Version
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const VERSION = require('../package.json').version;
