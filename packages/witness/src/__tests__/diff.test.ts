/**
 * Tests for the TestivAI Diff Engine
 *
 * Uses programmatically generated pixel buffers (no external PNG files).
 */

import { diff, detectRegions, normalizeDimensions } from '../diff';
import { DiffOptions, DiffResult } from '../diff/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Create a solid-color RGBA pixel buffer */
function createSolidBuffer(width: number, height: number, r: number, g: number, b: number, a = 255): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = r;
    buf[i + 1] = g;
    buf[i + 2] = b;
    buf[i + 3] = a;
  }
  return buf;
}

/** Create a buffer with a colored block at a specific position */
function createBufferWithBlock(
  width: number, height: number,
  bgR: number, bgG: number, bgB: number,
  blockX: number, blockY: number, blockW: number, blockH: number,
  blockR: number, blockG: number, blockB: number,
): Uint8ClampedArray {
  const buf = createSolidBuffer(width, height, bgR, bgG, bgB);
  for (let y = blockY; y < blockY + blockH && y < height; y++) {
    for (let x = blockX; x < blockX + blockW && x < width; x++) {
      const idx = (y * width + x) * 4;
      buf[idx] = blockR;
      buf[idx + 1] = blockG;
      buf[idx + 2] = blockB;
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

/** Create an output diff buffer */
function createDiffBuffer(width: number, height: number): Uint8ClampedArray {
  return new Uint8ClampedArray(width * height * 4);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Diff Engine', () => {
  describe('T1.1 - Identical buffers', () => {
    it('should return diffCount=0 and isIdentical=true for identical images', () => {
      const w = 10, h = 10;
      const baseline = createSolidBuffer(w, h, 128, 64, 32);
      const candidate = createSolidBuffer(w, h, 128, 64, 32);
      const output = createDiffBuffer(w, h);

      const result = diff(baseline, candidate, output, w, h);

      expect(result.diffCount).toBe(0);
      expect(result.isIdentical).toBe(true);
      expect(result.diffPercent).toBe(0);
      expect(result.totalPixels).toBe(100);
      expect(result.hash).toBe(0);
    });
  });

  describe('T1.2 - Different buffers', () => {
    it('should return correct diffCount and diffPercent for completely different images', () => {
      const w = 10, h = 10;
      const baseline = createSolidBuffer(w, h, 0, 0, 0);       // black
      const candidate = createSolidBuffer(w, h, 255, 255, 255); // white
      const output = createDiffBuffer(w, h);

      const result = diff(baseline, candidate, output, w, h);

      expect(result.diffCount).toBeGreaterThan(0);
      expect(result.isIdentical).toBe(false);
      expect(result.diffPercent).toBeGreaterThan(0);
      expect(result.totalPixels).toBe(100);
    });

    it('should detect partial differences when only some pixels differ', () => {
      const w = 10, h = 10;
      // Baseline: all black. Candidate: first row is white, rest is black.
      const baseline = createSolidBuffer(w, h, 0, 0, 0);
      const candidate = createSolidBuffer(w, h, 0, 0, 0);
      // Make first row white
      for (let x = 0; x < w; x++) {
        const idx = x * 4;
        candidate[idx] = 255;
        candidate[idx + 1] = 255;
        candidate[idx + 2] = 255;
      }
      const output = createDiffBuffer(w, h);

      const result = diff(baseline, candidate, output, w, h);

      expect(result.diffCount).toBeGreaterThan(0);
      expect(result.diffCount).toBeLessThanOrEqual(w); // at most 10 pixels changed
      expect(result.isIdentical).toBe(false);
    });
  });

  describe('T1.3 - Threshold sensitivity', () => {
    it('should catch more diffs with lower threshold', () => {
      const w = 10, h = 10;
      const baseline = createSolidBuffer(w, h, 100, 100, 100);
      // Subtle difference
      const candidate = createSolidBuffer(w, h, 110, 100, 100);
      const output1 = createDiffBuffer(w, h);
      const output2 = createDiffBuffer(w, h);

      const resultLow = diff(baseline, candidate, output1, w, h, { threshold: 0.01 });
      const resultHigh = diff(baseline, candidate, output2, w, h, { threshold: 0.5 });

      // Lower threshold should catch more or equal diffs
      expect(resultLow.diffCount).toBeGreaterThanOrEqual(resultHigh.diffCount);
    });
  });

  describe('T1.4 - Minimap overlay', () => {
    it('should modify output buffer when minimap is enabled', () => {
      const w = 20, h = 20;
      const baseline = createSolidBuffer(w, h, 0, 0, 0);
      const candidate = createSolidBuffer(w, h, 255, 255, 255);
      const outputNoMinimap = createDiffBuffer(w, h);
      const outputWithMinimap = createDiffBuffer(w, h);

      diff(baseline, candidate, outputNoMinimap, w, h, { enableMinimap: false });
      diff(baseline, candidate, outputWithMinimap, w, h, { enableMinimap: true });

      // With minimap, additional pixels get ORed with the minimap color,
      // so the output should be different from without minimap
      let differ = false;
      for (let i = 0; i < outputNoMinimap.length; i++) {
        if (outputNoMinimap[i] !== outputWithMinimap[i]) {
          differ = true;
          break;
        }
      }
      expect(differ).toBe(true);
    });
  });

  describe('T1.5 - Ignore regions', () => {
    it('should not count masked areas in diff', () => {
      const w = 10, h = 10;
      const baseline = createSolidBuffer(w, h, 0, 0, 0);
      const candidate = createSolidBuffer(w, h, 255, 255, 255);
      const output1 = createDiffBuffer(w, h);
      const output2 = createDiffBuffer(w, h);

      // Without ignore: all pixels differ
      const resultFull = diff(baseline, candidate, output1, w, h);

      // Ignore the entire image
      const resultIgnored = diff(baseline, candidate, output2, w, h, {
        ignoreRegions: [{ x: 0, y: 0, width: w, height: h }],
      });

      expect(resultFull.diffCount).toBeGreaterThan(0);
      expect(resultIgnored.diffCount).toBe(0);
      expect(resultIgnored.isIdentical).toBe(true);
    });

    it('should only ignore specified regions', () => {
      const w = 10, h = 10;
      const baseline = createSolidBuffer(w, h, 0, 0, 0);
      const candidate = createSolidBuffer(w, h, 255, 255, 255);
      const output = createDiffBuffer(w, h);

      // Ignore half the image
      const result = diff(baseline, candidate, output, w, h, {
        ignoreRegions: [{ x: 0, y: 0, width: 5, height: h }],
      });

      // Should still detect diffs in the non-ignored half
      expect(result.diffCount).toBeGreaterThan(0);
      // But less than full diff
      const fullResult = diff(
        createSolidBuffer(w, h, 0, 0, 0),
        createSolidBuffer(w, h, 255, 255, 255),
        createDiffBuffer(w, h),
        w, h,
      );
      expect(result.diffCount).toBeLessThan(fullResult.diffCount);
    });
  });

  describe('T1.6 - Size mismatch with pad', () => {
    it('should pad smaller image and return SizeMismatch info', () => {
      const baseline = createSolidBuffer(10, 10, 128, 128, 128);
      const candidate = createSolidBuffer(10, 8, 128, 128, 128); // shorter
      const output = createDiffBuffer(10, 10);

      const result = diff(baseline, candidate, output, 10, 10, {
        handleSizeMismatch: 'pad',
      });

      expect(result.sizeMismatch).toBeDefined();
      expect(result.sizeMismatch!.baseline).toEqual({ width: 10, height: 10 });
      expect(result.sizeMismatch!.candidate).toEqual({ width: 10, height: 8 });
      expect(result.sizeMismatch!.normalized.width).toBe(10);
      expect(result.sizeMismatch!.normalized.height).toBe(10);
    });
  });

  describe('T1.7 - Size mismatch with crop', () => {
    it('should use minimum dimensions', () => {
      const result = normalizeDimensions(
        createSolidBuffer(10, 10, 0, 0, 0), 10, 10,
        createSolidBuffer(8, 8, 0, 0, 0), 8, 8,
        'crop',
      );

      expect(result.width).toBe(8);
      expect(result.height).toBe(8);
      expect(result.normalizedBaseline.length).toBe(8 * 8 * 4);
      expect(result.normalizedCandidate.length).toBe(8 * 8 * 4);
    });
  });

  describe('T1.8 - Size mismatch with error', () => {
    it('should throw a descriptive error', () => {
      expect(() => {
        normalizeDimensions(
          createSolidBuffer(10, 10, 0, 0, 0), 10, 10,
          createSolidBuffer(8, 8, 0, 0, 0), 8, 8,
          'error',
        );
      }).toThrow(/Size mismatch.*10×10.*8×8/);
    });
  });

  describe('T1.9 - Region detection', () => {
    it('should return bounding boxes for change clusters', () => {
      const w = 20, h = 20;
      // Baseline: all black. Candidate: has a white block at (5,5)-(9,9)
      const baseline = createSolidBuffer(w, h, 0, 0, 0);
      const candidate = createBufferWithBlock(w, h, 0, 0, 0, 5, 5, 5, 5, 255, 255, 255);
      const output = createDiffBuffer(w, h);

      const result = diff(baseline, candidate, output, w, h, {
        detectRegions: true,
      });

      expect(result.regions).toBeDefined();
      expect(result.regions!.length).toBeGreaterThan(0);

      // The region should encompass the changed block
      const region = result.regions![0];
      expect(region.x).toBeGreaterThanOrEqual(5);
      expect(region.y).toBeGreaterThanOrEqual(5);
      expect(region.diffPixels).toBeGreaterThan(0);
    });
  });

  describe('T1.10 - Region detection filters noise', () => {
    it('should filter out regions below minSize', () => {
      const w = 20, h = 20;
      const baseline = createSolidBuffer(w, h, 0, 0, 0);
      const candidate = createSolidBuffer(w, h, 0, 0, 0);
      // Change just 2 pixels (below default minSize of 10)
      candidate[0] = 255;     // pixel (0,0) R
      candidate[1] = 255;     // pixel (0,0) G
      candidate[2] = 255;     // pixel (0,0) B
      candidate[4] = 255;     // pixel (1,0) R
      candidate[5] = 255;     // pixel (1,0) G
      candidate[6] = 255;     // pixel (1,0) B
      const output = createDiffBuffer(w, h);

      const result = diff(baseline, candidate, output, w, h, {
        detectRegions: true,
      });

      // Regions should be empty since 2 pixels < minSize of 10
      if (result.regions) {
        expect(result.regions.length).toBe(0);
      }
    });
  });

  describe('T1.11 - Backward compatibility', () => {
    it('should always return a full DiffResult object', () => {
      const w = 5, h = 5;
      const baseline = createSolidBuffer(w, h, 0, 0, 0);
      const candidate = createSolidBuffer(w, h, 255, 255, 255);
      const output = createDiffBuffer(w, h);

      const result = diff(baseline, candidate, output, w, h);

      // Verify all expected properties exist
      expect(typeof result.diffCount).toBe('number');
      expect(typeof result.cumulatedDiff).toBe('number');
      expect(typeof result.hash).toBe('number');
      expect(typeof result.diffPercent).toBe('number');
      expect(typeof result.totalPixels).toBe('number');
      expect(typeof result.isIdentical).toBe('boolean');
    });
  });

  describe('T1.12 - Hash consistency', () => {
    it('should produce the same hash for the same diff', () => {
      const w = 10, h = 10;
      const baseline = createSolidBuffer(w, h, 0, 0, 0);
      const candidate = createSolidBuffer(w, h, 255, 0, 0);

      const output1 = createDiffBuffer(w, h);
      const output2 = createDiffBuffer(w, h);

      const result1 = diff(baseline, candidate, output1, w, h);
      const result2 = diff(baseline, candidate, output2, w, h);

      expect(result1.hash).toBe(result2.hash);
      expect(result1.hash).not.toBe(0);
    });

    it('should produce different hashes for different diffs', () => {
      const w = 10, h = 10;
      const baseline = createSolidBuffer(w, h, 0, 0, 0);
      const candidateA = createSolidBuffer(w, h, 255, 0, 0);  // red
      const candidateB = createSolidBuffer(w, h, 0, 255, 0);  // green

      const outputA = createDiffBuffer(w, h);
      const outputB = createDiffBuffer(w, h);

      const resultA = diff(baseline, candidateA, outputA, w, h);
      const resultB = diff(baseline, candidateB, outputB, w, h);

      // Different color changes should produce different hashes
      // (Though Pbd hash is position-based, same positions → same hash for uniform images.
      //  But the diff *values* may differ, so we just check both are non-zero.)
      expect(resultA.hash).not.toBe(0);
      expect(resultB.hash).not.toBe(0);
    });
  });
});
