/**
 * Tests for the TestivAI HTML Report Generator
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BaselineStore } from '../baselines/store';
import { compareAll } from '../report/compare';
import { generateReport } from '../report/generator';
import { renderHtml } from '../report/template';
import { ReportData } from '../report/results';

describe('Report Generator', () => {
  let tmpDir: string;
  let store: BaselineStore;
  let reportDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-report-'));
    store = new BaselineStore(tmpDir);
    reportDir = path.join(tmpDir, 'visual-report');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const FAKE_PNG_A = Buffer.from('aaaa-fake-png-baseline');
  const FAKE_PNG_B = Buffer.from('bbbb-fake-png-different');

  describe('T3.1 - compareAll() with no baselines', () => {
    it('should return all status "new" when no baselines exist', () => {
      store.writeTemp('homepage', FAKE_PNG_A);
      store.writeTemp('dashboard', FAKE_PNG_B);

      const results = compareAll({ projectRoot: tmpDir, reportDir, threshold: 0.1 });

      expect(results).toHaveLength(2);
      for (const r of results) {
        expect(r.status).toBe('new');
        expect(r.currentPath).toBeTruthy();
      }
    });
  });

  describe('T3.2 - compareAll() with matching baselines', () => {
    it('should return all status "passed" when baselines match', () => {
      // Write identical baseline and temp
      store.write('homepage', FAKE_PNG_A);
      store.writeTemp('homepage', FAKE_PNG_A);

      const results = compareAll({ projectRoot: tmpDir, reportDir, threshold: 0.1 });

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('passed');
      expect(results[0].diffPercent).toBe(0);
    });
  });

  describe('T3.3 - compareAll() with different baselines', () => {
    it('should return status "changed" with diff info', () => {
      store.write('homepage', FAKE_PNG_A);
      store.writeTemp('homepage', FAKE_PNG_B);

      const results = compareAll({ projectRoot: tmpDir, reportDir, threshold: 0.1 });

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('changed');
      expect(results[0].baselinePath).toBeTruthy();
      expect(results[0].currentPath).toBeTruthy();
    });
  });

  describe('T3.4 - generateReport() creates files', () => {
    it('should create index.html and results.json', () => {
      store.writeTemp('homepage', FAKE_PNG_A);

      const data = generateReport({
        projectRoot: tmpDir,
        reportDir: 'visual-report',
        autoOpen: false,
        version: '2.0.0',
      });

      const htmlPath = path.join(tmpDir, 'visual-report', 'index.html');
      const jsonPath = path.join(tmpDir, 'visual-report', 'results.json');

      expect(fs.existsSync(htmlPath)).toBe(true);
      expect(fs.existsSync(jsonPath)).toBe(true);
      expect(data.snapshots).toHaveLength(1);
    });
  });

  describe('T3.5 - results.json schema', () => {
    it('should have correct schema with version, summary, snapshots[]', () => {
      store.write('homepage', FAKE_PNG_A);
      store.writeTemp('homepage', FAKE_PNG_A);
      store.writeTemp('new-page', FAKE_PNG_B);

      generateReport({
        projectRoot: tmpDir,
        reportDir: 'visual-report',
        autoOpen: false,
        version: '2.0.0',
      });

      const jsonPath = path.join(tmpDir, 'visual-report', 'results.json');
      const data: ReportData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

      expect(data.version).toBe('2.0.0');
      expect(data.timestamp).toBeTruthy();
      expect(data.summary).toBeDefined();
      expect(data.summary.total).toBe(2);
      expect(data.summary.passed).toBe(1);
      expect(data.summary.newSnapshots).toBe(1);
      expect(Array.isArray(data.snapshots)).toBe(true);
      expect(data.snapshots).toHaveLength(2);
    });
  });

  describe('T3.6 - HTML contains expected sections', () => {
    it('should contain Changed, New, Passed section headers', () => {
      store.write('homepage', FAKE_PNG_A);
      store.writeTemp('homepage', FAKE_PNG_B); // changed
      store.writeTemp('new-page', FAKE_PNG_A); // new

      // Add a passed one
      store.write('settings', FAKE_PNG_A);
      store.writeTemp('settings', FAKE_PNG_A); // passed

      generateReport({
        projectRoot: tmpDir,
        reportDir: 'visual-report',
        autoOpen: false,
      });

      const html = fs.readFileSync(
        path.join(tmpDir, 'visual-report', 'index.html'),
        'utf-8',
      );

      expect(html).toContain('Changed');
      expect(html).toContain('New');
      expect(html).toContain('Passed');
      expect(html).toContain('TestivAI');
    });
  });

  describe('T3.7 - HTML includes approve command', () => {
    it('should include approve command with correct snapshot name', () => {
      store.writeTemp('login-page', FAKE_PNG_A);

      generateReport({
        projectRoot: tmpDir,
        reportDir: 'visual-report',
        autoOpen: false,
      });

      const html = fs.readFileSync(
        path.join(tmpDir, 'visual-report', 'index.html'),
        'utf-8',
      );

      expect(html).toContain('npx testivai approve login-page');
      expect(html).toContain('copy-btn');
    });
  });

  describe('T3.8 - Empty temp directory', () => {
    it('should produce report with 0 snapshots without crash', () => {
      const data = generateReport({
        projectRoot: tmpDir,
        reportDir: 'visual-report',
        autoOpen: false,
      });

      expect(data.snapshots).toHaveLength(0);
      expect(data.summary.total).toBe(0);

      const htmlPath = path.join(tmpDir, 'visual-report', 'index.html');
      expect(fs.existsSync(htmlPath)).toBe(true);

      const html = fs.readFileSync(htmlPath, 'utf-8');
      expect(html).toContain('No snapshots found');
    });
  });
});
