/**
 * Masking DSL — schema validation, resolution, and image application.
 *
 * Masks come in two shapes:
 *   - CSS selector strings ("#cookie-banner") — resolved against rects the
 *     adapter captured at capture time (metadata maskRects)
 *   - geometric regions — px numbers, 0–1 ratio numbers, "50%" strings,
 *     or single-edge shorthands like { top: 24 }
 *
 * Masked regions are excluded from diffing AND visibly hatched in the diff
 * output — silent masking is not acceptable.
 */

import {
  parseMaskSpec,
  resolveMasks,
  applyMaskRects,
  hatchMaskRects,
  type MaskRect,
} from '../diff/mask';
import { diff } from '../diff';
import { solidRgba, paintRect, RED, WHITE } from './helpers/synth';

describe('parseMaskSpec — schema validation', () => {
  it('accepts a CSS selector string', () => {
    const r = parseMaskSpec('#cookie-banner');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mask.type).toBe('selector');
  });

  it('accepts a full geometric region in px', () => {
    const r = parseMaskSpec({ x: 10, y: 20, width: 100, height: 50 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mask.type).toBe('region');
  });

  it('accepts 0–1 ratios and "%" strings interchangeably', () => {
    expect(parseMaskSpec({ x: 0.5, y: 0, width: 0.5, height: 0.1 }).ok).toBe(true);
    expect(parseMaskSpec({ x: '50%', y: '0%', width: '50%', height: '10%' }).ok).toBe(true);
  });

  it('accepts single-edge shorthands', () => {
    for (const edge of ['top', 'right', 'bottom', 'left'] as const) {
      const r = parseMaskSpec({ [edge]: 24 });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.mask.type).toBe('edge');
    }
  });

  it('rejects multi-edge shorthands with an actionable message', () => {
    const r = parseMaskSpec({ top: 24, left: 10 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/one edge|separate masks/i);
  });

  it('rejects partial rects, negative sizes, junk types, empty selector', () => {
    expect(parseMaskSpec({ x: 10, y: 20 }).ok).toBe(false);
    expect(parseMaskSpec({ x: 0, y: 0, width: -5, height: 10 }).ok).toBe(false);
    expect(parseMaskSpec(42 as unknown as string).ok).toBe(false);
    expect(parseMaskSpec(null as unknown as string).ok).toBe(false);
    expect(parseMaskSpec('').ok).toBe(false);
    expect(parseMaskSpec({ x: '5x%', y: 0, width: 10, height: 10 }).ok).toBe(false);
  });
});

describe('resolveMasks — geometry resolution', () => {
  const W = 200;
  const H = 100;

  it('px rects pass through; ratios and % scale to image size', () => {
    const { rects } = resolveMasks(
      [{ x: 10, y: 20, width: 50, height: 30 }, { x: 0.5, y: 0, width: '25%', height: 0.5 }],
      W, H,
    );
    expect(rects).toHaveLength(2);
    expect(rects[0]).toMatchObject({ x: 10, y: 20, width: 50, height: 30 });
    expect(rects[1]).toMatchObject({ x: 100, y: 0, width: 50, height: 50 });
  });

  it('edge shorthands become full-width/height strips', () => {
    const { rects } = resolveMasks([{ top: 24 }, { bottom: 0.1 }, { left: '10%' }], W, H);
    expect(rects[0]).toMatchObject({ x: 0, y: 0, width: W, height: 24 });
    expect(rects[1]).toMatchObject({ x: 0, y: 90, width: W, height: 10 });
    expect(rects[2]).toMatchObject({ x: 0, y: 0, width: 20, height: H });
  });

  it('clamps out-of-bounds rects and drops zero-area results', () => {
    const { rects } = resolveMasks(
      [{ x: 180, y: 90, width: 100, height: 100 }, { x: 500, y: 500, width: 10, height: 10 }],
      W, H,
    );
    expect(rects).toHaveLength(1);
    expect(rects[0]).toMatchObject({ x: 180, y: 90, width: 20, height: 10 });
  });

  it('selector masks resolve via captured maskRects (may match multiple)', () => {
    const { rects, warnings } = resolveMasks(['#banner'], W, H, [
      { selector: '#banner', x: 0, y: 0, width: 50, height: 10 },
      { selector: '#banner', x: 0, y: 50, width: 50, height: 10 },
      { selector: '.other', x: 90, y: 0, width: 5, height: 5 },
    ]);
    expect(rects).toHaveLength(2);
    expect(warnings).toHaveLength(0);
    expect(rects.every((r) => r.source.type === 'selector')).toBe(true);
  });

  it('selector masks without captured rects warn and skip — never throw', () => {
    const { rects, warnings } = resolveMasks(['#banner'], W, H, undefined);
    expect(rects).toHaveLength(0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/#banner/);
  });
});

describe('mask application on synthetic images', () => {
  const W = 100;
  const H = 100;

  function runDiff(baseline: Uint8ClampedArray, candidate: Uint8ClampedArray, masks: MaskRect[]) {
    const out = new Uint8ClampedArray(W * H * 4);
    const result = diff(baseline, candidate, out, W, H, { masks, detectRegions: true });
    return { result, out };
  }

  const mask = (x: number, y: number, width: number, height: number): MaskRect => ({
    x, y, width, height,
    source: { type: 'region', spec: { x, y, width, height }, origin: 'config' },
  });

  it('a diff fully inside a mask is ignored', () => {
    const baseline = solidRgba(W, H, WHITE);
    const candidate = solidRgba(W, H, WHITE);
    paintRect(candidate, W, H, { x: 10, y: 10, width: 20, height: 20 }, RED);

    const { result } = runDiff(baseline, candidate, [mask(5, 5, 40, 40)]);
    expect(result.diffCount).toBe(0);
  });

  it('a diff outside the mask is still detected', () => {
    const baseline = solidRgba(W, H, WHITE);
    const candidate = solidRgba(W, H, WHITE);
    paintRect(candidate, W, H, { x: 60, y: 60, width: 20, height: 20 }, RED);

    const { result } = runDiff(baseline, candidate, [mask(0, 0, 40, 40)]);
    expect(result.diffCount).toBeGreaterThan(0);
    expect(result.regions?.length).toBe(1);
  });

  it('overlapping masks behave like their union', () => {
    const baseline = solidRgba(W, H, WHITE);
    const candidate = solidRgba(W, H, WHITE);
    paintRect(candidate, W, H, { x: 10, y: 10, width: 40, height: 10 }, RED);

    const { result } = runDiff(candidate, baseline, [mask(0, 0, 30, 30), mask(20, 0, 40, 30)]);
    expect(result.diffCount).toBe(0);
  });

  it('hatches masked areas in the diff output (auditable, not silent)', () => {
    const baseline = solidRgba(W, H, WHITE);
    const { out } = runDiff(baseline, baseline, [mask(20, 20, 30, 30)]);

    // Hatch pixels carry the distinctive HATCH_RGBA alpha (140); the
    // washed-context background and heat pixels are fully opaque (255).
    let hatchedInside = 0;
    let paintedOutside = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const alpha = out[(y * W + x) * 4 + 3];
        const inside = x >= 20 && x < 50 && y >= 20 && y < 50;
        if (alpha === 140) {
          if (inside) hatchedInside++;
          else paintedOutside++;
        }
      }
    }
    expect(hatchedInside).toBeGreaterThan(0); // hatch pattern present
    expect(hatchedInside).toBeLessThan(30 * 30); // it's a pattern, not a fill
    expect(paintedOutside).toBe(0);
  });

  it('applyMaskRects equalizes only masked pixels; hatchMaskRects only paints inside', () => {
    const baseline = solidRgba(W, H, WHITE);
    const candidate = solidRgba(W, H, WHITE);
    paintRect(candidate, W, H, { x: 0, y: 0, width: 10, height: 10 }, RED);
    applyMaskRects(baseline, candidate, W, H, [mask(0, 0, 10, 10)]);
    for (let i = 0; i < 10 * 4; i++) {
      expect(baseline[i]).toBe(candidate[i]);
    }

    const out = new Uint8ClampedArray(W * H * 4);
    hatchMaskRects(out, W, H, [mask(0, 0, 10, 10)]);
    const outsideIdx = (50 * W + 50) * 4 + 3;
    expect(out[outsideIdx]).toBe(0);
  });
});
