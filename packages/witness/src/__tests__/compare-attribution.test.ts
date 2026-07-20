/**
 * Integration: compareAll() with element maps — attribution + shift
 * classification through the on-disk contract (elements.json beside the
 * screenshots), plus store.approve() carrying the map to the baseline.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { compareAll } from '../report/compare';
import { renderHtml } from '../report/template';
import { BaselineStore } from '../baselines/store';
import { makePng, RED } from './helpers/synth';

const W = 400;
const H = 300;

describe('compareAll with element maps', () => {
  let root: string;
  let reportDir: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-attr-'));
    reportDir = path.join(root, 'visual-report');
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  function writeSnapshot(
    name: string,
    baseline: Buffer,
    candidate: Buffer,
    baselineElements?: object[],
    candidateElements?: object[],
  ) {
    const bDir = path.join(root, '.testivai', 'baselines', name);
    const tDir = path.join(root, '.testivai', 'temp', name);
    fs.mkdirSync(bDir, { recursive: true });
    fs.mkdirSync(tDir, { recursive: true });
    fs.writeFileSync(path.join(bDir, 'screenshot.png'), baseline);
    fs.writeFileSync(path.join(tDir, 'screenshot.png'), candidate);
    if (baselineElements) {
      fs.writeFileSync(path.join(bDir, 'elements.json'), JSON.stringify(baselineElements));
    }
    if (candidateElements) {
      fs.writeFileSync(path.join(tDir, 'elements.json'), JSON.stringify(candidateElements));
    }
  }

  const card = { path: 'body > main > div.card:nth-of-type(1)', x: 100, y: 100, width: 80, height: 40, styleHash: 'aaaa1111' };
  const main = { path: 'body > main', x: 0, y: 0, width: W, height: H, styleHash: 'ffff0000' };

  it('attributes regions to elements and classifies a pure move as shift', () => {
    writeSnapshot(
      'shifted-card',
      makePng(W, H, undefined, [{ rect: { x: 100, y: 100, width: 80, height: 40 }, color: RED }]),
      makePng(W, H, undefined, [{ rect: { x: 100, y: 110, width: 80, height: 40 }, color: RED }]),
      [main, card],
      [main, { ...card, y: 110 }],
    );

    const [result] = compareAll({ projectRoot: root, reportDir });
    expect(result.status).toBe('changed');
    expect(result.regions!.length).toBeGreaterThan(0);
    const r = result.regions![0];
    expect(r.classification).toBe('shift');
    expect(r.shift).toEqual({ dx: 0, dy: 10 });
    expect(r.elements![0].selector).toBe(card.path);

    // The report says so, in words
    const html = renderHtml({
      version: '2.2.0',
      timestamp: new Date().toISOString(),
      summary: { total: 1, passed: 0, changed: 1, newSnapshots: 0 },
      snapshots: [result],
    });
    expect(html).toContain('shifted');
    expect(html).toContain('div.card');
  });

  it('page-level uniform displacement is reported as pageShift', () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({
      path: `body > div.row:nth-of-type(${i + 1})`,
      x: 0, y: 40 * i, width: W, height: 30, styleHash: 'dddd4444',
    }));
    const moved = rows.map((r) => (r.y >= 80 ? { ...r, y: r.y + 24 } : r));

    writeSnapshot(
      'banner-inserted',
      makePng(W, H, undefined, [{ rect: { x: 0, y: 80, width: W, height: 150 }, color: RED }]),
      makePng(W, H, undefined, [{ rect: { x: 0, y: 104, width: W, height: 150 }, color: RED }]),
      rows,
      moved,
    );

    const [result] = compareAll({ projectRoot: root, reportDir });
    expect(result.pageShift).toEqual({ dy: 24, belowY: 80, count: 4 });
  });

  it('without element maps, regions come through with no attribution fields', () => {
    writeSnapshot(
      'image-only',
      makePng(W, H),
      makePng(W, H, undefined, [{ rect: { x: 10, y: 10, width: 30, height: 30 }, color: RED }]),
    );

    const [result] = compareAll({ projectRoot: root, reportDir });
    expect(result.regions!.length).toBe(1);
    expect(result.regions![0].classification).toBeUndefined();
    expect(result.regions![0].elements).toBeUndefined();
    expect(result.pageShift).toBeUndefined();
  });

  it('approve() carries elements.json to the baseline (and drops stale ones)', () => {
    writeSnapshot(
      'approved',
      makePng(W, H),
      makePng(W, H, undefined, [{ rect: { x: 10, y: 10, width: 30, height: 30 }, color: RED }]),
      [main],           // stale baseline map
      [main, card],     // fresh candidate map
    );

    const store = new BaselineStore(root);
    store.approve('approved');
    const baselineMap = JSON.parse(
      fs.readFileSync(path.join(root, '.testivai', 'baselines', 'approved', 'elements.json'), 'utf-8'),
    );
    expect(baselineMap).toHaveLength(2);

    // Approving a capture WITHOUT a map drops the stale baseline map
    writeSnapshot('approved2', makePng(W, H), makePng(W, H), [main], undefined);
    store.approve('approved2');
    expect(
      fs.existsSync(path.join(root, '.testivai', 'baselines', 'approved2', 'elements.json')),
    ).toBe(false);
  });
});
