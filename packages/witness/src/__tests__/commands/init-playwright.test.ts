/**
 * Tests for `testivai init` Playwright detection + scaffold (item 3).
 *
 * A Playwright repo must get the reporter flow — .testivai/config.json —
 * and never the CDP browserPort sidecar config.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  isPlaywrightProject,
  scaffoldPlaywrightLocal,
} from '../../commands/init';
import { loadLocalConfig, getConfigPath } from '../../config/local-config';

describe('init — Playwright detection', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-init-pw-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const writePkg = (deps: Record<string, string>) =>
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'x', devDependencies: deps }),
    );

  describe('isPlaywrightProject', () => {
    it('detects @playwright/test', () => {
      writePkg({ '@playwright/test': '^1.50.0' });
      expect(isPlaywrightProject(tmpDir)).toBe(true);
    });

    it('detects playwright', () => {
      writePkg({ playwright: '^1.50.0' });
      expect(isPlaywrightProject(tmpDir)).toBe(true);
    });

    it('is false for a non-Playwright repo', () => {
      writePkg({ cypress: '^13.0.0' });
      expect(isPlaywrightProject(tmpDir)).toBe(false);
    });

    it('is false when package.json is absent', () => {
      expect(isPlaywrightProject(tmpDir)).toBe(false);
    });
  });

  describe('scaffoldPlaywrightLocal', () => {
    it('creates .testivai/config.json (not CDP config)', () => {
      const created = scaffoldPlaywrightLocal(tmpDir);

      expect(fs.existsSync(getConfigPath(tmpDir))).toBe(true);
      const config = loadLocalConfig(tmpDir);
      // Must NOT be the CDP sidecar config.
      expect(config).not.toHaveProperty('browserPort');
      expect(created).toContain('.testivai/config.json');
    });

    it('creates the baselines directory', () => {
      scaffoldPlaywrightLocal(tmpDir);
      const baselines = path.join(tmpDir, '.testivai', 'baselines');
      expect(fs.existsSync(baselines)).toBe(true);
      expect(fs.statSync(baselines).isDirectory()).toBe(true);
    });

    it('adds temp + report dirs to .gitignore', () => {
      scaffoldPlaywrightLocal(tmpDir);
      const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
      expect(gitignore).toContain('.testivai/temp/');
      expect(gitignore).toContain('visual-report/');
    });

    it('is idempotent: does not duplicate .gitignore entries', () => {
      scaffoldPlaywrightLocal(tmpDir);
      scaffoldPlaywrightLocal(tmpDir);
      const gitignore = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
      expect(gitignore.match(/\.testivai\/temp\//g)).toHaveLength(1);
    });

    it('leaves an existing config untouched without force', () => {
      fs.mkdirSync(path.join(tmpDir, '.testivai'), { recursive: true });
      fs.writeFileSync(getConfigPath(tmpDir), JSON.stringify({ threshold: 0.5 }));
      const created = scaffoldPlaywrightLocal(tmpDir, false);
      expect(created).not.toContain('.testivai/config.json');
      expect(loadLocalConfig(tmpDir).threshold).toBe(0.5);
    });

    it('overwrites an existing config with force', () => {
      fs.mkdirSync(path.join(tmpDir, '.testivai'), { recursive: true });
      fs.writeFileSync(getConfigPath(tmpDir), JSON.stringify({ threshold: 0.5 }));
      const created = scaffoldPlaywrightLocal(tmpDir, true);
      expect(created).toContain('.testivai/config.json');
    });
  });
});
