/**
 * Tests for the TestivAI Local Configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  loadLocalConfig,
  createDefaultConfig,
  localConfigExists,
  isLocalMode,
  getConfigPath,
  getDefaultConfig,
} from '../config/local-config';

describe('Local Config', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-config-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('T2.10 - loadLocalConfig() defaults', () => {
    it('should return defaults when config file is missing', () => {
      const config = loadLocalConfig(tmpDir);

      expect(config.mode).toBe('local');
      expect(config.threshold).toBe(0.1);
      expect(config.autoOpen).toBe(true);
      expect(config.failOnDiff).toBe(false);
    });
  });

  describe('T2.11 - loadLocalConfig() reads existing', () => {
    it('should read and merge existing config.json', () => {
      const configDir = path.join(tmpDir, '.testivai');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({ mode: 'cloud', threshold: 0.05 }),
      );

      const config = loadLocalConfig(tmpDir);

      expect(config.mode).toBe('cloud');
      expect(config.threshold).toBe(0.05);
      // Defaults for non-specified fields
      expect(config.autoOpen).toBe(true);
      expect(config.failOnDiff).toBe(false);
    });
  });

  describe('T2.12 - createDefaultConfig()', () => {
    it('should write valid JSON and return config', () => {
      const config = createDefaultConfig(tmpDir, { failOnDiff: true });

      const configPath = getConfigPath(tmpDir);
      expect(fs.existsSync(configPath)).toBe(true);

      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);

      expect(parsed.mode).toBe('local');
      expect(parsed.failOnDiff).toBe(true);
      expect(parsed.threshold).toBe(0.1);

      expect(config.mode).toBe('local');
      expect(config.failOnDiff).toBe(true);
    });
  });

  describe('localConfigExists()', () => {
    it('should return false when no config', () => {
      expect(localConfigExists(tmpDir)).toBe(false);
    });

    it('should return true after creating config', () => {
      createDefaultConfig(tmpDir);
      expect(localConfigExists(tmpDir)).toBe(true);
    });
  });

  describe('isLocalMode()', () => {
    it('should return false when no config exists', () => {
      expect(isLocalMode(tmpDir)).toBe(false);
    });

    it('should return true when mode is local', () => {
      createDefaultConfig(tmpDir, { mode: 'local' });
      expect(isLocalMode(tmpDir)).toBe(true);
    });

    it('should return false when mode is cloud', () => {
      createDefaultConfig(tmpDir, { mode: 'cloud' });
      expect(isLocalMode(tmpDir)).toBe(false);
    });
  });
});
