/**
 * OSS Smoke E2E
 *
 * Exercises the public API surface of @testivai/witness end-to-end without
 * launching a browser:
 *
 *   1. Use BaselineStore to write a baseline + a temp screenshot
 *   2. Use generateReport() to produce results.json + index.html
 *   3. Assert the report content reflects passed and changed states
 *   4. Verify @testivai/witness-playwright entry points load
 *
 * This validates that the published packages link together correctly and the
 * documented public APIs work as advertised.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as assert from 'assert';

import { BaselineStore, generateReport, diff } from '@testivai/witness';

function makeRgbaPng(width: number, height: number, fill: [number, number, number, number]): Buffer {
  // Create a "fake" PNG buffer that's actually raw RGBA. The OSS report
  // pipeline does a quick byte-equal check first and falls back to the diff
  // engine when bytes differ. This is sufficient for an E2E smoke test of
  // the public surface — we don't need to round-trip a real PNG.
  const buf = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    buf[i * 4 + 0] = fill[0];
    buf[i * 4 + 1] = fill[1];
    buf[i * 4 + 2] = fill[2];
    buf[i * 4 + 3] = fill[3];
  }
  return buf;
}

async function main(): Promise<void> {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-oss-e2e-'));
  console.log(`[e2e] Using temp project root: ${projectRoot}`);

  try {
    // 1. Sanity-check the diff engine export
    const a = new Uint8ClampedArray(16);
    const b = new Uint8ClampedArray(16);
    const out = new Uint8ClampedArray(16);
    const result = diff(a, b, out, 2, 2, { threshold: 0.1 });
    assert.strictEqual(typeof result.diffCount, 'number', 'diff() should return DiffResult');
    assert.strictEqual(result.isIdentical, true, 'identical buffers should be identical');

    // 2. Use BaselineStore to seed baselines + temps
    const store = new BaselineStore(projectRoot);

    // Identical snapshot (passed)
    const greenBaseline = makeRgbaPng(8, 8, [0, 255, 0, 255]);
    store.write('snapshot-passed', greenBaseline);
    store.writeTemp('snapshot-passed', greenBaseline);

    // Changed snapshot
    const redBaseline = makeRgbaPng(8, 8, [255, 0, 0, 255]);
    const blueCurrent = makeRgbaPng(8, 8, [0, 0, 255, 255]);
    store.write('snapshot-changed', redBaseline);
    store.writeTemp('snapshot-changed', blueCurrent);

    // New snapshot (no baseline)
    store.writeTemp('snapshot-new', makeRgbaPng(8, 8, [128, 128, 128, 255]));

    assert.deepStrictEqual(
      store.list().sort(),
      ['snapshot-changed', 'snapshot-passed'],
      'baseline list should match seeded baselines',
    );
    assert.deepStrictEqual(
      store.listTemp().sort(),
      ['snapshot-changed', 'snapshot-new', 'snapshot-passed'],
      'temp list should match seeded temps',
    );

    // 3. Generate the local HTML report
    const reportData = generateReport({
      projectRoot,
      reportDir: 'visual-report',
      threshold: 0.1,
      autoOpen: false,
    });

    assert.strictEqual(reportData.summary.total, 3, 'should report 3 snapshots');
    assert.strictEqual(reportData.summary.passed, 1, 'should report 1 passed');
    assert.strictEqual(reportData.summary.changed, 1, 'should report 1 changed');
    assert.strictEqual(reportData.summary.newSnapshots, 1, 'should report 1 new');

    const reportDir = path.join(projectRoot, 'visual-report');
    assert.ok(fs.existsSync(path.join(reportDir, 'index.html')), 'index.html should exist');
    assert.ok(fs.existsSync(path.join(reportDir, 'results.json')), 'results.json should exist');

    const html = fs.readFileSync(path.join(reportDir, 'index.html'), 'utf-8');
    assert.ok(html.length > 100, 'index.html should be non-trivial');

    const resultsJson = JSON.parse(fs.readFileSync(path.join(reportDir, 'results.json'), 'utf-8'));
    assert.strictEqual(resultsJson.snapshots.length, 3);

    // 4. Verify @testivai/witness-playwright entry points load (no browser)
    //    We dynamically require to avoid TS path lookup issues if not built yet.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const playwrightSdk = require('@testivai/witness-playwright');
    assert.ok(playwrightSdk.testivai, '@testivai/witness-playwright should export `testivai`');
    assert.strictEqual(typeof playwrightSdk.testivai.witness, 'function', 'testivai.witness should be a function');

    console.log('[e2e] ✓ All smoke checks passed.');
  } finally {
    // Clean up temp directory
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('[e2e] ✗ Smoke E2E failed');
  console.error(err);
  process.exit(1);
});
