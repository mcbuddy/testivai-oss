import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { TestivaiService } from '../service';

describe('TestivaiService.onComplete', () => {
  let projectRoot: string;
  let originalCwd: string;
  let logSpy: jest.SpyInstance;
  let errSpy: jest.SpyInstance;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-wdio-svc-'));
    originalCwd = process.cwd();
    process.chdir(projectRoot);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(projectRoot, { recursive: true, force: true });
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  function seedTempScreenshot(name: string): void {
    const tempDir = path.join(projectRoot, '.testivai', 'temp', name);
    fs.mkdirSync(tempDir, { recursive: true });
    // Tiny RGBA buffer; the report pipeline byte-equals first, falls back
    // to the diff engine. Bytes don't have to be a real PNG for this test.
    fs.writeFileSync(path.join(tempDir, 'screenshot.png'), Buffer.from([0, 0, 0, 0]));
  }

  it('generates a report with zero config (no config.json)', async () => {
    seedTempScreenshot('homepage');

    const svc = new TestivaiService();
    await svc.onComplete();

    const reportDir = path.join(projectRoot, 'visual-report');
    expect(fs.existsSync(path.join(reportDir, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(reportDir, 'results.json'))).toBe(true);
  });

  it('generates a report when temp captures exist', async () => {
    seedTempScreenshot('homepage');

    const svc = new TestivaiService();
    await svc.onComplete();

    const reportDir = path.join(projectRoot, 'visual-report');
    expect(fs.existsSync(path.join(reportDir, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(reportDir, 'results.json'))).toBe(true);

    const json = JSON.parse(
      fs.readFileSync(path.join(reportDir, 'results.json'), 'utf-8'),
    );
    expect(json.summary.total).toBe(1);
    expect(json.summary.newSnapshots).toBe(1);
  });

  it('respects custom reportDir option', async () => {
    seedTempScreenshot('foo');

    const svc = new TestivaiService({ reportDir: 'custom-report-out' });
    await svc.onComplete();

    expect(fs.existsSync(path.join(projectRoot, 'custom-report-out', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, 'visual-report'))).toBe(false);
  });

  it('suppresses logging when quiet: true', async () => {
    seedTempScreenshot('foo');

    const svc = new TestivaiService({ quiet: true });
    await svc.onComplete();

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('does not throw when report generation fails — logs and exits cleanly', async () => {
    // Use jest.isolateModules so we can mock @testivai/witness's
    // generateReport just for this test without poisoning the others.
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@testivai/witness', () => {
        const real = jest.requireActual('@testivai/witness');
        return {
          ...real,
          generateReport: jest.fn(() => {
            throw new Error('synthetic generateReport failure');
          }),
        };
      });
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { TestivaiService: ScopedSvc } = require('../service');
      const svc = new ScopedSvc();
      await expect(svc.onComplete()).resolves.toBeUndefined();
      expect(errSpy).toHaveBeenCalled();
    });
  });

  it('default export is the same class', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../service');
    expect(mod.default).toBe(mod.TestivaiService);
  });
});
