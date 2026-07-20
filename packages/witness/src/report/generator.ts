/**
 * TestivAI Report — Generator
 *
 * Orchestrator: compareAll → build ReportData → write results.json
 * → render HTML → optionally auto-open browser.
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { compareAll, CompareOptions, PassCriteria } from './compare';
import { ReportData, ReportSummary, SnapshotResult} from './results';
import { renderHtml } from './template';
import { loadLocalConfig } from '../config/local-config';

export interface GenerateReportOptions {
  projectRoot: string;
  /** Directory for report output. Default: 'visual-report' */
  reportDir?: string;
  /** Diff threshold (0-1). Default: 0.1 */
  threshold?: number;
  /** Auto-open browser after generating. Default: true */
  autoOpen?: boolean;
  /** SDK version string for the report header */
  version?: string;
  /**
   * Pass criteria overrides. When omitted, values are read from
   * `.testivai/config.json` (maxDiffPercent, maxDiffPixels, noiseAutoPass,
   * noiseMaxDiffPercent) so every adapter honors the project's tolerances
   * without extra wiring.
   */
  passCriteria?: PassCriteria;
}

/**
 * Generate a complete visual regression report.
 *
 * 1. Compare all temp screenshots against baselines
 * 2. Build ReportData with summary
 * 3. Write results.json (machine-readable)
 * 4. Render and write index.html
 * 5. Optionally open in browser
 *
 * @returns The report data
 */
/**
 * results.json schema version. 2.2.0 adds per-snapshot `regions[]`
 * (clustered diff bounding boxes), `masks[]` (applied masks with their
 * source — the audit trail), and `maskWarnings[]`. Additive over 2.1.0.
 */
export const RESULTS_SCHEMA_VERSION = '2.2.0';

/**
 * Write results.json for an already-computed set of snapshot results.
 * Exposed for callers that manage comparison and rendering separately.
 */
export function generateResults(
  results: SnapshotResult[],
  reportDir: string,
  version: string = RESULTS_SCHEMA_VERSION,
): void {
  const data = buildReportData(results, version);
  fs.writeFileSync(path.join(reportDir, 'results.json'), JSON.stringify(data, null, 2));
}

export function generateReport(options: GenerateReportOptions): ReportData {
  const {
    projectRoot,
    reportDir: reportDirRelative = 'visual-report',
    threshold = 0.1,
    autoOpen = true,
    version = RESULTS_SCHEMA_VERSION,
  } = options;

  const reportDir = path.isAbsolute(reportDirRelative)
    ? reportDirRelative
    : path.join(projectRoot, reportDirRelative);

  // Ensure report directory exists
  fs.mkdirSync(reportDir, { recursive: true });

  // 1. Compare all snapshots. Pass criteria default to the project's
  // .testivai/config.json so tolerances follow the config file everywhere.
  const localConfig = loadLocalConfig(projectRoot);
  const passCriteria: PassCriteria = options.passCriteria ?? {
    maxDiffPercent: localConfig.maxDiffPercent,
    maxDiffPixels: localConfig.maxDiffPixels,
    noiseAutoPass: localConfig.noiseAutoPass,
    noiseMaxDiffPercent: localConfig.noiseMaxDiffPercent,
  };
  const compareOptions: CompareOptions = {
    projectRoot,
    reportDir,
    threshold,
    passCriteria,
    mask: localConfig.mask,
    diffRegions: localConfig.diffRegions,
  };
  const snapshots = compareAll(compareOptions);

  // 2-3. Build summary + report data
  const reportData = buildReportData(snapshots, version);

  // 4. Write results.json
  const resultsPath = path.join(reportDir, 'results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(reportData, null, 2));

  // 5. Render and write HTML
  const html = renderHtml(reportData);
  const htmlPath = path.join(reportDir, 'index.html');
  fs.writeFileSync(htmlPath, html);

  // 6. Auto-open browser
  if (autoOpen) {
    openInBrowser(htmlPath);
  }

  return reportData;
}

/** Assemble the ReportData envelope for a set of snapshot results. */
function buildReportData(snapshots: SnapshotResult[], version: string): ReportData {
  const summary: ReportSummary = {
    total: snapshots.length,
    passed: snapshots.filter((s) => s.status === 'passed').length,
    changed: snapshots.filter((s) => s.status === 'changed').length,
    newSnapshots: snapshots.filter((s) => s.status === 'new').length,
  };
  return {
    version,
    timestamp: new Date().toISOString(),
    summary,
    snapshots,
  };
}

/**
 * Open a file in the default browser.
 * Best-effort — does not throw on failure.
 */
function openInBrowser(filePath: string): void {
  const url = `file://${filePath}`;
  const platform = process.platform;

  let cmd: string;
  if (platform === 'darwin') {
    cmd = `open "${url}"`;
  } else if (platform === 'win32') {
    cmd = `start "" "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }

  exec(cmd, (err) => {
    if (err) {
      // Silently ignore — CI environments won't have a browser
    }
  });
}
