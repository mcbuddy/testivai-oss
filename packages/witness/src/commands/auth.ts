import { Command } from 'commander';
import chalk from 'chalk';
import {
  getApiKey,
  saveCredentials,
  loadCredentials,
  deleteCredentials,
  isAuthenticated,
  CoreApiClient,
} from '@testivai/common';
import { logger } from '../utils/logger';

export const authCommand = new Command('auth')
  .description('Authenticate with your TestivAI API key')
  .argument('[api-key]', 'Your TestivAI API key (optional if TESTIVAI_API_KEY env var is set)')
  .option('--check', 'Check if you are authenticated')
  .option('--show', 'Show current API key')
  .option('--delete', 'Delete stored credentials')
  .action(async (apiKey, options) => {
    try {
      // Check authentication status
      if (options.check) {
        const key = getApiKey();
        if (key) {
          logger.success(`Authenticated with API key: ${maskApiKey(key)}`);
          
          // Validate the key with the server
          const client = new CoreApiClient(key);
          const validation = await client.validateApiKey();
          
          if (validation.valid) {
            logger.success(`API key is valid for project: ${validation.projectName}`);
            if (validation.organizationName) {
              logger.info(`Organization: ${validation.organizationName}`);
            }
          } else {
            logger.error(`API key validation failed: ${validation.error}`);
            process.exit(1);
          }
        } else {
          logger.error('Not authenticated. Run "testivai auth <api-key>" to authenticate.');
          process.exit(1);
        }
        return;
      }

      // Show current API key
      if (options.show) {
        const key = getApiKey();
        if (key) {
          logger.info(`Current API key: ${maskApiKey(key)}`);
        } else {
          logger.warn('No API key is stored. Set TESTIVAI_API_KEY environment variable or run "testivai auth <api-key>"');
        }
        return;
      }

      // Delete stored credentials
      if (options.delete) {
        const credentials = loadCredentials();
        if (credentials) {
          deleteCredentials();
          logger.success('Deleted stored credentials');
        } else {
          logger.warn('No stored credentials to delete');
        }
        return;
      }

      // Authenticate with API key
      const envKey = process.env.TESTIVAI_API_KEY;
      const keyToUse = apiKey || envKey;

      if (!keyToUse) {
        logger.error('No API key provided.');
        logger.info('Usage:');
        logger.info('  testivai auth <api-key>');
        logger.info('  TESTIVAI_API_KEY=<api-key> testivai auth');
        logger.info('');
        logger.info('Get your API key from: https://dashboard.testiv.ai');
        process.exit(1);
      }

      // Validate API key format
      if (!keyToUse.startsWith('tstvai-')) {
        logger.warn('Warning: API key should start with "tstvai-"');
      }

      // Test the API key
      logger.info('Validating API key...');
      const client = new CoreApiClient(keyToUse);
      const validation = await client.validateApiKey();

      if (!validation.valid) {
        logger.error(`Invalid API key: ${validation.error}`);
        process.exit(1);
      }

      // Save credentials if not from environment
      if (!envKey) {
        saveCredentials({
          apiKey: keyToUse,
          validatedAt: new Date().toISOString(),
          projectId: validation.projectId,
          projectName: validation.projectName,
        });
        logger.success('API key saved locally');
      } else {
        logger.success('Using API key from environment variable');
      }

      // Show success message
      logger.success(`Authenticated successfully!`);
      logger.info(`Project: ${validation.projectName}`);
      if (validation.organizationName) {
        logger.info(`Organization: ${validation.organizationName}`);
      }
      logger.info(`API key: ${maskApiKey(keyToUse)}`);

    } catch (error) {
      logger.error('Authentication failed:', error);
      process.exit(1);
    }
  });

/**
 * Mask API key for display
 */
function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) {
    return '[invalid]';
  }
  return `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`;
}
