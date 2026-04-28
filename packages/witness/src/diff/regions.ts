/**
 * TestivAI Diff Engine — Region bounding box detection
 *
 * Scans the diff output buffer for non-zero (changed) pixels
 * and groups them into rectangular bounding boxes using a simple
 * connected-component labeling approach.
 */

import { DiffRegion } from './types';

/**
 * Detect regions of change in the diff buffer.
 *
 * Scans for non-transparent pixels (any pixel with alpha > 0 in
 * the diff output), groups adjacent changed pixels into rectangular
 * bounding boxes, and filters out regions smaller than minSize.
 *
 * @param diff8   - Diff image pixel buffer (RGBA)
 * @param width   - Image width
 * @param height  - Image height
 * @param minSize - Minimum pixels to include a region (default: 10)
 * @returns Array of DiffRegion bounding boxes
 */
export function detectRegions(
  diff8: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  minSize: number = 10,
): DiffRegion[] {
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

  // Sort by position (top-left first)
  regions.sort((a, b) => a.y - b.y || a.x - b.x);

  return regions;
}
