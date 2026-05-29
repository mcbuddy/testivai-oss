/**
 * TestivAI Report — Compare all snapshots
 *
 * Diffs all temp captures against baselines using the Phase 1 diff engine.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import { diff as diffEngine } from '../diff';
import { domDiff } from '../diff/dom-diff';
import { BaselineStore } from '../baselines/store';
import { SnapshotDomSignal, SnapshotResult, SnapshotStatus } from './results';

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

    // DOM-level noise hint. Only meaningful when both sides captured DOM.
    // For 'passed' (pixel-identical) we skip the work — it's already the
    // strongest possible signal.
    if (result.status === 'changed') {
      const baselineDom = store.readDom(name);
      const candidateDom = store.readTempDom(name);
      const domSignal = computeDomSignal(baselineDom, candidateDom);
      if (domSignal) {
        result.dom = domSignal;
      }
    }

    results.push(result);
  }

  return results;
}

/**
 * Run DOM diff and turn it into a report-shaped signal.
 *
 * Returns null when DOM data isn't available on either side — we don't
 * want to confuse the user with "DOM unchanged" hints when the adapter
 * never captured DOM in the first place.
 */
function computeDomSignal(
  baselineDom: string | null,
  candidateDom: string | null,
): SnapshotDomSignal | null {
  if (!baselineDom || !candidateDom) return null;
  const result = domDiff(baselineDom, candidateDom);
  return {
    changed: result.domChanged,
    summary: result.summary,
    // The whole point: pixels differ, DOM does not → likely render noise.
    noiseHint: !result.domChanged,
  };
}

/**
 * Decode a PNG buffer to raw RGBA pixel data using pngjs.
 */
function decodePng(buffer: Buffer): { data: Buffer; width: number; height: number } {
  const png = PNG.sync.read(buffer);
  return { data: png.data, width: png.width, height: png.height };
}

/**
 * Encode raw RGBA pixel data back to a PNG buffer.
 */
function encodePng(data: Buffer, width: number, height: number): Buffer {
  const png = new PNG({ width, height });
  png.data = data;
  return PNG.sync.write(png);
}

/**
 * Compare two PNG buffers.
 *
 * Decodes both PNGs to raw RGBA, runs the pixel-level diff engine,
 * writes a valid diff PNG, and returns a SnapshotResult.
 */
function compareBuffers(
  baselineBuffer: Buffer,
  candidateBuffer: Buffer,
  name: string,
  snapshotImagesDir: string,
  threshold: number,
): SnapshotResult {
  // Quick byte-level comparison — identical files need no decoding
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

  try {
    // Decode PNG → raw RGBA so the diff engine gets real pixel data
    const baseline = decodePng(baselineBuffer);
    const candidate = decodePng(candidateBuffer);

    // Use baseline dimensions for the diff canvas; pad/crop candidate if needed
    const width = baseline.width;
    const height = baseline.height;
    const expectedLen = width * height * 4;

    const baseline8 = new Uint8ClampedArray(expectedLen);
    baseline8.set(new Uint8ClampedArray(baseline.data.buffer, baseline.data.byteOffset,
      Math.min(baseline.data.length, expectedLen)));

    const candidate8 = new Uint8ClampedArray(expectedLen);
    candidate8.set(new Uint8ClampedArray(candidate.data.buffer, candidate.data.byteOffset,
      Math.min(candidate.data.length, expectedLen)));

    const diffOutput = new Uint8ClampedArray(expectedLen);

    const diffResult = diffEngine(baseline8, candidate8, diffOutput, width, height, { threshold });

    // Encode the diff RGBA back to a valid PNG and write it
    const diffPngBuffer = encodePng(Buffer.from(diffOutput.buffer), width, height);
    const diffPath = path.join(snapshotImagesDir, 'diff.png');
    fs.writeFileSync(diffPath, diffPngBuffer);

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
  } catch (err) {
    // PNG decode failed (corrupt file, unexpected format) — report as changed
    // without a diff image so the user can investigate manually
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
