/**
 * TestivAI Report — Compare all snapshots
 *
 * Diffs all temp captures against baselines using the Phase 1 diff engine.
 */

import * as fs from 'fs';
import * as path from 'path';
import { diff as diffEngine } from '../diff';
import { BaselineStore } from '../baselines/store';
import { SnapshotResult, SnapshotStatus } from './results';

export interface CompareOptions {
  threshold?: number;
  projectRoot: string;
  reportDir: string;
}

/**
 * Compare all temp screenshots against their baselines.
 *
 * @returns Array of SnapshotResult for each snapshot
 */
export function compareAll(options: CompareOptions): SnapshotResult[] {
  const { projectRoot, reportDir, threshold = 0.1 } = options;
  const store = new BaselineStore(projectRoot);
  const tempNames = store.listTemp();
  const results: SnapshotResult[] = [];

  const imagesDir = path.join(reportDir, 'images');

  for (const name of tempNames) {
    const snapshotImagesDir = path.join(imagesDir, name);
    fs.mkdirSync(snapshotImagesDir, { recursive: true });

    const tempBuffer = store.readTemp(name);
    if (!tempBuffer) continue;

    // Write current image to report
    const currentPath = path.join(snapshotImagesDir, 'current.png');
    fs.writeFileSync(currentPath, tempBuffer);

    if (!store.exists(name)) {
      // New snapshot — no baseline to compare against
      results.push({
        name,
        status: 'new',
        diffPercent: 0,
        diffCount: 0,
        totalPixels: 0,
        currentPath: `images/${name}/current.png`,
      });
      continue;
    }

    // Read baseline
    const baselineBuffer = store.read(name)!;
    const baselinePath = path.join(snapshotImagesDir, 'baseline.png');
    fs.writeFileSync(baselinePath, baselineBuffer);

    // Parse raw RGBA from PNG buffers
    // For now, we compare raw buffers directly. In a real implementation
    // we'd decode PNGs to RGBA pixel data. Since temp/baseline are raw
    // screenshots from the browser, we need to handle the PNG decoding.
    // For simplicity and zero-dep, we do a byte-level comparison first,
    // then fall back to diff engine for actual pixel data.
    const result = compareBuffers(
      baselineBuffer,
      tempBuffer,
      name,
      snapshotImagesDir,
      threshold,
    );

    results.push(result);
  }

  return results;
}

/**
 * Compare two PNG buffers.
 *
 * If buffers are identical bytes, returns passed immediately.
 * Otherwise attempts pixel-level diff using the diff engine.
 */
function compareBuffers(
  baselineBuffer: Buffer,
  candidateBuffer: Buffer,
  name: string,
  snapshotImagesDir: string,
  threshold: number,
): SnapshotResult {
  // Quick byte-level comparison
  if (baselineBuffer.equals(candidateBuffer)) {
    return {
      name,
      status: 'passed',
      diffPercent: 0,
      diffCount: 0,
      totalPixels: 0,
      baselinePath: `images/${name}/baseline.png`,
      currentPath: `images/${name}/current.png`,
    };
  }

  // Buffers differ — attempt pixel-level diff
  // We assume raw RGBA pixel data with known dimensions
  // In practice, we need to decode PNGs first. For now, treat as raw RGBA.
  // The actual PNG decoding will be added when fast-png is available.
  try {
    // Try to use as raw RGBA data
    // Calculate dimensions assuming square-ish aspect ratio
    const pixelCount = baselineBuffer.length / 4;
    const width = Math.ceil(Math.sqrt(pixelCount));
    const height = Math.ceil(pixelCount / width);
    const expectedLen = width * height * 4;

    // Pad buffers if needed
    const baseline8 = new Uint8ClampedArray(expectedLen);
    baseline8.set(new Uint8ClampedArray(baselineBuffer.buffer, baselineBuffer.byteOffset, Math.min(baselineBuffer.length, expectedLen)));
    const candidate8 = new Uint8ClampedArray(expectedLen);
    candidate8.set(new Uint8ClampedArray(candidateBuffer.buffer, candidateBuffer.byteOffset, Math.min(candidateBuffer.length, expectedLen)));
    const diffOutput = new Uint8ClampedArray(expectedLen);

    const diffResult = diffEngine(baseline8, candidate8, diffOutput, width, height, { threshold });

    // Write diff image (raw RGBA for now)
    const diffPath = path.join(snapshotImagesDir, 'diff.png');
    fs.writeFileSync(diffPath, Buffer.from(diffOutput.buffer));

    // We already know the raw bytes differ (byte-equal returns early above).
    // If the pixel diff still reports identical (sub-threshold), the images
    // are visually equivalent but binary-different — still flag as "changed"
    // so the user is aware.
    const status: SnapshotStatus = 'changed';
    const diffPercent = diffResult.diffPercent > 0 ? diffResult.diffPercent : 0.01;

    return {
      name,
      status,
      diffPercent,
      diffCount: diffResult.diffCount,
      totalPixels: diffResult.totalPixels,
      baselinePath: `images/${name}/baseline.png`,
      currentPath: `images/${name}/current.png`,
      diffPath: `images/${name}/diff.png`,
    };
  } catch {
    // If pixel diff fails (e.g., not raw RGBA), fall back to binary comparison
    return {
      name,
      status: 'changed',
      diffPercent: 100,
      diffCount: 0,
      totalPixels: 0,
      baselinePath: `images/${name}/baseline.png`,
      currentPath: `images/${name}/current.png`,
    };
  }
}
