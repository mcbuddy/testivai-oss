/**
 * TestivAI Diff Engine — Size mismatch handling
 *
 * When baseline and candidate have different dimensions,
 * normalize them before diffing.
 */

import { SizeMismatch } from './types';

export interface NormalizeResult {
  normalizedBaseline: Uint8ClampedArray;
  normalizedCandidate: Uint8ClampedArray;
  width: number;
  height: number;
  sizeMismatch: SizeMismatch;
}

/**
 * Normalize two pixel buffers to the same dimensions.
 *
 * @param baseline - Baseline pixel buffer (RGBA)
 * @param bw - Baseline width
 * @param bh - Baseline height
 * @param candidate - Candidate pixel buffer (RGBA)
 * @param cw - Candidate width
 * @param ch - Candidate height
 * @param mode - 'pad' (fill with transparent), 'crop' (use min dims), or 'error'
 */
export function normalizeDimensions(
  baseline: Uint8Array | Uint8ClampedArray,
  bw: number,
  bh: number,
  candidate: Uint8Array | Uint8ClampedArray,
  cw: number,
  ch: number,
  mode: 'pad' | 'crop' | 'error',
): NormalizeResult {
  if (bw === cw && bh === ch) {
    return {
      normalizedBaseline: new Uint8ClampedArray(baseline),
      normalizedCandidate: new Uint8ClampedArray(candidate),
      width: bw,
      height: bh,
      sizeMismatch: {
        baseline: { width: bw, height: bh },
        candidate: { width: cw, height: ch },
        normalized: { width: bw, height: bh },
      },
    };
  }

  if (mode === 'error') {
    throw new Error(
      `Size mismatch: baseline is ${bw}×${bh}, candidate is ${cw}×${ch}. ` +
      `Set handleSizeMismatch to 'pad' or 'crop' to handle this automatically.`
    );
  }

  let targetWidth: number;
  let targetHeight: number;

  if (mode === 'pad') {
    targetWidth = Math.max(bw, cw);
    targetHeight = Math.max(bh, ch);
  } else {
    // crop
    targetWidth = Math.min(bw, cw);
    targetHeight = Math.min(bh, ch);
  }

  const normalizedBaseline = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  const normalizedCandidate = new Uint8ClampedArray(targetWidth * targetHeight * 4);

  // Copy baseline rows
  const copyWidthB = Math.min(bw, targetWidth);
  const copyHeightB = Math.min(bh, targetHeight);
  for (let y = 0; y < copyHeightB; y++) {
    const srcStart = y * bw * 4;
    const dstStart = y * targetWidth * 4;
    const bytesToCopy = copyWidthB * 4;
    normalizedBaseline.set(
      baseline.slice(srcStart, srcStart + bytesToCopy),
      dstStart,
    );
  }

  // Copy candidate rows
  const copyWidthC = Math.min(cw, targetWidth);
  const copyHeightC = Math.min(ch, targetHeight);
  for (let y = 0; y < copyHeightC; y++) {
    const srcStart = y * cw * 4;
    const dstStart = y * targetWidth * 4;
    const bytesToCopy = copyWidthC * 4;
    normalizedCandidate.set(
      candidate.slice(srcStart, srcStart + bytesToCopy),
      dstStart,
    );
  }

  return {
    normalizedBaseline,
    normalizedCandidate,
    width: targetWidth,
    height: targetHeight,
    sizeMismatch: {
      baseline: { width: bw, height: bh },
      candidate: { width: cw, height: ch },
      normalized: { width: targetWidth, height: targetHeight },
    },
  };
}
