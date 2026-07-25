import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import { BaselineStore } from '@testivai/witness/baselines';

/** Subset of the semver-governed results.json contract this server reads. */
export interface DomInfo {
  changed: boolean;
  noiseHint: boolean;
  summary: { added: number; removed: number; attributeChanges: number; textChanges?: number } | null;
}

export interface SnapshotResult {
  name: string;
  status: 'passed' | 'changed' | 'new';
  diffPercent?: number;
  baselinePath?: string;
  currentPath?: string;
  diffPath?: string;
  dom?: DomInfo;
}

export interface ResultsFile {
  version: string;
  timestamp: string;
  summary: { total: number; passed: number; changed: number; newSnapshots: number };
  snapshots: SnapshotResult[];
}

export interface ProjectPaths {
  root: string;
  reportDir: string;
}

/** Resolve the report dir from .testivai/config.json (reportDir key), default visual-report/. */
export function resolvePaths(root: string): ProjectPaths {
  let reportDir = 'visual-report';
  const configPath = path.join(root, '.testivai', 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (typeof config.reportDir === 'string' && config.reportDir.length > 0) {
        reportDir = config.reportDir;
      }
    } catch {
      // unreadable config falls back to the default report dir
    }
  }
  return { root, reportDir: path.join(root, reportDir) };
}

export function readResults(paths: ProjectPaths): ResultsFile | null {
  const file = path.join(paths.reportDir, 'results.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8')) as ResultsFile;
}

/** One-line, agent-oriented verdict for a snapshot. */
export function verdictFor(snapshot: SnapshotResult): string {
  if (snapshot.status === 'passed') return 'passed — no visual change';
  if (snapshot.status === 'new') return 'new snapshot — no baseline yet; a human should review and approve it';
  const pct = snapshot.diffPercent !== undefined ? `${snapshot.diffPercent.toFixed(2)}% pixels differ` : 'pixels differ';
  if (snapshot.dom?.noiseHint) {
    return `changed (${pct}) but DOM is structurally identical — likely render noise (font hinting, anti-aliasing); mention it, don't block`;
  }
  if (snapshot.dom?.changed) {
    const s = snapshot.dom.summary;
    const detail = s
      ? ` (${s.added} added, ${s.removed} removed, ${s.attributeChanges} attribute changes${s.textChanges ? `, ${s.textChanges} text changes` : ''})`
      : '';
    return `changed (${pct}) and the DOM changed${detail} — a real structural change; confirm it is intended before approving`;
  }
  return `changed (${pct}) — no DOM data; treat as needing human review`;
}

/** Resolve a report-relative image path safely inside the report dir. */
export function resolveImage(paths: ProjectPaths, relativePath: string): string | null {
  const abs = path.resolve(paths.reportDir, relativePath);
  if (!abs.startsWith(path.resolve(paths.reportDir) + path.sep)) return null; // no traversal
  return fs.existsSync(abs) ? abs : null;
}

/** Result of an approve operation — machine-readable for agents. */
export interface ApproveResult {
  approved: string[];
  failed: Array<{ name: string; error: string }>;
}

/**
 * Approve one snapshot: promote its current capture in `.testivai/temp/<name>/`
 * to the committed baseline. Reuses the same BaselineStore the CLI uses, so
 * semantics (and undo) match `testivai approve <name>` exactly.
 */
export function approveSnapshot(root: string, name: string): ApproveResult {
  const store = new BaselineStore(root);
  try {
    store.approve(name);
    return { approved: [name], failed: [] };
  } catch (e) {
    return { approved: [], failed: [{ name, error: e instanceof Error ? e.message : String(e) }] };
  }
}

/** Approve every pending snapshot under `.testivai/temp/` (like `approve --all`). */
export function approveAll(root: string): ApproveResult {
  const store = new BaselineStore(root);
  const approved: string[] = [];
  const failed: Array<{ name: string; error: string }> = [];
  for (const name of store.listTemp()) {
    try {
      store.approve(name);
      approved.push(name);
    } catch (e) {
      failed.push({ name, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { approved, failed };
}

export function listBaselines(root: string): string[] {
  const dir = path.join(root, '.testivai', 'baselines');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort();
}

/**
 * Downscale a PNG buffer using integer-stride nearest-neighbour sampling.
 * When the longest edge is <= maxEdge the original buffer is returned unchanged.
 *
 * @returns The (possibly) resized PNG buffer, output dimensions, and original dimensions.
 */
export function downscalePng(
  buffer: Buffer,
  maxEdge = 1024
): { data: Buffer; width: number; height: number; originalWidth: number; originalHeight: number } {
  const original = PNG.sync.read(buffer);
  const { width: ow, height: oh } = original;
  const longestEdge = Math.max(ow, oh);

  if (longestEdge <= maxEdge) {
    return { data: buffer, width: ow, height: oh, originalWidth: ow, originalHeight: oh };
  }

  const stride = Math.ceil(longestEdge / maxEdge);
  const w = Math.ceil(ow / stride);
  const h = Math.ceil(oh / stride);

  const out = new PNG({ width: w, height: h });

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcIdx = ((y * stride) * ow + (x * stride)) * 4;
      const dstIdx = (y * w + x) * 4;
      out.data[dstIdx] = original.data[srcIdx];
      out.data[dstIdx + 1] = original.data[srcIdx + 1];
      out.data[dstIdx + 2] = original.data[srcIdx + 2];
      out.data[dstIdx + 3] = original.data[srcIdx + 3];
    }
  }

  return { data: PNG.sync.write(out), width: w, height: h, originalWidth: ow, originalHeight: oh };
}
