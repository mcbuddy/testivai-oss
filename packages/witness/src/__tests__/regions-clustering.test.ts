/**
 * Diff clustering — connected regions with a noise floor and merge distance.
 *
 * The diff buffer convention: changed pixels have alpha > 0. These tests
 * paint synthetic diff buffers directly (the diff engine's output side),
 * plus one end-to-end case through diff() itself.
 */

import { detectRegions } from '../diff/regions';
import { diff } from '../diff';
import { solidRgba, paintRect, RED, WHITE } from './helpers/synth';

const W = 200;
const H = 200;

/** Paint a "changed" rect into a synthetic diff buffer (alpha 255). */
function diffBufferWith(rects: Array<{ x: number; y: number; width: number; height: number }>) {
  const buf = new Uint8ClampedArray(W * H * 4); // all alpha 0 = unchanged
  for (const r of rects) {
    paintRect(buf, W, H, r, [255, 0, 0, 255]);
  }
  return buf;
}

describe('detectRegions — clustering', () => {
  it('finds exact region count and bounding boxes for separated rects', () => {
    const buf = diffBufferWith([
      { x: 10, y: 10, width: 30, height: 20 },
      { x: 100, y: 120, width: 15, height: 15 },
    ]);
    const regions = detectRegions(buf, W, H, { minSize: 10, mergeDistance: 0 });
    expect(regions).toHaveLength(2);
    expect(regions[0]).toMatchObject({ x: 10, y: 10, width: 30, height: 20 });
    expect(regions[0].diffPixels).toBe(30 * 20);
    expect(regions[1]).toMatchObject({ x: 100, y: 120, width: 15, height: 15 });
  });

  it('tiny isolated specks below the noise floor produce zero regions', () => {
    const buf = diffBufferWith([
      { x: 10, y: 10, width: 2, height: 2 },
      { x: 50, y: 50, width: 1, height: 3 },
    ]);
    expect(detectRegions(buf, W, H, { minSize: 10, mergeDistance: 0 })).toHaveLength(0);
    // …but they count with the floor lowered
    expect(detectRegions(buf, W, H, { minSize: 1, mergeDistance: 0 })).toHaveLength(2);
  });

  it('adjacent regions within mergeDistance merge into one bounding box', () => {
    // Two rects with an 8px horizontal gap
    const buf = diffBufferWith([
      { x: 10, y: 10, width: 20, height: 20 },
      { x: 38, y: 10, width: 20, height: 20 },
    ]);
    const merged = detectRegions(buf, W, H, { minSize: 10, mergeDistance: 10 });
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ x: 10, y: 10, width: 48, height: 20 });
    expect(merged[0].diffPixels).toBe(2 * 20 * 20); // pixel counts sum, box unions

    const apart = detectRegions(buf, W, H, { minSize: 10, mergeDistance: 4 });
    expect(apart).toHaveLength(2);
  });

  it('merging cascades (A near B near C ⇒ one region)', () => {
    const buf = diffBufferWith([
      { x: 10, y: 10, width: 10, height: 10 },
      { x: 26, y: 10, width: 10, height: 10 },
      { x: 42, y: 10, width: 10, height: 10 },
    ]);
    const regions = detectRegions(buf, W, H, { minSize: 5, mergeDistance: 8 });
    expect(regions).toHaveLength(1);
    expect(regions[0]).toMatchObject({ x: 10, y: 10, width: 42, height: 10 });
  });

  it('legacy numeric minSize argument still works (back-compat)', () => {
    const buf = diffBufferWith([{ x: 10, y: 10, width: 5, height: 5 }]);
    expect(detectRegions(buf, W, H, 10)).toHaveLength(1);
    expect(detectRegions(buf, W, H, 26)).toHaveLength(0);
  });
});

describe('diff() end-to-end with region options', () => {
  it('reports regions for real pixel differences', () => {
    const baseline = solidRgba(W, H, WHITE);
    const candidate = solidRgba(W, H, WHITE);
    paintRect(candidate, W, H, { x: 20, y: 30, width: 40, height: 25 }, RED);
    paintRect(candidate, W, H, { x: 120, y: 150, width: 30, height: 30 }, RED);

    const out = new Uint8ClampedArray(W * H * 4);
    const result = diff(baseline, candidate, out, W, H, {
      detectRegions: true,
      regionOptions: { minSize: 10, mergeDistance: 12 },
    });

    expect(result.regions).toHaveLength(2);
    expect(result.regions![0]).toMatchObject({ x: 20, y: 30, width: 40, height: 25 });
    expect(result.regions![1]).toMatchObject({ x: 120, y: 150, width: 30, height: 30 });
  });
});
