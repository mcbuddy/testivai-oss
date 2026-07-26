import {
  reportExitCode,
  EXIT_PASS,
  EXIT_CHANGED,
  EXIT_NEW_ONLY,
} from '../../commands/exit-codes';

describe('reportExitCode contract', () => {
  it('returns 0 when the gate is off, regardless of results', () => {
    expect(reportExitCode({ changed: 5, newSnapshots: 3 }, { gate: false })).toBe(EXIT_PASS);
  });

  it('returns 0 (pass) when gated and nothing changed or new', () => {
    expect(reportExitCode({ changed: 0, newSnapshots: 0 }, { gate: true })).toBe(EXIT_PASS);
  });

  it('returns 1 (changed) when gated and a snapshot changed', () => {
    expect(reportExitCode({ changed: 1, newSnapshots: 0 }, { gate: true })).toBe(EXIT_CHANGED);
  });

  it('changed takes precedence over new (1, not 2)', () => {
    expect(reportExitCode({ changed: 2, newSnapshots: 4 }, { gate: true })).toBe(EXIT_CHANGED);
  });

  it('returns 2 (new-only) when gated with new snapshots and no changes', () => {
    expect(reportExitCode({ changed: 0, newSnapshots: 3 }, { gate: true })).toBe(EXIT_NEW_ONLY);
  });

  it('--allow-new demotes new-only to 0', () => {
    expect(reportExitCode({ changed: 0, newSnapshots: 3 }, { gate: true, allowNew: true })).toBe(EXIT_PASS);
  });

  it('--allow-new does not mask real changes', () => {
    expect(reportExitCode({ changed: 1, newSnapshots: 3 }, { gate: true, allowNew: true })).toBe(EXIT_CHANGED);
  });
});

describe('reportExitCode — missing-baselines gate (exit 3)', () => {
  const { EXIT_MISSING_ONLY } = require('../../commands/exit-codes');

  it('returns 3 when failOnMissing and baselines are missing (no changes)', () => {
    expect(reportExitCode({ changed: 0, newSnapshots: 0, missing: 2 }, { gate: false, failOnMissing: true })).toBe(EXIT_MISSING_ONLY);
  });

  it('changed takes precedence over missing (1, not 3)', () => {
    expect(reportExitCode({ changed: 1, newSnapshots: 0, missing: 2 }, { gate: true, failOnMissing: true })).toBe(EXIT_CHANGED);
  });

  it('missing takes precedence over new (3, not 2)', () => {
    expect(reportExitCode({ changed: 0, newSnapshots: 1, missing: 2 }, { gate: true, failOnMissing: true })).toBe(EXIT_MISSING_ONLY);
  });

  it('missing does NOT gate without failOnMissing (filtered runs stay green)', () => {
    expect(reportExitCode({ changed: 0, newSnapshots: 0, missing: 5 }, { gate: true })).toBe(EXIT_PASS);
  });

  it('failOnMissing alone works without --fail-on-diff', () => {
    expect(reportExitCode({ changed: 0, newSnapshots: 0, missing: 1 }, { gate: false, failOnMissing: true })).toBe(EXIT_MISSING_ONLY);
  });
});
