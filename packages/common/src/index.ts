/**
 * @testivai/common
 * Shared utilities for TestivAI SDKs and CLI
 */

// Types
export * from './types';

// Core API Client
export { CoreApiClient, DEFAULT_CORE_API_URL } from './core-api-client';

// Authentication
export {
  saveCredentials,
  loadCredentials,
  deleteCredentials,
  getApiKey,
  isAuthenticated,
} from './auth';

// Configuration
export {
  DEFAULT_CONFIG,
  findConfigFile,
  loadConfig,
  configExists,
  getOutputDir,
} from './config-loader';

// TestivAI helper for visual checks
export { testivai, witness } from './testivai';

// Compression utilities
export {
  CompressionHelper,
  compressionHelper,
  type CompressionOptions,
  type CompressionResult,
} from './compression';
