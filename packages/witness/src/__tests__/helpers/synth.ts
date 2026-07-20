/**
 * Synthetic image fixtures for comparison-engine tests.
 *
 * Everything is generated programmatically — no real screenshots, no
 * network, no timing. Deterministic by construction.
 */

import { PNG } from 'pngjs';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type RGBA = [number, number, number, number];

export const WHITE: RGBA = [255, 255, 255, 255];
export const BLACK: RGBA = [0, 0, 0, 255];
export const RED: RGBA = [255, 0, 0, 255];
export const BLUE: RGBA = [0, 0, 255, 255];

/** Create a raw RGBA buffer filled with a solid color. */
export function solidRgba(width: number, height: number, color: RGBA = WHITE): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = color[0];
    data[i * 4 + 1] = color[1];
    data[i * 4 + 2] = color[2];
    data[i * 4 + 3] = color[3];
  }
  return data;
}

/** Paint a filled rectangle into a raw RGBA buffer (clamped to bounds). */
export function paintRect(
  data: Uint8ClampedArray,
  imgWidth: number,
  imgHeight: number,
  rect: Rect,
  color: RGBA,
): void {
  const x0 = Math.max(0, rect.x);
  const y0 = Math.max(0, rect.y);
  const x1 = Math.min(imgWidth, rect.x + rect.width);
  const y1 = Math.min(imgHeight, rect.y + rect.height);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * imgWidth + x) * 4;
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = color[3];
    }
  }
}

/** Encode a raw RGBA buffer as a PNG file buffer. */
export function encodePng(data: Uint8ClampedArray, width: number, height: number): Buffer {
  const png = new PNG({ width, height });
  png.data = Buffer.from(data.buffer, data.byteOffset, data.length);
  return PNG.sync.write(png);
}

/** Convenience: solid PNG with optional painted rectangles. */
export function makePng(
  width: number,
  height: number,
  background: RGBA = WHITE,
  rects: Array<{ rect: Rect; color: RGBA }> = [],
): Buffer {
  const data = solidRgba(width, height, background);
  for (const { rect, color } of rects) {
    paintRect(data, width, height, rect, color);
  }
  return encodePng(data, width, height);
}
