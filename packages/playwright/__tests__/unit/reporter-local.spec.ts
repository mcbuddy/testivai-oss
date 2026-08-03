/**
 * Tests for the TestivAI Playwright Reporter
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { TestivAIPlaywrightReporter } from '../../src/reporter';

describe('Playwright Reporter', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-playwright-local-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const createMockConfig = () => ({
    projects: [{
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
      }
    }]
  }) as any;

  const createMockSuite = () => ({
    suites: [{
      project: () => ({
        use: {
          browserName: 'chromium',
          viewport: { width: 1280, height: 720 },
        }
      })
    }]
  }) as any;

  describe('T5.1 - Reporter starts without any configuration', () => {
    it('should run onBegin without a config file and without error', async () => {
      const reporter = new TestivAIPlaywrightReporter({ debug: false });
      await expect(
        reporter.onBegin(createMockConfig(), createMockSuite()),
      ).resolves.not.toThrow();
    });
  });

  describe('T5.3 - onEnd() calls generateReport()', () => {
    it('should generate report', async () => {
      fs.ensureDirSync(path.join(tmpDir, '.testivai'));
      fs.writeJsonSync(path.join(tmpDir, '.testivai', 'config.json'), {
        threshold: 0.1,
        reportDir: 'visual-report',
      });

      // Create a temp snapshot
      fs.ensureDirSync(path.join(tmpDir, '.testivai', 'temp', 'homepage'));
      fs.writeFileSync(path.join(tmpDir, '.testivai', 'temp', 'homepage', 'screenshot.png'), Buffer.from('fake-png'));

      const reporter = new TestivAIPlaywrightReporter({ debug: false });
      await reporter.onBegin(createMockConfig(), createMockSuite());

      // Re-seed the capture: onBegin empties the temp dir
      fs.ensureDirSync(path.join(tmpDir, '.testivai', 'temp', 'homepage'));
      fs.writeFileSync(path.join(tmpDir, '.testivai', 'temp', 'homepage', 'screenshot.png'), Buffer.from('fake-png'));

      // Mock result
      const mockResult = { status: 'passed' } as any;

      // onEnd should not throw
      await expect(reporter.onEnd(mockResult)).resolves.not.toThrow();
      expect(fs.existsSync(path.join(tmpDir, 'visual-report', 'results.json'))).toBe(true);
    });
  });

  describe('T5.7 - Reporter prints summary with snapshot counts', () => {
    it('should print summary in onEnd', async () => {
      fs.ensureDirSync(path.join(tmpDir, '.testivai'));
      fs.writeJsonSync(path.join(tmpDir, '.testivai', 'config.json'), {
        threshold: 0.1,
        reportDir: 'visual-report',
      });

      const reporter = new TestivAIPlaywrightReporter({ debug: false });
      await reporter.onBegin(createMockConfig(), createMockSuite());

      // Create a temp snapshot after onBegin (which empties the temp dir)
      fs.ensureDirSync(path.join(tmpDir, '.testivai', 'temp', 'homepage'));
      fs.writeFileSync(path.join(tmpDir, '.testivai', 'temp', 'homepage', 'screenshot.png'), Buffer.from('fake-png'));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockResult = { status: 'passed' } as any;
      await reporter.onEnd(mockResult);

      // Should print summary with counts
      const summaryCall = consoleSpy.mock.calls.find(
        call => typeof call[0] === 'string' && call[0].includes('TestivAI Visual Report')
      );
      expect(summaryCall).toBeDefined();

      consoleSpy.mockRestore();
    });
  });
});
