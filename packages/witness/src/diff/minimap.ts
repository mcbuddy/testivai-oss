/**
 * TestivAI Diff Engine — Minimap overlay
 *
 * Applies a low-resolution overlay on the diff buffer to help
 * spot isolated pixel changes at a glance.
 *
 * Ported from pixel-buffer-diff by @p01, licensed under MIT.
 */

/**
 * Apply minimap overlay to the diff buffer.
 * Regions with any changed pixels get a colored tint.
 *
 * @param diff32     - Diff image as Uint32Array
 * @param miniMap    - Minimap cell hit counts
 * @param miniWidth  - Number of minimap columns
 * @param miniHeight - Number of minimap rows
 * @param width      - Full image width
 * @param height     - Full image height
 * @param scale      - Pixels per minimap cell (e.g. 128)
 * @param color      - 32-bit ABGR color to OR into diff pixels
 */
export function applyMinimap(
  diff32: Uint32Array,
  miniMap: Uint8ClampedArray,
  miniWidth: number,
  miniHeight: number,
  width: number,
  height: number,
  scale: number,
  color: number,
): void {
  for (let i = 0; i < miniWidth * miniHeight; i++) {
    if (miniMap[i] > 0) {
      const miniX = i % miniWidth;
      const miniY = (i / miniWidth) | 0;
      const x0 = miniX * scale;
      const x1 = Math.min(x0 + scale, width);
      const y0 = miniY * scale;
      const y1 = Math.min(y0 + scale, height);

      for (let y = y0; y < y1; y++) {
        let d32i = x0 + y * width;
        for (let x = x0; x < x1; x++) {
          diff32[d32i++] |= color;
        }
      }
    }
  }
}
