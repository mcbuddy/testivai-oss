/**
 * TestivAI Local Baseline Store
 *
 * Manages baseline screenshots on disk for local visual regression testing.
 *
 * Directory structure:
 *   .testivai/
 *   ├── baselines/{name}/screenshot.png, metadata.json, .previous/
 *   └── temp/{name}/screenshot.png  (gitignored)
 */

import * as fs from 'fs';
import * as path from 'path';

export interface BaselineMetadata {
  name: string;
  createdAt: string;
  updatedAt: string;
  width?: number;
  height?: number;
  approvedBy?: string;
}

export class BaselineStore {
  private readonly baselinesDir: string;
  private readonly tempDir: string;

  constructor(private readonly projectRoot: string) {
    this.baselinesDir = path.join(projectRoot, '.testivai', 'baselines');
    this.tempDir = path.join(projectRoot, '.testivai', 'temp');
  }

  /**
   * Check if a baseline exists for the given snapshot name.
   */
  exists(name: string): boolean {
    const screenshotPath = this.getBaselineScreenshotPath(name);
    return fs.existsSync(screenshotPath);
  }

  /**
   * Read a baseline screenshot as a Buffer.
   * Returns null if the baseline does not exist.
   */
  read(name: string): Buffer | null {
    const screenshotPath = this.getBaselineScreenshotPath(name);
    if (!fs.existsSync(screenshotPath)) {
      return null;
    }
    return fs.readFileSync(screenshotPath);
  }

  /**
   * Read baseline metadata.
   * Returns null if the baseline does not exist.
   */
  readMetadata(name: string): BaselineMetadata | null {
    const metadataPath = this.getBaselineMetadataPath(name);
    if (!fs.existsSync(metadataPath)) {
      return null;
    }
    const raw = fs.readFileSync(metadataPath, 'utf-8');
    return JSON.parse(raw) as BaselineMetadata;
  }

  /**
   * Write a screenshot and metadata to the baseline directory.
   * Creates the directory if it doesn't exist.
   */
  write(name: string, screenshot: Buffer, metadata?: Partial<BaselineMetadata>): void {
    const baselineDir = this.getBaselineDir(name);
    fs.mkdirSync(baselineDir, { recursive: true });

    // Write screenshot
    fs.writeFileSync(this.getBaselineScreenshotPath(name), screenshot);

    // Write metadata
    const now = new Date().toISOString();
    const meta: BaselineMetadata = {
      name,
      createdAt: now,
      updatedAt: now,
      ...metadata,
    };
    fs.writeFileSync(this.getBaselineMetadataPath(name), JSON.stringify(meta, null, 2));
  }

  /**
   * Approve a temp screenshot as the new baseline.
   * Backs up the previous baseline to `.previous/` if one exists.
   */
  approve(name: string): void {
    const tempScreenshot = this.getTempScreenshotPath(name);
    if (!fs.existsSync(tempScreenshot)) {
      throw new Error(
        `No temp screenshot found for "${name}". Run your tests first to generate screenshots.`
      );
    }

    const baselineDir = this.getBaselineDir(name);
    const previousDir = path.join(baselineDir, '.previous');
    const currentScreenshot = this.getBaselineScreenshotPath(name);
    const currentMetadata = this.getBaselineMetadataPath(name);

    // Backup current baseline if it exists
    if (fs.existsSync(currentScreenshot)) {
      fs.mkdirSync(previousDir, { recursive: true });
      fs.copyFileSync(currentScreenshot, path.join(previousDir, 'screenshot.png'));
      if (fs.existsSync(currentMetadata)) {
        fs.copyFileSync(currentMetadata, path.join(previousDir, 'metadata.json'));
      }
    }

    // Copy temp to baseline
    fs.mkdirSync(baselineDir, { recursive: true });
    fs.copyFileSync(tempScreenshot, currentScreenshot);

    // Update metadata
    const now = new Date().toISOString();
    const existingMeta = this.readMetadata(name);
    const meta: BaselineMetadata = {
      name,
      createdAt: existingMeta?.createdAt ?? now,
      updatedAt: now,
      approvedBy: 'local',
    };
    fs.writeFileSync(currentMetadata, JSON.stringify(meta, null, 2));
  }

  /**
   * Undo the last approve by restoring the `.previous/` backup.
   */
  undo(name: string): void {
    const baselineDir = this.getBaselineDir(name);
    const previousDir = path.join(baselineDir, '.previous');

    if (!fs.existsSync(previousDir)) {
      throw new Error(
        `No previous baseline found for "${name}". Cannot undo.`
      );
    }

    const previousScreenshot = path.join(previousDir, 'screenshot.png');
    const previousMetadata = path.join(previousDir, 'metadata.json');
    const currentScreenshot = this.getBaselineScreenshotPath(name);
    const currentMetadata = this.getBaselineMetadataPath(name);

    // Restore previous screenshot
    if (fs.existsSync(previousScreenshot)) {
      fs.copyFileSync(previousScreenshot, currentScreenshot);
    }

    // Restore previous metadata
    if (fs.existsSync(previousMetadata)) {
      fs.copyFileSync(previousMetadata, currentMetadata);
    }

    // Remove .previous directory
    fs.rmSync(previousDir, { recursive: true, force: true });
  }

  /**
   * List all baseline names.
   */
  list(): string[] {
    if (!fs.existsSync(this.baselinesDir)) {
      return [];
    }
    return fs.readdirSync(this.baselinesDir).filter((entry) => {
      const entryPath = path.join(this.baselinesDir, entry);
      return fs.statSync(entryPath).isDirectory();
    });
  }

  /**
   * Write a temp screenshot (captured during a test run).
   */
  writeTemp(name: string, screenshot: Buffer): void {
    const tempDir = path.join(this.tempDir, name);
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(this.getTempScreenshotPath(name), screenshot);
  }

  /**
   * Read a temp screenshot.
   */
  readTemp(name: string): Buffer | null {
    const tempPath = this.getTempScreenshotPath(name);
    if (!fs.existsSync(tempPath)) {
      return null;
    }
    return fs.readFileSync(tempPath);
  }

  /**
   * List all temp snapshot names.
   */
  listTemp(): string[] {
    if (!fs.existsSync(this.tempDir)) {
      return [];
    }
    return fs.readdirSync(this.tempDir).filter((entry) => {
      const entryPath = path.join(this.tempDir, entry);
      return fs.statSync(entryPath).isDirectory();
    });
  }

  /**
   * Clear all temp files.
   */
  clearTemp(): void {
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    }
  }

  // ── Path helpers ──────────────────────────────────────────────────────────

  getBaselineDir(name: string): string {
    return path.join(this.baselinesDir, name);
  }

  getBaselineScreenshotPath(name: string): string {
    return path.join(this.baselinesDir, name, 'screenshot.png');
  }

  getBaselineMetadataPath(name: string): string {
    return path.join(this.baselinesDir, name, 'metadata.json');
  }

  getTempScreenshotPath(name: string): string {
    return path.join(this.tempDir, name, 'screenshot.png');
  }

  getBaselinesDir(): string {
    return this.baselinesDir;
  }

  getTempDir(): string {
    return this.tempDir;
  }
}
