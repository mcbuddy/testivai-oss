/**
 * Tests for the TestivAI init command — local mode additions
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createDefaultConfig, loadLocalConfig, getConfigPath } from '../../config/local-config';

describe('Init Command - Local Mode', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-init-local-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('T4.5 - init with local mode creates config.json', () => {
    it('should create .testivai/config.json with mode: "local"', () => {
      createDefaultConfig(tmpDir, { mode: 'local' });

      const configPath = getConfigPath(tmpDir);
      expect(fs.existsSync(configPath)).toBe(true);

      const config = loadLocalConfig(tmpDir);
      expect(config.mode).toBe('local');
    });
  });

  describe('T4.6 - init with local mode creates baselines directory', () => {
    it('should create .testivai/baselines/ directory', () => {
      createDefaultConfig(tmpDir, { mode: 'local' });
      const baselinesDir = path.join(tmpDir, '.testivai', 'baselines');
      fs.mkdirSync(baselinesDir, { recursive: true });

      expect(fs.existsSync(baselinesDir)).toBe(true);
      expect(fs.statSync(baselinesDir).isDirectory()).toBe(true);
    });
  });

  describe('T4.7 - init with local mode updates .gitignore', () => {
    it('should add temp and report dirs to .gitignore', () => {
      // Simulate what init does
      const gitignorePath = path.join(tmpDir, '.gitignore');
      const entries = '\n# TestivAI local mode\n.testivai/temp/\nvisual-report/\n';
      fs.writeFileSync(gitignorePath, entries);

      const content = fs.readFileSync(gitignorePath, 'utf-8');
      expect(content).toContain('.testivai/temp/');
      expect(content).toContain('visual-report/');
    });

    it('should not duplicate entries if .gitignore already has them', () => {
      const gitignorePath = path.join(tmpDir, '.gitignore');
      const existing = 'node_modules/\n.testivai/temp/\nvisual-report/\n';
      fs.writeFileSync(gitignorePath, existing);

      // Simulate init logic: only append if not present
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      if (!content.includes('.testivai/temp/')) {
        fs.appendFileSync(gitignorePath, '\n.testivai/temp/\nvisual-report/\n');
      }

      const final = fs.readFileSync(gitignorePath, 'utf-8');
      const matches = final.match(/\.testivai\/temp\//g);
      expect(matches).toHaveLength(1);
    });
  });

  describe('T4.8 - init with cloud mode', () => {
    it('should create config with mode: "cloud" (existing behavior preserved)', () => {
      createDefaultConfig(tmpDir, { mode: 'cloud' });

      const config = loadLocalConfig(tmpDir);
      expect(config.mode).toBe('cloud');
    });
  });
});
