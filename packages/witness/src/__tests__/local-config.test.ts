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

  describe('T2.20 - ignoreSelectors field', () => {
    it('should default to undefined when not specified', () => {
      const config = loadLocalConfig(tmpDir);
      expect(config.ignoreSelectors).toBeUndefined();
    });

    it('should load ignoreSelectors array from config.json', () => {
      const configDir = path.join(tmpDir, '.testivai');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({ ignoreSelectors: ['.version-badge', '#live-chat'] }),
      );

      const config = loadLocalConfig(tmpDir);
      expect(config.ignoreSelectors).toEqual(['.version-badge', '#live-chat']);
    });

    it('should persist ignoreSelectors via createDefaultConfig', () => {
      const selectors = ['[data-testivai-ignore]', '.ads-banner'];
      createDefaultConfig(tmpDir, { ignoreSelectors: selectors });

      const configPath = getConfigPath(tmpDir);
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(raw.ignoreSelectors).toEqual(selectors);

      // Round-trip: loadLocalConfig should return same array
      const loaded = loadLocalConfig(tmpDir);
      expect(loaded.ignoreSelectors).toEqual(selectors);
    });

    it('should accept an empty ignoreSelectors array', () => {
      const configDir = path.join(tmpDir, '.testivai');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({ ignoreSelectors: [] }),
      );

      const config = loadLocalConfig(tmpDir);
      expect(config.ignoreSelectors).toEqual([]);
    });

    it('should preserve other config fields when ignoreSelectors is set', () => {
      createDefaultConfig(tmpDir, {
        threshold: 0.05,
        failOnDiff: true,
        ignoreSelectors: ['.badge'],
      });

      const config = loadLocalConfig(tmpDir);
      expect(config.threshold).toBe(0.05);
      expect(config.failOnDiff).toBe(true);
      expect(config.ignoreSelectors).toEqual(['.badge']);
    });
  });

  describe('TESTIVAI_MODE env override', () => {
    const saved = process.env.TESTIVAI_MODE;
    afterEach(() => {
      if (saved === undefined) delete process.env.TESTIVAI_MODE;
      else process.env.TESTIVAI_MODE = saved;
    });

    it('cloud env wins over a local-mode config file', () => {
      createDefaultConfig(tmpDir, { mode: 'local' });
      process.env.TESTIVAI_MODE = 'cloud';
      expect(isLocalMode(tmpDir)).toBe(false);
    });

    it('local env wins even without a config file', () => {
      process.env.TESTIVAI_MODE = 'local';
      expect(isLocalMode(tmpDir)).toBe(true);
    });

    it('file decides when env is unset', () => {
      delete process.env.TESTIVAI_MODE;
      createDefaultConfig(tmpDir, { mode: 'local' });
      expect(isLocalMode(tmpDir)).toBe(true);
    });
  });
});

describe('mask + diffRegions config (additive, back-compat)', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { loadLocalConfig } = require('../config/local-config');

  function withConfig(config: object, fn: (root: string) => void) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-cfg-'));
    fs.mkdirSync(path.join(root, '.testivai'), { recursive: true });
    fs.writeFileSync(path.join(root, '.testivai', 'config.json'), JSON.stringify(config));
    try { fn(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
  }

  it('configs written before masks existed load unchanged', () => {
    withConfig({ mode: 'local', threshold: 0.2, ignoreSelectors: ['.ad'] }, (root) => {
      const cfg = loadLocalConfig(root);
      expect(cfg.threshold).toBe(0.2);
      expect(cfg.ignoreSelectors).toEqual(['.ad']);
      expect(cfg.mask).toBeUndefined();
      expect(cfg.diffRegions).toBeUndefined();
    });
  });

  it('mask and diffRegions parse when present', () => {
    withConfig(
      {
        mode: 'local',
        mask: ['#banner', { x: 0, y: 0, width: '50%', height: 40 }, { top: 24 }],
        diffRegions: { minSize: 20, mergeDistance: 6 },
      },
      (root) => {
        const cfg = loadLocalConfig(root);
        expect(cfg.mask).toHaveLength(3);
        expect(cfg.diffRegions).toEqual({ minSize: 20, mergeDistance: 6 });
      },
    );
  });
});
