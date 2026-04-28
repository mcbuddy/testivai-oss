/**
 * Tests for the TestivAI Local Baseline Store
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BaselineStore } from '../baselines/store';

describe('BaselineStore', () => {
  let tmpDir: string;
  let store: BaselineStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-baselines-'));
    store = new BaselineStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const FAKE_PNG = Buffer.from('fake-png-data');
  const FAKE_PNG_2 = Buffer.from('fake-png-data-updated');

  describe('T2.1 - write()', () => {
    it('should create baseline directory, screenshot, and metadata.json', () => {
      store.write('homepage', FAKE_PNG, { width: 1024, height: 768 });

      const screenshotPath = store.getBaselineScreenshotPath('homepage');
      const metadataPath = store.getBaselineMetadataPath('homepage');

      expect(fs.existsSync(screenshotPath)).toBe(true);
      expect(fs.existsSync(metadataPath)).toBe(true);

      const screenshot = fs.readFileSync(screenshotPath);
      expect(screenshot).toEqual(FAKE_PNG);

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      expect(metadata.name).toBe('homepage');
      expect(metadata.width).toBe(1024);
      expect(metadata.height).toBe(768);
      expect(metadata.createdAt).toBeTruthy();
      expect(metadata.updatedAt).toBeTruthy();
    });
  });

  describe('T2.2 - read()', () => {
    it('should return buffer for existing baseline', () => {
      store.write('homepage', FAKE_PNG);

      const result = store.read('homepage');
      expect(result).toEqual(FAKE_PNG);
    });
  });

  describe('T2.3 - read() missing', () => {
    it('should return null for missing baseline', () => {
      const result = store.read('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('T2.4 - exists()', () => {
    it('should return true for existing baseline', () => {
      store.write('homepage', FAKE_PNG);
      expect(store.exists('homepage')).toBe(true);
    });

    it('should return false for missing baseline', () => {
      expect(store.exists('nonexistent')).toBe(false);
    });
  });

  describe('T2.5 - approve() with existing baseline', () => {
    it('should copy temp to baseline and back up previous to .previous/', () => {
      // Create initial baseline
      store.write('homepage', FAKE_PNG);

      // Write a temp screenshot (simulating a test run)
      store.writeTemp('homepage', FAKE_PNG_2);

      // Approve
      store.approve('homepage');

      // New baseline should be the temp screenshot
      const newBaseline = store.read('homepage');
      expect(newBaseline).toEqual(FAKE_PNG_2);

      // Previous should be backed up
      const previousDir = path.join(store.getBaselineDir('homepage'), '.previous');
      expect(fs.existsSync(previousDir)).toBe(true);
      const previousScreenshot = fs.readFileSync(path.join(previousDir, 'screenshot.png'));
      expect(previousScreenshot).toEqual(FAKE_PNG);
    });
  });

  describe('T2.6 - approve() first baseline (no previous)', () => {
    it('should not create .previous/ when approving first baseline', () => {
      // Write temp only (no existing baseline)
      store.writeTemp('new-page', FAKE_PNG);

      // Approve
      store.approve('new-page');

      // Baseline should exist
      expect(store.exists('new-page')).toBe(true);
      expect(store.read('new-page')).toEqual(FAKE_PNG);

      // No .previous/ should exist
      const previousDir = path.join(store.getBaselineDir('new-page'), '.previous');
      expect(fs.existsSync(previousDir)).toBe(false);
    });
  });

  describe('T2.7 - undo()', () => {
    it('should restore .previous/ and remove backup dir', () => {
      // Create initial baseline, then approve a new one
      store.write('homepage', FAKE_PNG);
      store.writeTemp('homepage', FAKE_PNG_2);
      store.approve('homepage');

      // Verify current is the new one
      expect(store.read('homepage')).toEqual(FAKE_PNG_2);

      // Undo
      store.undo('homepage');

      // Should be restored to original
      expect(store.read('homepage')).toEqual(FAKE_PNG);

      // .previous/ should be removed
      const previousDir = path.join(store.getBaselineDir('homepage'), '.previous');
      expect(fs.existsSync(previousDir)).toBe(false);
    });
  });

  describe('T2.8 - undo() with no .previous/', () => {
    it('should throw descriptive error', () => {
      store.write('homepage', FAKE_PNG);

      expect(() => {
        store.undo('homepage');
      }).toThrow(/No previous baseline found.*homepage.*Cannot undo/);
    });
  });

  describe('T2.9 - list()', () => {
    it('should return all baseline names', () => {
      store.write('homepage', FAKE_PNG);
      store.write('dashboard', FAKE_PNG);
      store.write('settings', FAKE_PNG);

      const names = store.list();
      expect(names.sort()).toEqual(['dashboard', 'homepage', 'settings']);
    });

    it('should return empty array when no baselines', () => {
      expect(store.list()).toEqual([]);
    });
  });
});
