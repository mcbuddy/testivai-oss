/**
 * TestivAI Diff Engine Types
 *
 * Originally forked from pixel-buffer-diff (Pbd) by @p01.
 * Extended with ignore regions, size mismatch handling,
 * region detection, and TypeScript support.
 */

export interface DiffOptions {
  /** Individual pixel matching threshold (0-1). Default: 0.1 */
  threshold?: number;
  /** Cumulated pixel matching threshold for anti-aliasing filtering. Default: 0.5 */
  cumulatedThreshold?: number;
  /** Enable low-resolution minimap overlay on diff output. Default: false */
  enableMinimap?: boolean;
  /** Coordinate-based regions to ignore during comparison */
  ignoreRegions?: IgnoreRegion[];
  /** Detect and return bounding boxes of changed regions. Default: false */
  detectRegions?: boolean;
  /** How to handle size mismatches between baseline and candidate */
  handleSizeMismatch?: 'pad' | 'crop' | 'error';
}

export interface IgnoreRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DiffResult {
  /** Number of pixels that exceeded the threshold */
  diffCount: number;
  /** Cumulated difference of every pixel change (for anti-aliasing detection) */
  cumulatedDiff: number;
  /** Numeric hash of pixel changes for deduplication */
  hash: number;
  /** Percentage of pixels that differ (0-100) */
  diffPercent: number;
  /** Total number of pixels compared */
  totalPixels: number;
  /** True if images are identical (within thresholds) */
  isIdentical: boolean;
  /** Bounding boxes of change clusters (if detectRegions was enabled) */
  regions?: DiffRegion[];
  /** Size mismatch info (if dimensions differed and were normalized) */
  sizeMismatch?: SizeMismatch;
}

export interface DiffRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Number of changed pixels within this region's bounding box */
  diffPixels: number;
  /** Percentage of changed pixels within this region's bounding box */
  diffPercent: number;
}

export interface SizeMismatch {
  baseline: { width: number; height: number };
  candidate: { width: number; height: number };
  normalized: { width: number; height: number };
}

/**
 * Raw result from the core Pbd diff loop (before extensions).
 * @internal
 */
export interface PbdRawResult {
  diff: number;
  cumulatedDiff: number;
  hash: number;
}
