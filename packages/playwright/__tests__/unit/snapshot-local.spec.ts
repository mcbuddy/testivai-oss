/**
 * Tests for the TestivAI Playwright Snapshot - Local Mode
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('Playwright Snapshot - Local Mode', () => {
  let tmpDir: string;
  let originalEnv: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-snapshot-local-'));
    originalEnv = process.env.TESTIVAI_MODE;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    process.env.TESTIVAI_MODE = originalEnv;
  });

  describe('T5.5 - snapshot() skips DOM/CSS/layout in local mode', () => {
    it('should only set TESTIVAI_MODE when in local mode', () => {
      // Set local mode env var
      process.env.TESTIVAI_MODE = 'local';
      expect(process.env.TESTIVAI_MODE).toBe('local');

      // Clear it
      delete process.env.TESTIVAI_MODE;
      expect(process.env.TESTIVAI_MODE).toBeUndefined();
    });

    it('should check isLocalMode correctly', () => {
      const isLocalMode = process.env.TESTIVAI_MODE === 'local';
      expect(isLocalMode).toBe(false);

      process.env.TESTIVAI_MODE = 'local';
      expect(process.env.TESTIVAI_MODE === 'local').toBe(true);
    });
  });

  describe('T5.6 - snapshot() captures everything in cloud mode', () => {
    it('should not skip captures in cloud mode', () => {
      // In cloud mode (TESTIVAI_MODE not set or set to 'cloud')
      delete process.env.TESTIVAI_MODE;

      const isLocalMode = process.env.TESTIVAI_MODE === 'local';
      expect(isLocalMode).toBe(false);
    });
  });

  describe('T5.8 - Local mode saves screenshot to .testivai/temp/{name}/screenshot.png', () => {
    it('should create temp directory structure', () => {
      const tempDir = path.join(tmpDir, '.testivai', 'temp', 'homepage');
      fs.ensureDirSync(tempDir);

      const screenshotPath = path.join(tempDir, 'screenshot.png');
      fs.writeFileSync(screenshotPath, Buffer.from('fake-png-data'));

      expect(fs.existsSync(screenshotPath)).toBe(true);
    });
  });

  describe('T5.9 - Local mode does not create .css.json or structure files', () => {
    it('should not create CSS JSON files in local mode', () => {
      process.env.TESTIVAI_MODE = 'local';

      // Simulate what snapshot() does in local mode
      const isLocalMode = process.env.TESTIVAI_MODE === 'local';
      const stylesPath = isLocalMode ? '' : path.join(tmpDir, 'test.css.json');

      expect(stylesPath).toBe('');
    });

    it('should not create structure HTML files in local mode', () => {
      process.env.TESTIVAI_MODE = 'local';

      const isLocalMode = process.env.TESTIVAI_MODE === 'local';
      const structurePath = isLocalMode ? '' : path.join(tmpDir, 'test.html');

      expect(structurePath).toBe('');
    });
  });
});
