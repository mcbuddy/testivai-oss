/**
 * Tests for status builder
 */

import { determineStatus, STATUS_CONTEXT } from '../status';
import { ResultsData } from '../types';

describe('STATUS_CONTEXT', () => {
  it('T6.7 - context is TestivAI / visual', () => {
    expect(STATUS_CONTEXT).toBe('TestivAI / visual');
  });
});

describe('determineStatus', () => {
  it('T6.8 - no diffs returns success', () => {
    const results: ResultsData = {
      timestamp: Date.now(),
      summary: { total: 3, passed: 3, changed: 0, newSnapshots: 0 },
      snapshots: [],
    };

    const status = determineStatus(results, { failOnDiff: false });
    expect(status.state).toBe('success');
    expect(status.description).toContain('All 3 snapshots passed');
  });

  it('T6.9 - diffs + failOnDiff=true returns failure', () => {
    const results: ResultsData = {
      timestamp: Date.now(),
      summary: { total: 3, passed: 1, changed: 2, newSnapshots: 0 },
      snapshots: [],
    };

    const status = determineStatus(results, { failOnDiff: true });
    expect(status.state).toBe('failure');
    expect(status.description).toContain('2 snapshots changed');
  });

  it('T6.10 - diffs + failOnDiff=false returns success', () => {
    const results: ResultsData = {
      timestamp: Date.now(),
      summary: { total: 3, passed: 1, changed: 1, newSnapshots: 1 },
      snapshots: [],
    };

    const status = determineStatus(results, { failOnDiff: false });
    expect(status.state).toBe('success');
    expect(status.description).toContain('non-blocking');
  });

  it('returns success for new snapshots only', () => {
    const results: ResultsData = {
      timestamp: Date.now(),
      summary: { total: 2, passed: 0, changed: 0, newSnapshots: 2 },
      snapshots: [],
    };

    const status = determineStatus(results, { failOnDiff: true });
    expect(status.state).toBe('success');
    expect(status.description).toContain('new');
  });

  it('handles empty results', () => {
    const results: ResultsData = {
      timestamp: Date.now(),
      summary: { total: 0, passed: 0, changed: 0, newSnapshots: 0 },
      snapshots: [],
    };

    const status = determineStatus(results, { failOnDiff: false });
    expect(status.state).toBe('success');
    expect(status.description).toContain('No visual snapshots');
  });
});
