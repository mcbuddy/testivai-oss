import { Reporter, FullConfig, Suite, FullResult } from './reporter-types';
import * as fs from 'fs-extra';
import * as path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';
import axios from 'axios';
import { BatchPayload, BrowserInfo, GitInfo, SnapshotPayload } from './types';
import { getCiRunId, getCiInfo, CiInfo } from './ci';
import { CompressionHelper, type CompressionOptions } from '@testivai/common';

/**
 * Check if local mode is configured by looking for .testivai/config.json with mode: 'local'
 */
function isLocalMode(): boolean {
  try {
    const configPath = path.join(process.cwd(), '.testivai', 'config.json');
    if (!fs.existsSync(configPath)) {
      return false;
    }
    const config = fs.readJsonSync(configPath);
    return config.mode === 'local';
  } catch {
    return false;
  }
}

interface TestivaiReporterOptions {
  apiUrl?: string;
  apiKey?: string;
  compression?: CompressionOptions;
  debug?: boolean;
}

export class TestivAIPlaywrightReporter implements Reporter {
  private options: TestivaiReporterOptions;
  private gitInfo: GitInfo | null = null;
  private browserInfo: BrowserInfo | null = null;
  private runId: string | null = null;
  private ciInfo: CiInfo | null = null;
  private tempDir = path.join(process.cwd(), '.testivai', 'temp');
  private compressionHelper: CompressionHelper;
  private localMode = false;

  constructor(options: TestivaiReporterOptions = {}) {
    this.options = {
      apiUrl: options.apiUrl || process.env.TESTIVAI_API_URL || 'https://core-api.testiv.ai',
      apiKey: options.apiKey || process.env.TESTIVAI_API_KEY,
      compression: options.compression || {},
      debug: options.debug || process.env.TESTIVAI_DEBUG === 'true',
    };
    
    // Initialize compression helper
    this.compressionHelper = new CompressionHelper(this.options.compression);
  }

  async onBegin(config: FullConfig, suite: Suite): Promise<void> {
    // Check for local mode first
    this.localMode = isLocalMode();
    if (this.localMode) {
      process.env.TESTIVAI_MODE = 'local';
      if (this.options.debug) {
        console.log('Testivai Reporter: [DEBUG] Local mode detected, skipping API key validation');
      }
    }

    // API key is only required in cloud mode
    if (!this.localMode && !this.options.apiKey) {
      console.error('Testivai Reporter: API Key is not configured. Disabling reporter.');
      console.error('Set TESTIVAI_API_KEY environment variable or pass apiKey in reporter options.');
      this.options.apiUrl = undefined; // Disable reporter
      return;
    }

    // 1. Clean temp directory
    await fs.emptyDir(this.tempDir);

    // 2. Capture Git metadata
    try {
      const git: SimpleGit = simpleGit();
      const [branch, commit] = await Promise.all([
        git.revparse(['--abbrev-ref', 'HEAD']),
        git.revparse(['HEAD']),
      ]);
      this.gitInfo = { branch, commit };
    } catch (error) {
      console.error('Testivai Reporter: Could not get Git information.', error);
      this.gitInfo = { branch: 'unknown', commit: 'unknown' };
    }

    // 3. Capture Browser info from the first project
    const project = suite.suites[0]?.project();
    if (project) {
      this.browserInfo = {
        name: project.use.browserName || 'unknown',
        version: 'unknown', // Playwright does not easily expose browser version
        viewportWidth: project.use.viewport?.width || 0,
        viewportHeight: project.use.viewport?.height || 0,
        userAgent: project.use.userAgent || 'unknown',
        os: 'unknown',
      };
    }

    // 4. Get CI Run ID and CI info
    this.runId = getCiRunId();
    this.ciInfo = getCiInfo();
    if (this.runId && this.options.debug) {
      console.log(`Testivai Reporter: [DEBUG] Detected CI environment. Run ID: ${this.runId}`);
      if (this.ciInfo) {
        console.log(`Testivai Reporter: [DEBUG] CI Info: provider=${this.ciInfo.provider}, PR=#${this.ciInfo.prNumber || 'N/A'}`);
      }
    }
  }

  async onEnd(result: FullResult): Promise<void> {
    // Wrap entire reporter logic in try-catch to prevent crashes
    try {
      // ── Local mode: generate HTML report instead of uploading ─────────────────
      if (this.localMode) {
        if (this.options.debug) {
          console.log('Testivai Reporter: [DEBUG] Local mode - generating visual report...');
        }

        // Dynamic import of @testivai/witness/report for local mode
        const { generateReport } = await import('@testivai/witness/report');

        // Load local config for report settings
        const localConfigPath = path.join(process.cwd(), '.testivai', 'config.json');
        const localConfig = fs.existsSync(localConfigPath)
          ? fs.readJsonSync(localConfigPath)
          : { threshold: 0.1, reportDir: 'visual-report', autoOpen: false };

        const reportData = generateReport({
          projectRoot: process.cwd(),
          reportDir: localConfig.reportDir || 'visual-report',
          threshold: localConfig.threshold,
          autoOpen: localConfig.autoOpen,
        });

        // Print summary
        const { summary } = reportData;
        console.log(`\n  ═══ TestivAI Visual Report ═══`);
        console.log(`  Total: ${summary.total}  |  Passed: ${summary.passed}  |  Changed: ${summary.changed}  |  New: ${summary.newSnapshots}`);

        if (summary.changed > 0 || summary.newSnapshots > 0) {
          console.log(`\n  To approve: npx testivai approve --all`);
        }

        if (this.options.debug) {
          console.log(`Testivai Reporter: [DEBUG] Report generated at ${path.join(process.cwd(), localConfig.reportDir || 'visual-report')}`);
        }
        return;
      }

      // ── Cloud mode: upload to TestivAI API ────────────────────────────────────
      if (!this.options.apiUrl) {
        return; // Reporter is disabled
      }

      if (this.options.debug) {
        console.log('Testivai Reporter: [DEBUG] Test run finished. Preparing to upload evidence...');
      }
      const snapshotFiles = await fs.readdir(this.tempDir);
      // Filter out .css.json files - they're not metadata files
      const jsonFiles = snapshotFiles.filter(f => f.endsWith('.json') && !f.endsWith('.css.json'));

      if (jsonFiles.length === 0) {
        if (this.options.debug) {
          console.log('Testivai Reporter: [DEBUG] No snapshots found to upload.');
        }
        return;
      }
      
      if (this.options.debug) {
        console.log(`Testivai Reporter: [DEBUG] Found ${jsonFiles.length} snapshot(s) to process`);
      }

      // Build snapshots array matching Witness SDK format
      const snapshots: SnapshotPayload[] = [];

      for (const jsonFile of jsonFiles) {
        const metadataPath = path.join(this.tempDir, jsonFile);
        const metadata = await fs.readJson(metadataPath);

        // Null safety: ensure metadata has required structure
        // @renamed: dom → structure, css → styles (IP protection)
        const structurePath = metadata.files.structure;
        const screenshotPath = metadata.files.screenshot;
        const stylesPath = metadata.files.styles;

        if (!metadata.files || !structurePath || !screenshotPath) {
          console.warn(`Testivai Reporter: Invalid metadata structure in ${jsonFile}, skipping...`);
          continue;
        }

        // Extract the first selector's layout data (usually 'body')
        const layoutKeys = Object.keys(metadata.layout || {});
        if (layoutKeys.length === 0) {
          console.warn(`Testivai Reporter: No layout data found for ${metadata.snapshotName}, skipping...`);
          continue;
        }
        const firstSelector = layoutKeys[0];
        const layoutData = metadata.layout[firstSelector];

        // Read screenshot and encode to base64
        const screenshotBuffer = await fs.readFile(screenshotPath);
        const screenshotBase64 = screenshotBuffer.toString('base64');

        // Read computed styles if available
        // @renamed: cssData → stylesData (IP protection)
        let stylesData: { computed_styles: Record<string, Record<string, string>> } | undefined;
        if (stylesPath && await fs.pathExists(stylesPath)) {
          try {
            const stylesJson = await fs.readJson(stylesPath);
            if (stylesJson.computed_styles && Object.keys(stylesJson.computed_styles).length > 0) {
              stylesData = { computed_styles: stylesJson.computed_styles };
            }
          } catch (err) {
            if (this.options.debug) {
              console.warn(`Testivai Reporter: [DEBUG] Failed to read styles file for ${metadata.snapshotName}:`, err);
            }
          }
        }

        // @renamed: dom → structure, css → styles (IP protection)
        const snapshotPayload: SnapshotPayload = {
          snapshotName: metadata.snapshotName,
          testName: metadata.testName,
          timestamp: metadata.timestamp,
          url: metadata.url,
          viewport: metadata.viewport,
          structure: { html: await fs.readFile(structurePath, 'utf-8') },
          styles: stylesData,
          layout: {
            x: layoutData.x,
            y: layoutData.y,
            width: layoutData.width,
            height: layoutData.height,
            top: layoutData.y,
            left: layoutData.x,
            right: layoutData.x + layoutData.width,
            bottom: layoutData.y + layoutData.height
          },
          testivaiConfig: metadata.testivaiConfig,
          screenshotData: screenshotBase64,
          performanceMetrics: metadata.performanceMetrics
        };
        snapshots.push(snapshotPayload);
      }

      // Build batch payload matching Witness SDK format
      const batchPayload: Omit<BatchPayload, 'batchId'> = {
        git: this.gitInfo!,
        browser: this.browserInfo!,
        snapshots,
        timestamp: Date.now(),
        runId: this.runId,
        ci: this.ciInfo,
      };

      // Compress and upload (same as Witness SDK)
      const payloadJson = JSON.stringify(batchPayload);
      const compressionResult = await this.compressionHelper.compress(payloadJson);
      
      if (this.options.debug && compressionResult.compressionRatio > 0) {
        this.compressionHelper.logCompressionResult(compressionResult);
      }
      
      const headers: Record<string, string> = {
        'X-API-KEY': this.options.apiKey!,
        'Content-Type': 'application/json',
        ...compressionResult.headers,
      };

      // Upload to same endpoint as Witness SDK
      const startBatchResponse = await axios.post(
        `${this.options.apiUrl}/api/v1/ingest/start-batch`,
        compressionResult.data,
        { headers }
      );
      
      const batchId = startBatchResponse.data.batch_id || startBatchResponse.data.batchId;
      
      // Show success message (brief in normal mode, detailed in debug mode)
      if (this.options.debug) {
        console.log(`Testivai Reporter: [DEBUG] ✓ Uploaded ${snapshots.length} snapshot(s) (Batch ID: ${batchId})`);
      } else {
        console.log(`Testivai Reporter: ✓ Uploaded ${snapshots.length} snapshot(s)`);
      }

      // Clean up temp files (skip if DEBUG mode is enabled)
      if (this.options.debug) {
        console.log(`Testivai Reporter: [DEBUG] Keeping temporary evidence files in: ${this.tempDir}`);
      } else {
        await fs.emptyDir(this.tempDir);
      }

      // Finalize batch
      await axios.post(`${this.options.apiUrl}/api/v1/ingest/finish-batch/${batchId}`, {}, {
        headers: { 'X-API-KEY': this.options.apiKey },
      });

    } catch (error: any) {
      // Log error but don't throw - let tests complete normally
      console.error('Testivai Reporter: ❌ Error:', error.message);
      if (this.options.debug) {
        console.error('Error stack:', error.stack);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
      }
      // Don't throw - reporter errors should not crash the test run
    }
  }

}

export default TestivAIPlaywrightReporter;
