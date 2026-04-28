/**
 * TestivAI Diff Engine — Ignore regions
 *
 * Before the diff loop runs, copy candidate pixel values into the
 * baseline buffer for ignored regions. This makes ignored areas
 * appear identical to the differ.
 */

import { IgnoreRegion } from './types';

/**
 * Mask ignored regions by copying candidate pixels into baseline.
 * After this, the diff loop will see no difference in those areas.
 *
 * Mutates `baseline` in place.
 *
 * @param baseline - Baseline pixel buffer (will be mutated)
 * @param candidate - Candidate pixel buffer
 * @param width - Image width
 * @param height - Image height
 * @param regions - Regions to ignore
 */
export function applyIgnoreRegions(
  baseline: Uint8Array | Uint8ClampedArray,
  candidate: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  regions: IgnoreRegion[],
): void {
  for (const region of regions) {
    // Clamp to image bounds
    const x0 = Math.max(0, Math.min(region.x, width));
    const y0 = Math.max(0, Math.min(region.y, height));
    const x1 = Math.max(0, Math.min(region.x + region.width, width));
    const y1 = Math.max(0, Math.min(region.y + region.height, height));

    for (let y = y0; y < y1; y++) {
      const rowOffset = y * width * 4;
      for (let x = x0; x < x1; x++) {
        const pixelOffset = rowOffset + x * 4;
        // Copy RGBA from candidate to baseline
        baseline[pixelOffset] = candidate[pixelOffset];
        baseline[pixelOffset + 1] = candidate[pixelOffset + 1];
        baseline[pixelOffset + 2] = candidate[pixelOffset + 2];
        baseline[pixelOffset + 3] = candidate[pixelOffset + 3];
      }
    }
  }
}
