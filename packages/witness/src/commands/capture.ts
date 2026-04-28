import { Command } from 'commander';
import chalk from 'chalk';
import { BrowserClient } from '../browser/client';
import { BrowserCapture } from '../browser/capture';
import { BrowserDiscovery, BrowserDiscoveryError } from '../browser/discovery';
import { logger } from '../utils/logger';
import { toSafeFilename } from '../utils/file-naming';

export const witnessCommand = new Command('witness')
  .description('Witness a single visual snapshot')
  .argument('<name>', 'Snapshot name')
  .option('-p, --port <number>', 'Chrome remote debugging port')
  .option('-o, --output <path>', 'Output directory for captured files', '.testivai/witnesses')
  .option('-f, --format <format>', 'Output format (json|png)', 'json')
  .action(async (name, options) => {
    let client: BrowserClient | null = null;

    try {
      logger.info(`Witnessing snapshot: ${name}`);

      // Connect to browser
      logger.info('Connecting to Chrome...');
      client = new BrowserClient();
      await client.connect(parseInt(options.port, 10) || undefined);

      // Setup capture
      const capture = new BrowserCapture(client);

      // Witness snapshot
      const snapshot = await capture.captureSnapshot(name);

      // Save based on format
      if (options.format === 'json') {
        await saveAsJson(snapshot, options.output, name);
      } else if (options.format === 'png') {
        await saveAsPng(snapshot, options.output, name);
      } else {
        throw new Error(`Unknown format: ${options.format}`);
      }

      logger.success(`Snapshot captured successfully!`);
      console.log(chalk.gray(`Saved to: ${options.output}`));

    } catch (error) {
      if (error instanceof BrowserDiscoveryError) {
        console.log(chalk.red(error.message));
        console.log(...error.getInstructions());
      } else {
        logger.error('Capture failed:', error);
      }
      process.exit(1);
    } finally {
      // Clean up
      if (client) {
        await client.disconnect();
      }
    }
  });

/**
 * Save snapshot as JSON
 */
async function saveAsJson(snapshot: any, outputDir: string, name: string): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Prepare data
  const data = {
    ...snapshot,
    capturedAt: new Date().toISOString(),
  };

  // Write JSON file
  const filename = `${toSafeFilename(name)}.json`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');

  // Also save PNG separately if screenshot data exists
  if (snapshot.screenshotData) {
    const pngFilename = `${toSafeFilename(name)}.png`;
    const pngFilepath = path.join(outputDir, pngFilename);
    const pngBuffer = Buffer.from(snapshot.screenshotData, 'base64');
    fs.writeFileSync(pngFilepath, pngBuffer);
  }
}

/**
 * Save snapshot as PNG only
 */
async function saveAsPng(snapshot: any, outputDir: string, name: string): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save PNG
  if (snapshot.screenshotData) {
    const filename = `${toSafeFilename(name)}.png`;
    const filepath = path.join(outputDir, filename);
    const pngBuffer = Buffer.from(snapshot.screenshotData, 'base64');
    fs.writeFileSync(filepath, pngBuffer);
  } else {
    throw new Error('No screenshot data in snapshot');
  }
}
