import { Command } from 'commander';
import chalk from 'chalk';
import { BrowserClient } from '../browser/client';
import { BrowserBinding } from '../browser/binding';
import { BrowserDiscoveryError } from '../browser/discovery';
import { ProcessManager, setupSignalHandlers } from '../utils/process';
import { logger } from '../utils/logger';
import { loadLocalConfig } from '../config/local-config';
import { generateReport } from '../report/generator';

export const runCommand = new Command('run')
  .description('Run visual tests with automatic capture')
  .argument('<command>', 'Test command to execute (e.g., "npm test", "cypress run")')
  .option('-p, --port <number>', 'Chrome remote debugging port')
  .option('--debug', 'Enable debug logging for snapshots')
  .action(async (command, options) => {
    let client: BrowserClient | null = null;
    let processManager: ProcessManager | null = null;

    // Setup signal handlers for cleanup
    setupSignalHandlers(async () => {
      logger.info('Cleaning up...');
      if (client) {
        await client.disconnect();
      }
      if (processManager) {
        processManager.kill();
      }
    });

    try {
      const cwd = process.cwd();
      const localConfig = loadLocalConfig(cwd);

      // Get browser port from options or default
      const port = parseInt(options.port || '9222', 10);

      // Start the test command FIRST (non-blocking)
      logger.info(`Starting test command: ${chalk.cyan(command)}`);
      processManager = new ProcessManager(command, [], {
        cwd,
        env: {
          ...process.env,
          TESTIVAI_MODE: 'local',
          TESTIVAI_BROWSER_PORT: port.toString(),
          TESTIVAI_CDP_PORT: port.toString(),
        } as Record<string, string>,
      });

      await processManager.start();

      // Give the test command a moment to start launching Chrome
      logger.info('Waiting for test runner to start...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Now wait for Chrome to become available
      logger.info('Waiting for browser connection...');
      client = new BrowserClient();

      let connected = false;
      let retryCount = 0;
      const maxRetries = 60; // Wait up to 60 seconds for Chrome to start

      while (!connected && retryCount < maxRetries && processManager.isRunning()) {
        try {
          await client.connect(port);
          connected = true;
          logger.info('Successfully connected to browser');
        } catch (_error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            logger.warn(`Failed to connect to Chrome after ${maxRetries} attempts. Continuing without browser capture...`);
            break;
          }
          if (!processManager.isRunning()) {
            logger.warn(`Test command exited before Chrome could start. Continuing without browser capture...`);
            break;
          }
          logger.info(`Waiting for Chrome on port ${port}... (${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Set up browser binding if connected
      let binding: BrowserBinding | null = null;
      if (connected) {
        binding = new BrowserBinding(client, { debug: options.debug ?? false });
        await binding.setupBindings();
        logger.info('Browser binding setup complete');
      }

      // Wait for the test command to complete
      logger.info('Monitoring test execution...');
      const result = await processManager.wait();

      // Get all captured snapshots
      if (binding) {
        const snapshots = binding.getSnapshots();
        logger.info(`Captured ${snapshots.length} snapshot(s)`);
        binding.cleanup();
      }

      // Clean up browser connection
      if (client) {
        await client.disconnect();
      }

      // Generate report
      logger.info('Generating visual report...');
      const reportData = generateReport({
        projectRoot: cwd,
        reportDir: localConfig.reportDir || 'visual-report',
        threshold: localConfig.threshold,
        autoOpen: localConfig.autoOpen,
      });

      // Print summary
      const { summary } = reportData;
      console.log();
      console.log(chalk.cyan('  === Visual Report Summary ==='));
      console.log(`  Total: ${summary.total}  |  ` +
        chalk.green(`Passed: ${summary.passed}`) + '  |  ' +
        chalk.red(`Changed: ${summary.changed}`) + '  |  ' +
        chalk.yellow(`New: ${summary.newSnapshots}`));

      if (summary.changed > 0 || summary.newSnapshots > 0) {
        console.log();
        console.log(chalk.gray('  To approve all: npx testivai approve --all'));
      }

      // Exit code
      if (localConfig.failOnDiff && summary.changed > 0) {
        process.exit(1);
      }
      process.exit(result.exitCode || 0);

    } catch (error) {
      if (error instanceof BrowserDiscoveryError) {
        console.log(chalk.red(error.message));
        console.log(...error.getInstructions());
        process.exit(3);
      } else {
        logger.error('Run failed:', error);
        process.exit(4);
      }
    }
  });
