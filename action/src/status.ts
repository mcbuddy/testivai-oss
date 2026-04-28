/**
 * GitHub commit status builder for TestivAI visual reports
 */

import { ResultsData } from './types';

export const STATUS_CONTEXT = 'TestivAI / visual';

export interface StatusConfig {
  failOnDiff: boolean;
}

/**
 * Determine commit status based on results and config
 */
export function determineStatus(results: ResultsData, config: StatusConfig): {
  state: 'success' | 'failure' | 'pending';
  description: string;
} {
  const { summary } = results;

  // No snapshots at all
  if (summary.total === 0) {
    return {
      state: 'success',
      description: 'No visual snapshots captured',
    };
  }

  // All passed
  if (summary.changed === 0 && summary.newSnapshots === 0) {
    return {
      state: 'success',
      description: `All ${summary.passed} snapshots passed`,
    };
  }

  // Has diffs or new snapshots
  if (summary.changed > 0) {
    if (config.failOnDiff) {
      return {
        state: 'failure',
        description: `${summary.changed} snapshot${summary.changed === 1 ? '' : 's'} changed`,
      };
    } else {
      return {
        state: 'success',
        description: `${summary.changed} changed, ${summary.newSnapshots} new (non-blocking)`,
      };
    }
  }

  // Only new snapshots (no changes)
  if (summary.newSnapshots > 0) {
    return {
      state: 'success',
      description: `${summary.newSnapshots} new snapshot${summary.newSnapshots === 1 ? '' : 's'} (needs approval)`,
    };
  }

  return {
    state: 'success',
    description: 'Visual regression check complete',
  };
}
