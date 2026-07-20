/**
 * TestivAI Diff Engine — Region bounding box detection
 *
 * Scans the diff output buffer for non-zero (changed) pixels
 * and groups them into rectangular bounding boxes using a simple
 * connected-component labeling approach.
 */

import { DiffRegion, RegionOptions } from './types';

/** Defaults for region clustering (config-overridable). */
export const DEFAULT_REGION_OPTIONS: Required<RegionOptions> = {
  minSize: 10,
  mergeDistance: 12,
};

/**
 * Detect regions of change in the diff buffer.
 *
 * Scans for non-transparent pixels (any pixel with alpha > 0 in
 * the diff output), groups adjacent changed pixels into rectangular
 * bounding boxes, filters out regions smaller than the noise floor,
 * and merges regions whose bounding boxes are within mergeDistance px
 * of each other (an anti-fragmentation pass — one logical change often
 * rasterizes as several nearby specks).
 *
 * @param diff8   - Diff image pixel buffer (RGBA)
 * @param width   - Image width
 * @param height  - Image height
 * @param options - { minSize, mergeDistance }, or a bare number meaning
 *                  minSize (legacy signature, mergeDistance 0)
 * @returns Array of DiffRegion bounding boxes
 */
export function detectRegions(
  diff8: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  options: number | RegionOptions = {},
): DiffRegion[] {
  const opts: Required<RegionOptions> =
    typeof options === 'number'
      ? { minSize: options, mergeDistance: 0 }
      : { ...DEFAULT_REGION_OPTIONS, ...options };
  const minSize = opts.minSize;
  // Build a binary grid: 1 = changed pixel, 0 = unchanged
  const changed = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // A pixel is considered "changed" if it has any non-zero alpha
      // in the diff buffer (the diff engine writes colored pixels for changes)
      if (diff8[idx + 3] > 0) {
        changed[y * width + x] = 1;
      }
    }
  }

  // Connected-component labeling using union-find
  const labels = new Int32Array(width * height).fill(-1);
  const parent: number[] = [];
  let nextLabel = 0;

  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]; // path compression
      x = parent[x];
    }
    return x;
  }

  function union(a: number, b: number): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) {
      parent[rb] = ra;
    }
  }

  // First pass: assign labels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!changed[idx]) continue;

      const neighbors: number[] = [];

      // Check left
      if (x > 0 && labels[idx - 1] >= 0) {
        neighbors.push(labels[idx - 1]);
      }
      // Check above
      if (y > 0 && labels[idx - width] >= 0) {
        neighbors.push(labels[idx - width]);
      }

      if (neighbors.length === 0) {
        // New label
        labels[idx] = nextLabel;
        parent.push(nextLabel);
        nextLabel++;
      } else {
        // Use the smallest label
        const minLabel = Math.min(...neighbors.map(find));
        labels[idx] = minLabel;
        // Union all neighbor labels
        for (const n of neighbors) {
          union(minLabel, n);
        }
      }
    }
  }

  // Second pass: collect bounding boxes per component
  const boxes = new Map<number, { x0: number; y0: number; x1: number; y1: number; count: number }>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (labels[idx] < 0) continue;

      const root = find(labels[idx]);
      const box = boxes.get(root);
      if (box) {
        box.x0 = Math.min(box.x0, x);
        box.y0 = Math.min(box.y0, y);
        box.x1 = Math.max(box.x1, x);
        box.y1 = Math.max(box.y1, y);
        box.count++;
      } else {
        boxes.set(root, { x0: x, y0: y, x1: x, y1: y, count: 1 });
      }
    }
  }

  // Convert to DiffRegion array, filtering by minSize
  const regions: DiffRegion[] = [];
  for (const box of boxes.values()) {
    if (box.count < minSize) continue;

    const regionWidth = box.x1 - box.x0 + 1;
    const regionHeight = box.y1 - box.y0 + 1;
    const regionArea = regionWidth * regionHeight;

    regions.push({
      x: box.x0,
      y: box.y0,
      width: regionWidth,
      height: regionHeight,
      diffPixels: box.count,
      diffPercent: regionArea > 0 ? (box.count / regionArea) * 100 : 0,
    });
  }

  const merged = mergeRegions(regions, opts.mergeDistance);

  // Sort by position (top-left first)
  merged.sort((a, b) => a.y - b.y || a.x - b.x);

  return merged;
}

/**
 * Merge regions whose bounding boxes are within `distance` px of each
 * other (Chebyshev gap: both axis gaps must be within the distance).
 * Merging cascades until stable; pixel counts sum, boxes union.
 * Region counts are small, so the O(n²) pass is fine.
 */
export function mergeRegions(regions: DiffRegion[], distance: number): DiffRegion[] {
  if (distance <= 0 || regions.length < 2) return regions;

  const gap = (a: DiffRegion, b: DiffRegion): number => {
    const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width));
    const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height));
    return Math.max(dx, dy);
  };

  const out = [...regions];
  let mergedAny = true;
  while (mergedAny) {
    mergedAny = false;
    outer: for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        if (gap(out[i], out[j]) <= distance) {
          const a = out[i];
          const b = out[j];
          const x0 = Math.min(a.x, b.x);
          const y0 = Math.min(a.y, b.y);
          const x1 = Math.max(a.x + a.width, b.x + b.width);
          const y1 = Math.max(a.y + a.height, b.y + b.height);
          const union: DiffRegion = {
            x: x0,
            y: y0,
            width: x1 - x0,
            height: y1 - y0,
            diffPixels: a.diffPixels + b.diffPixels,
            diffPercent: 0, // recomputed below
          };
          out.splice(j, 1);
          out[i] = union;
          mergedAny = true;
          break outer;
        }
      }
    }
  }

  for (const r of out) {
    const area = r.width * r.height;
    r.diffPercent = area > 0 ? (r.diffPixels / area) * 100 : 0;
  }
  return out;
}
