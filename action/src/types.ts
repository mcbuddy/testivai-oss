/**
 * Types for TestivAI GitHub Action
 */

export interface SnapshotResult {
  id: string;
  name: string;
  status: 'passed' | 'changed' | 'new';
  diffPercentage?: number;
  baselinePath?: string;
  currentPath: string;
  diffPath?: string;
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
