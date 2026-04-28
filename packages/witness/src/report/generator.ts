/**
 * TestivAI Report — Generator
 *
 * Orchestrator: compareAll → build ReportData → write results.json
 * → render HTML → optionally auto-open browser.
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { compareAll, CompareOptions } from './compare';
import { ReportData, ReportSummary } from './results';
import { renderHtml } from './template';

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
export function generateReport(options: GenerateReportOptions): ReportData {
  const {
    projectRoot,
    reportDir: reportDirRelative = 'visual-report',
    threshold = 0.1,
    autoOpen = true,
    version = '2.0.0',
  } = options;

  const reportDir = path.isAbsolute(reportDirRelative)
    ? reportDirRelative
    : path.join(projectRoot, reportDirRelative);

  // Ensure report directory exists
  fs.mkdirSync(reportDir, { recursive: true });

  // 1. Compare all snapshots
  const compareOptions: CompareOptions = {
    projectRoot,
    reportDir,
    threshold,
  };
  const snapshots = compareAll(compareOptions);

  // 2. Build summary
  const summary: ReportSummary = {
    total: snapshots.length,
    passed: snapshots.filter((s) => s.status === 'passed').length,
    changed: snapshots.filter((s) => s.status === 'changed').length,
    newSnapshots: snapshots.filter((s) => s.status === 'new').length,
  };

  // 3. Build report data
  const reportData: ReportData = {
    version,
    timestamp: new Date().toISOString(),
    summary,
    snapshots,
  };

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
