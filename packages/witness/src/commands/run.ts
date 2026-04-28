import { Command } from 'commander';
import chalk from 'chalk';
import { BrowserClient } from '../browser/client';
import { BrowserBinding } from '../browser/binding';
import { BrowserDiscovery, BrowserDiscoveryError } from '../browser/discovery';
import { loadConfig, getApiKey, CoreApiClient, DEFAULT_CORE_API_URL } from '@testivai/common';
import { ProcessManager, setupSignalHandlers } from '../utils/process';
import { logger } from '../utils/logger';
import { GitInfo, BrowserInfo, BatchPayload } from '../types';
import { getCiRunId, getCiInfo, CiInfo } from '../ci';
import simpleGit, { SimpleGit } from 'simple-git';
import { isLocalMode, loadLocalConfig } from '../config/local-config';
import { generateReport } from '../report/generator';

export const runCommand = new Command('run')
  .description('Run visual tests with automatic capture')
  .argument('<command>', 'Test command to execute (e.g., "npm test", "cypress run")')
  .option('-p, --port <number>', 'Chrome remote debugging port')
  .option('-b, --batch-id <id>', 'Specify batch ID (auto-generated if not provided)')
  .option('--debug', 'Enable debug logging for snapshots')
  .action(async (command, options) => {
    let client: BrowserClient | null = null;
    let processManager: ProcessManager | null = null;
    let batchId: string | null = null;

    // Setup signal handlers for cleanup
    setupSignalHandlers(async () => {
      logger.info('Cleaning up...');
      if (batchId) {
        await finishBatch(batchId);
      }
      if (client) {
        await client.disconnect();
      }
      if (processManager) {
        processManager.kill();
      }
    });

    try {
      // ── Local mode check ────────────────────────────────────────────────
      const cwd = process.cwd();
      if (isLocalMode(cwd)) {
        const localConfig = loadLocalConfig(cwd);
        logger.info('Running in local mode...');
        
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
          } catch (error) {
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
          binding = new BrowserBinding(client, { debug: false });
          await binding.setupBindings();
          logger.info('Browser binding setup complete');
        }

        // Wait for the test command to complete
        logger.info('Monitoring test execution...');
        const result = await processManager.wait();

        // Get all captured snapshots
        let snapshots: any[] = [];
        if (binding) {
          snapshots = binding.getSnapshots();
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
        console.log(chalk.cyan('  ═══ Visual Report Summary ═══'));
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
      }

      // ── Cloud mode (existing flow) ──────────────────────────────────────
      // Load configuration
      const config = loadConfig();
      const apiKey = getApiKey();
      
      // Check debug flag from command line or config
      const isDebug = options.debug || (config as any)?.debug || false;

      if (!apiKey) {
        logger.error('Not authenticated. Run "testivai auth <api-key>" first.');
        process.exit(2);
      }

      // Validate API key
      logger.info('Validating API key...');
      const apiClient = new CoreApiClient(apiKey);
      const validation = await apiClient.validateApiKey();
      if (!validation.valid) {
        logger.error(`Invalid API key: ${validation.error}`);
        process.exit(2);
      }

      // Get browser port from config or options
      const resolvedConfig = await config as any;
      const port = parseInt(options.port || resolvedConfig.browserPort || resolvedConfig.cdpPort || '9222', 10);

      // Get git info first (doesn't require Chrome)
      const gitInfo = await getGitInfo();

      // Detect CI environment
      const ciRunId = getCiRunId();
      const ciInfo = getCiInfo();
      if (ciRunId && isDebug) {
        logger.info(`Detected CI environment. Run ID: ${ciRunId}`);
        if (ciInfo) {
          logger.info(`CI Info: provider=${ciInfo.provider}, PR=#${ciInfo.prNumber || 'N/A'}`);
        }
      }

      // Start the test command FIRST (non-blocking)
      // This allows the test runner to launch Chrome
      logger.info(`Starting test command: ${chalk.cyan(command)}`);
      processManager = new ProcessManager(command, [], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          TESTIVAI_MODE: 'true',
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
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw new Error(`Failed to connect to Chrome after ${maxRetries} attempts. The test runner may not be launching Chrome with --remote-debugging-port=${port}`);
          }
          if (!processManager.isRunning()) {
            throw new Error(`Test command exited before Chrome could start. Make sure your test runner launches Chrome with --remote-debugging-port=${port}`);
          }
          logger.info(`Waiting for Chrome on port ${port}... (${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!connected) {
        throw new Error('Failed to connect to browser');
      }

      // Get browser info
      const browserInfo = await getBrowserInfo(client);

      // Set up browser binding
      const binding = new BrowserBinding(client, { debug: isDebug });
      await binding.setupBindings();

      // Wait for the test command to complete
      logger.info('Monitoring test execution...');
      const result = await processManager.wait();

      // Get all captured snapshots
      const snapshots = binding.getSnapshots();
      logger.info(`Captured ${snapshots.length} snapshot(s)`);
      
      // Clean up browser connection
      binding.cleanup();

      // Start batch with snapshots (like Playwright SDK)
      if (snapshots.length > 0) {
        batchId = options.batchId || await startBatchWithSnapshots(apiClient, gitInfo, browserInfo, snapshots, isDebug, ciRunId, ciInfo);
      } else {
        batchId = options.batchId || await startBatch(apiClient, gitInfo, browserInfo, ciRunId, ciInfo);
      }

      // Finish batch
      if (batchId) {
        await finishBatch(batchId);
      }

      // Print results
      console.log(chalk.green('\n=== Test Results ==='));
      console.log(`Batch ID: ${batchId}`);
      console.log(`Snapshots: ${snapshots.length}`);
      console.log(`Exit code: ${result.exitCode}`);
      console.log(`Dashboard: https://dashboard.testiv.ai/projects/${validation.projectId}/batches/${batchId}`);

      // Exit with same code as test command
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

/**
 * Get browser information
 */
async function getBrowserInfo(client: BrowserClient): Promise<BrowserInfo> {
  try {
    const connectionInfo = client.getConnectionInfo();
    
    // Navigate to a blank page to ensure viewport is properly initialized
    await client.send('Page.navigate', { url: 'about:blank' });
    
    // Wait a moment for the page to load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const userAgent = await client.send('Runtime.evaluate', {
      expression: 'navigator.userAgent',
      returnByValue: true,
    });

    const viewport = await client.send('Runtime.evaluate', {
      expression: `
        (function() {
          return {
            width: window.innerWidth,
            height: window.innerHeight
          };
        })()
      `,
      returnByValue: true,
    });

    // Ensure we have valid viewport dimensions
    const width = viewport.result.value?.width || 1920; // Default fallback
    const height = viewport.result.value?.height || 1080; // Default fallback

    return {
      name: 'chrome',
      version: connectionInfo?.browserVersion || 'unknown',
      viewportWidth: width,
      viewportHeight: height,
      userAgent: userAgent.result.value || 'unknown',
      os: 'unknown',
      device: 'desktop',
    };
  } catch (error) {
    logger.error('Failed to get browser info:', error);
    // Return sensible defaults if we can't get the actual values
    return {
      name: 'chrome',
      version: 'unknown',
      viewportWidth: 1920,
      viewportHeight: 1080,
      userAgent: 'unknown',
      os: 'unknown',
      device: 'desktop',
    };
  }
}

/**
 * Get git information
 */
async function getGitInfo(): Promise<GitInfo> {
  try {
    const git: SimpleGit = simpleGit();
    const [branch, commit, message, author] = await Promise.all([
      git.revparse(['--abbrev-ref', 'HEAD']).catch(() => 'unknown'),
      git.revparse(['HEAD']).catch(() => 'unknown'),
      git.show(['-s', '--format=%s']).catch(() => ''),
      git.show(['-s', '--format=%an']).catch(() => ''),
    ]);

    return {
      branch,
      commit,
      message: message || undefined,
      author: author || undefined,
    };
  } catch (error) {
    logger.error('Failed to get git info:', error);
    return {
      branch: 'unknown',
      commit: 'unknown',
    };
  }
}

/**
 * Start a new batch with snapshots (like Playwright SDK)
 */
async function startBatchWithSnapshots(
  apiClient: CoreApiClient,
  gitInfo: GitInfo,
  browserInfo: BrowserInfo,
  snapshots: any[],
  debug?: boolean,
  ciRunId?: string | null,
  ciInfo?: CiInfo | null,
): Promise<string> {
  try {
    // Transform snapshots to match API format
    const transformedSnapshots = snapshots.map(snapshot => {
      const structureHtml = snapshot.structure || '';
      if (debug) {
        logger.info(`DEBUG: Snapshot ${snapshot.name} - Structure length: ${structureHtml.length} chars`);
      }
      if (structureHtml.length === 0) {
        logger.warn(`WARNING: Empty structure for snapshot ${snapshot.name}`);
      } else if (debug) {
        logger.info(`DEBUG: Structure preview: ${structureHtml.substring(0, 100)}...`);
      }
      
      return {
        snapshotName: snapshot.name,
        testName: snapshot.name,
        timestamp: new Date(snapshot.timestamp).getTime(),
        url: snapshot.url || 'about:blank',
        viewport: snapshot.viewport || { width: 1920, height: 1080 },
        screenshotData: snapshot.screenshot, // Already base64 encoded
        structure: { html: structureHtml },
        styles: snapshot.styles || { computed_styles: {} },
        performanceMetrics: snapshot.performanceMetrics,
        layout: {
          x: 0,
          y: 0,
          width: snapshot.viewport?.width || 1920,
          height: snapshot.viewport?.height || 1080
        }
      };
    });

    const batchPayload = {
      git: gitInfo,
      browser: browserInfo,
      snapshots: transformedSnapshots,
      timestamp: Date.now(),
      runId: ciRunId || process.env.CI_RUN_ID || null,
      ci: ciInfo || null,
    };

    // Compress if large
    const compressionHelper = (await import('@testivai/common')).compressionHelper;
    const payloadJson = JSON.stringify(batchPayload);
    const compressionResult = await compressionHelper.compress(payloadJson);

    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API key is required');
    }
    
    const apiUrl = process.env.TESTIVAI_API_URL || DEFAULT_CORE_API_URL;
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(`${apiUrl}/api/v1/ingest/start-batch`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
        ...(compressionResult.compressionRatio > 0 && {
          'Content-Encoding': 'gzip',
        }),
      },
      body: compressionResult.data,
      signal: controller.signal,
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Failed to start batch: ${response.statusText}`);
    }

    const result = await response.json() as { batch_id?: string; batchId?: string };
    const returnedBatchId = result.batch_id || result.batchId;
    if (!returnedBatchId) {
      throw new Error('No batch ID returned from API');
    }
    return returnedBatchId;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error('Failed to start batch: Request timed out after 30 seconds');
    } else {
      logger.error('Failed to start batch:', error);
    }
    throw error;
  }
}

/**
 * Start a new batch (without snapshots)
 */
async function startBatch(
  apiClient: CoreApiClient,
  gitInfo: GitInfo,
  browserInfo: BrowserInfo,
  ciRunId?: string | null,
  ciInfo?: CiInfo | null,
): Promise<string> {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API key is required');
    }
    
    const apiUrl = process.env.TESTIVAI_API_URL || DEFAULT_CORE_API_URL;
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(`${apiUrl}/api/v1/ingest/start-batch`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        git: gitInfo,
        browser: browserInfo,
        snapshots: [],
        timestamp: Date.now(),
        runId: ciRunId || process.env.CI_RUN_ID || null,
        ci: ciInfo || null,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Failed to start batch: ${response.statusText}`);
    }

    const result = await response.json() as any;
    logger.upload(result.batch_id);
    return result.batch_id;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error('Failed to start batch: Request timed out after 30 seconds');
    } else {
      logger.error('Failed to start batch:', error);
    }
    throw error;
  }
}


/**
 * Finish a batch
 */
async function finishBatch(batchId: string): Promise<void> {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API key is required');
    }
    
    const apiUrl = process.env.TESTIVAI_API_URL || DEFAULT_CORE_API_URL;
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(`${apiUrl}/api/v1/ingest/finish-batch/${batchId}`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Failed to finish batch: ${response.statusText}`);
    }

    logger.success(`Batch ${batchId} finished successfully`);
  } catch (error) {
    logger.error('Failed to finish batch:', error);
    // Don't throw here - we want to exit even if finishing fails
  }
}
