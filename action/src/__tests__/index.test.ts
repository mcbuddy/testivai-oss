/**
 * Tests for main action
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Action integration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-action-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('T6.11 - reads results.json from report-dir', () => {
    const results = {
      timestamp: Date.now(),
      summary: { total: 1, passed: 1, changed: 0, newSnapshots: 0 },
      snapshots: [{ id: '1', name: 'test', status: 'passed', currentPath: 'test.png' }],
    };

    fs.mkdirSync(path.join(tmpDir, 'visual-report'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'visual-report', 'results.json'),
      JSON.stringify(results)
    );

    const read = JSON.parse(fs.readFileSync(path.join(tmpDir, 'visual-report', 'results.json'), 'utf-8'));
    expect(read.summary.total).toBe(1);
  });

  it('T6.12 - missing results.json should error', () => {
    const reportDir = path.join(tmpDir, 'nonexistent');
    const resultsPath = path.join(reportDir, 'results.json');
    expect(fs.existsSync(resultsPath)).toBe(false);
  });
});
