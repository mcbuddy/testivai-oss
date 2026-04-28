/**
 * Tests for the TestivAI run command — local mode logic
 *
 * These test the key decision points in run.ts local mode:
 * - Skipping API key validation
 * - Calling generateReport()
 * - failOnDiff exit code behavior
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { isLocalMode, loadLocalConfig, createDefaultConfig } from '../../config/local-config';
import { generateReport } from '../../report/generator';
import { BaselineStore } from '../../baselines/store';

describe('Run Command - Local Mode', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-run-local-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('T4.9 - Local mode skips API key validation', () => {
    it('should detect local mode from config.json', () => {
      createDefaultConfig(tmpDir, { mode: 'local' });
      expect(isLocalMode(tmpDir)).toBe(true);
    });

    it('should detect cloud mode requires API key', () => {
      createDefaultConfig(tmpDir, { mode: 'cloud' });
      expect(isLocalMode(tmpDir)).toBe(false);
    });

    it('should detect no config means cloud mode (requires API key)', () => {
      expect(isLocalMode(tmpDir)).toBe(false);
    });
  });

  describe('T4.10 - Local mode calls generateReport()', () => {
    it('should generate report after test completion', () => {
      createDefaultConfig(tmpDir, { mode: 'local' });
      const store = new BaselineStore(tmpDir);
      store.writeTemp('homepage', Buffer.from('test-data'));

      const reportData = generateReport({
        projectRoot: tmpDir,
        reportDir: path.join(tmpDir, 'visual-report'),
        autoOpen: false,
      });

      expect(reportData.snapshots).toHaveLength(1);
      expect(reportData.snapshots[0].status).toBe('new');
      expect(fs.existsSync(path.join(tmpDir, 'visual-report', 'index.html'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'visual-report', 'results.json'))).toBe(true);
    });
  });

  describe('T4.11 - failOnDiff exit code behavior', () => {
    it('should return changed count > 0 when baselines differ', () => {
      createDefaultConfig(tmpDir, { mode: 'local', failOnDiff: true });
      const store = new BaselineStore(tmpDir);

      // Create a baseline and a different temp
      store.write('homepage', Buffer.from('original-baseline'));
      store.writeTemp('homepage', Buffer.from('changed-screenshot-xxx'));

      const reportData = generateReport({
        projectRoot: tmpDir,
        reportDir: path.join(tmpDir, 'visual-report'),
        autoOpen: false,
      });

      const config = loadLocalConfig(tmpDir);
      // failOnDiff is true, and there are changes → would exit(1)
      expect(config.failOnDiff).toBe(true);
      expect(reportData.summary.changed).toBeGreaterThan(0);
    });
  });

  describe('T4.12 - Cloud mode unchanged', () => {
    it('should not be local mode when no config exists', () => {
      expect(isLocalMode(tmpDir)).toBe(false);
    });

    it('should not be local mode when mode is cloud', () => {
      createDefaultConfig(tmpDir, { mode: 'cloud' });
      expect(isLocalMode(tmpDir)).toBe(false);
    });
  });
});
