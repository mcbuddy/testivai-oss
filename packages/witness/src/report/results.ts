/**
 * TestivAI Report — Result types
 *
 * Machine-readable output for the GitHub Action and other consumers.
 */

export type SnapshotStatus = 'passed' | 'changed' | 'new';

export interface SnapshotDomSignal {
  /** True if the DOM differs structurally between baseline and candidate. */
  changed: boolean;
  /** Per-bucket counts; null when changed is false. */
  summary: { added: number; removed: number; attributeChanges: number; textChanges?: number } | null;
  /**
   * Noise hint: pixel diff is non-zero but DOM is structurally unchanged
   * AND (when element maps exist) computed-style digests match. Suggests
   * render noise (anti-aliasing, font hinting, sub-pixel layout) rather
   * than a real visual regression.
   */
  noiseHint: boolean;
  /**
   * Style-fingerprint verdict: 'match' (digests equal — the hint is
   * trustworthy), 'mismatch' (styles changed with identical DOM — a REAL
   * change; the noise hint is suppressed), 'unavailable' (no element
   * maps — legacy DOM-only hint, labeled).
   */
  styleCheck?: 'match' | 'mismatch' | 'unavailable';
  /** Present on mismatch: how many elements changed styles, and which. */
  styleChanges?: { count: number; elements: string[] };
}

export interface SnapshotResult {
  name: string;
  status: SnapshotStatus;
  /** Diff percentage (0-100). 0 for passed/new. */
  diffPercent: number;
  /** Number of changed pixels */
  diffCount: number;
  /** Total pixels compared */
  totalPixels: number;
  /** Relative path to baseline image (if any) */
  baselinePath?: string;
  /** Relative path to current (candidate) image */
  currentPath?: string;
  /** Relative path to diff image (if any) */
  diffPath?: string;
  /**
   * DOM-level signal. Present only when both baseline and candidate
   * captured DOM HTML alongside the screenshot.
   */
  dom?: SnapshotDomSignal;
  /**
   * Changed-pixel clusters as bounding boxes (top-left sorted). Present
   * for 'changed' results (and auto-passed ones — the boxes stay useful).
   */
  regions?: import('../diff/attribution').AttributedRegion[];
  /**
   * Masks applied to this comparison (resolved to pixels, with their
   * source) — the audit trail for excluded areas. Present when non-empty.
   */
  masks?: import('../diff/mask').MaskRect[];
  /** Mask specs that could not be applied (e.g. selector without captured geometry). */
  maskWarnings?: string[];
  /**
   * Whole-page uniform displacement (the injected-banner signature):
   * everything at or below `belowY` moved by `dy` px. Derived from the
   * element maps — present only when both captures carried one.
   */
  pageShift?: import('../diff/attribution').PageShift;
  /**
   * Present when the snapshot's pixels differed but a pass criterion
   * reported it as passed: 'threshold' (within maxDiffPercent /
   * maxDiffPixels) or 'noise' (DOM identical + within noiseMaxDiffPercent,
   * with noiseAutoPass enabled). The diff image is still written.
   */
  autoPassed?: 'threshold' | 'noise';
  /**
   * ISO timestamp of when the compared baseline was last approved/added
   * (from the baseline's metadata.json). Provenance for reviewers: a
   * months-old baseline deserves a closer look than yesterday's.
   */
  baselineApprovedAt?: string;
}

export interface ReportSummary {
  total: number;
  passed: number;
  changed: number;
  newSnapshots: number;
  /**
   * Baselines that received NO capture this run (baseline exists, nothing to
   * compare). Coverage-loss signal: a deleted/renamed test silently stops
   * guarding its page. Present (possibly 0) from schema 2.3.0.
   */
  missing?: number;
}

export interface ReportData {
  version: string;
  timestamp: string;
  summary: ReportSummary;
  snapshots: SnapshotResult[];
  /** Names of baselines with no capture this run (schema 2.3.0+). */
  missingBaselines?: string[];
}
