/**
 * TestivAI Report Generator
 */

export { generateReport } from './generator';
export type { GenerateReportOptions } from './generator';
export { compareAll } from './compare';
export type { CompareOptions } from './compare';
export { renderHtml } from './template';
export type {
  ReportData,
  ReportSummary,
  SnapshotResult,
  SnapshotStatus,
} from './results';
