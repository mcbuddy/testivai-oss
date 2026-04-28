/**
 * TestivAI Diff Engine — Core comparison loop
 *
 * Originally forked from pixel-buffer-diff (Pbd) by @p01, licensed under MIT.
 * https://github.com/p01/pixel-buffer-diff
 *
 * The core pixel comparison algorithm is preserved exactly.
 * Extended with: ignore regions, size mismatch handling, region detection,
 * and enriched DiffResult.
 */

import { DiffOptions, DiffResult, PbdRawResult } from './types';
import { applyIgnoreRegions } from './ignore';
import { normalizeDimensions } from './resize';
import { detectRegions } from './regions';
import { applyMinimap } from './minimap';

// ── Pbd constants (unchanged) ───────────────────────────────────────────────
const MINIMAP_SCALE = 128;
const COLOR32_ADDED = 0x03f00cc00;
const COLOR32_REMOVED = 0x03f0000ff;
const COLOR32_MINIMAP = 0x0207f0000;
const HASH_SPREAD = 0x0f0731337;

// ── Default options ─────────────────────────────────────────────────────────
const DEFAULT_OPTIONS: Required<Pick<DiffOptions, 'threshold' | 'cumulatedThreshold' | 'enableMinimap' | 'detectRegions'>> = {
  threshold: 0.1,
  cumulatedThreshold: 0.5,
  enableMinimap: false,
  detectRegions: false,
};

/**
 * Compare two pixel buffers and produce a diff image.
 *
 * Drop-in compatible with pixelmatch when called as:
 *   diff(img1, img2, output, w, h) → returns DiffResult
 *
 * @param baseline8  - Baseline image pixel data (RGBA, 4 bytes per pixel)
 * @param candidate8 - Candidate image pixel data (RGBA, 4 bytes per pixel)
 * @param diff8      - Output buffer for the diff image (same size as inputs)
 * @param width      - Width of the images in pixels
 * @param height     - Height of the images in pixels
 * @param options    - Comparison options
 * @returns DiffResult with counts, percentages, and optional regions
 */
export function diff(
  baseline8: Uint8Array | Uint8ClampedArray,
  candidate8: Uint8Array | Uint8ClampedArray,
  diff8: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  options: DiffOptions = {},
): DiffResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // ── Size mismatch handling ──────────────────────────────────────────────
  let sizeMismatch: DiffResult['sizeMismatch'];
  let effectiveWidth = width;
  let effectiveHeight = height;
  let effectiveBaseline = baseline8;
  let effectiveCandidate = candidate8;

  // If caller provided handleSizeMismatch and dimensions were embedded,
  // we need external width/height per buffer. For the simple API the caller
  // is expected to have already normalized — but we expose normalizeDimensions
  // as a public utility. Here we just validate.
  const expectedLen = width * height * 4;
  if (baseline8.length !== expectedLen || candidate8.length !== expectedLen) {
    if (opts.handleSizeMismatch) {
      // Infer baseline dimensions from baseline8.length and supplied width
      const baselineHeight = baseline8.length / (width * 4);
      const candidateHeight = candidate8.length / (width * 4);

      // If widths differ, we need both dimensions — use normalizeDimensions
      const bw = width;
      const bh = Math.round(baselineHeight);
      const cw = width;
      const ch = Math.round(candidateHeight);

      const normalized = normalizeDimensions(
        baseline8, bw, bh,
        candidate8, cw, ch,
        opts.handleSizeMismatch,
      );

      effectiveBaseline = normalized.normalizedBaseline;
      effectiveCandidate = normalized.normalizedCandidate;
      effectiveWidth = normalized.width;
      effectiveHeight = normalized.height;
      sizeMismatch = normalized.sizeMismatch;

      // Re-create diff buffer if size changed
      if (diff8.length !== effectiveWidth * effectiveHeight * 4) {
        diff8 = new Uint8ClampedArray(effectiveWidth * effectiveHeight * 4);
      }
    } else {
      throw new Error(
        `Buffer size mismatch: expected ${expectedLen} bytes (${width}×${height}×4), ` +
        `got baseline=${baseline8.length}, candidate=${candidate8.length}. ` +
        `Set handleSizeMismatch option to 'pad', 'crop', or 'error'.`
      );
    }
  }

  // ── Ignore regions ──────────────────────────────────────────────────────
  if (opts.ignoreRegions && opts.ignoreRegions.length > 0) {
    // Clone buffers so we don't mutate originals
    effectiveBaseline = new Uint8ClampedArray(effectiveBaseline);
    effectiveCandidate = new Uint8ClampedArray(effectiveCandidate);
    applyIgnoreRegions(effectiveBaseline, effectiveCandidate, effectiveWidth, effectiveHeight, opts.ignoreRegions);
  }

  // ── Core Pbd diff loop (basic mode — pixel-level YIQ comparison) ──────
  const raw = pbdDiffCore(
    effectiveBaseline,
    effectiveCandidate,
    diff8,
    effectiveWidth,
    effectiveHeight,
    opts.threshold,
    opts.cumulatedThreshold,
    opts.enableMinimap,
  );

  // ── Compute extended result ─────────────────────────────────────────────
  const totalPixels = effectiveWidth * effectiveHeight;
  const diffPercent = totalPixels > 0 ? (raw.diff / totalPixels) * 100 : 0;
  const isIdentical = raw.diff === 0;

  const result: DiffResult = {
    diffCount: raw.diff,
    cumulatedDiff: raw.cumulatedDiff,
    hash: raw.hash,
    diffPercent,
    totalPixels,
    isIdentical,
  };

  if (sizeMismatch) {
    result.sizeMismatch = sizeMismatch;
  }

  // ── Region detection ────────────────────────────────────────────────────
  if (opts.detectRegions && !isIdentical) {
    result.regions = detectRegions(diff8, effectiveWidth, effectiveHeight);
  }

  return result;
}

/**
 * Core Pbd diff loop — pixel-level YIQ comparison.
 * Algorithm is preserved exactly from pixel-buffer-diff.
 * @internal
 */
function pbdDiffCore(
  baseline8: Uint8Array | Uint8ClampedArray,
  candidate8: Uint8Array | Uint8ClampedArray,
  diff8: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number,
  cumulatedThreshold: number,
  enableMinimap: boolean,
): PbdRawResult {
  const area = width * height;
  const b8l = baseline8.length;

  // Maximum acceptable square distance between two colors;
  // 35215 is the maximum possible value for the YIQ difference metric
  const deltaThreshold = threshold * threshold * 35215;

  // Use ArrayBuffer views for 32-bit access
  const bBuffer = baseline8.buffer;
  const bOffset = baseline8.byteOffset;
  const cBuffer = candidate8.buffer;
  const cOffset = candidate8.byteOffset;
  const dBuffer = diff8.buffer;
  const dOffset = diff8.byteOffset;
  const baseline32 = new Uint32Array(bBuffer, bOffset, area);
  const candidate32 = new Uint32Array(cBuffer, cOffset, area);
  const diff32 = new Uint32Array(dBuffer, dOffset, area);

  let b8i = 0;
  let b32i = 0;
  let d32i = 0;
  let diffCount = 0;
  let hash = 0;
  let hashStart = 0;
  let cumulatedDiff = 0;

  // Quick approx of color theme to figure if "new" pixels should be dark or light
  let averageBrightness = 0;
  const brightnessSamples = Math.ceil(Math.sqrt(area) / 128);
  const b8iStep = (b8l / brightnessSamples) & -4;
  let sampleIdx = 0;
  for (let i = 0; i < brightnessSamples; i++) {
    averageBrightness +=
      (0.299 * (baseline8[sampleIdx] + candidate8[sampleIdx]) +
        0.587 * (baseline8[sampleIdx + 1] + candidate8[sampleIdx + 1]) +
        0.114 * (baseline8[sampleIdx + 2] + candidate8[sampleIdx + 2])) /
      brightnessSamples /
      2;
    sampleIdx += b8iStep;
  }
  const isDarkTheme = averageBrightness < 128;
  const color32Added = isDarkTheme ? COLOR32_ADDED : COLOR32_REMOVED;
  const color32Removed = isDarkTheme ? COLOR32_REMOVED : COLOR32_ADDED;

  // Minimap tracking
  const miniHeight = Math.ceil(height / MINIMAP_SCALE);
  const miniWidth = Math.ceil(width / MINIMAP_SCALE);
  const miniMap = new Uint8ClampedArray(miniWidth * miniHeight);
  const maxDimension = Math.max(width, height);
  const maxMiniDimension = Math.max(miniWidth, miniHeight);
  const axisMiniIndex = new Uint32Array(maxDimension);

  let miniIndex = 0;
  for (let i = 0; i < maxMiniDimension; i++) {
    axisMiniIndex.fill(i, miniIndex, Math.min(miniIndex + MINIMAP_SCALE, maxDimension));
    miniIndex += MINIMAP_SCALE;
  }

  // ── Per-pixel comparison ────────────────────────────────────────────────
  for (let y = 0; y < height; y++) {
    const miniIndexY = axisMiniIndex[y] * miniWidth;
    let hashIndex = (y ^ HASH_SPREAD) * HASH_SPREAD;

    for (let x = 0; x < width; x++, d32i++, b32i++, b8i += 4, hashIndex++) {
      // Quick check against the Uint32
      if (baseline32[b32i] === candidate32[b32i]) {
        continue;
      }

      // Get the r,g,b -> y,i,q => YIQ square delta
      const dr = candidate8[b8i] - baseline8[b8i];
      const dg = candidate8[b8i + 1] - baseline8[b8i + 1];
      const db = candidate8[b8i + 2] - baseline8[b8i + 2];

      const dy = dr * 0.29889531 + dg * 0.58662247 + db * 0.11448223;
      const di = dr * 0.59597799 - dg * 0.27417610 - db * 0.32180189;
      const dq = dr * 0.21147017 - dg * 0.52261711 + db * 0.31114694;

      const delta = dy * dy * 0.5053 + di * di * 0.299 + dq * dq * 0.1957;
      if (delta > deltaThreshold) {
        miniMap[miniIndexY + axisMiniIndex[x]]++;
        diffCount++;
        const dyAbs = Math.abs(dy);
        cumulatedDiff += dyAbs;
        diff32[d32i] =
          (dy > 0 ? color32Added : color32Removed) +
          (Math.min(192, dyAbs * 8) << 24);

        if (hash === 0) {
          hashStart = hashIndex;
        }
        hash += hashIndex;
      }
    }
  }

  hash -= hashStart;
  cumulatedDiff /= 256;

  // Apply minimap overlay
  if (enableMinimap) {
    applyMinimap(diff32, miniMap, miniWidth, miniHeight, width, height, MINIMAP_SCALE, COLOR32_MINIMAP);
  }

  // If cumulated diff is within threshold, treat as identical
  if (cumulatedDiff <= cumulatedThreshold) {
    return { diff: 0, cumulatedDiff: 0, hash: 0 };
  }

  return { diff: diffCount, cumulatedDiff, hash };
}
