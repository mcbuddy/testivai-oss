/**
 * Types for TestivAI GitHub Action
 *
 * Mirrors the shape of `results.json` produced by @testivai/witness'
 * generateReport(). Kept structurally compatible with older reports —
 * every field beyond {id?, name, status} is optional, so this Action
 * still parses results.json from earlier witness versions.
 *
 * Note: witness 1.x writes `diffPercent`; the Action accepts the older
 * `diffPercentage` spelling too for backward compatibility.
 */

export interface SnapshotDomSignal {
  /** True if the DOM differs structurally between baseline and candidate. */
  changed: boolean;
  /** Per-bucket counts; null when changed is false. */
  summary: { added: number; removed: number; attributeChanges: number } | null;
  /**
   * Pixel diff is non-zero but DOM is structurally unchanged — likely
   * render noise (anti-aliasing, font hinting, sub-pixel layout).
   */
  noiseHint: boolean;
}

export interface SnapshotResult {
  /** Optional in newer witness versions where the snapshot name is the key. */
  id?: string;
  name: string;
  status: 'passed' | 'changed' | 'new';
  /** witness 1.x and later. */
  diffPercent?: number;
  /** Older witness versions. Action accepts either spelling. */
  diffPercentage?: number;
  baselinePath?: string;
  /** Optional in newer witness versions for 'new' snapshots. */
  currentPath?: string;
  diffPath?: string;
  /** Present when the adapter captured DOM alongside the screenshot. */
  dom?: SnapshotDomSignal;
}

export interface Summary {
  total: number;
  passed: number;
  changed: number;
  newSnapshots: number;
}

export interface ResultsData {
  timestamp: number;
  summary: Summary;
  snapshots: SnapshotResult[];
}

