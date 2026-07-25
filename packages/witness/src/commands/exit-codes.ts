/**
 * The `testivai report` exit-code contract (public, agent-facing).
 *
 *   0  pass      — no changes (and no new snapshots, or --allow-new)
 *   1  changed   — at least one snapshot differs from its baseline
 *   2  new-only  — no changes, but new snapshots exist (no baseline yet)
 *
 * Codes are only enforced when the gate is on (`--fail-on-diff` or config
 * `failOnDiff`); otherwise the command is report-only and exits 0.
 */
export interface ExitSummary {
  changed: number;
  newSnapshots: number;
}

export const EXIT_PASS = 0;
export const EXIT_CHANGED = 1;
export const EXIT_NEW_ONLY = 2;

export function reportExitCode(
  summary: ExitSummary,
  opts: { gate: boolean; allowNew?: boolean },
): number {
  if (!opts.gate) return EXIT_PASS;
  if (summary.changed > 0) return EXIT_CHANGED;
  if (summary.newSnapshots > 0 && !opts.allowNew) return EXIT_NEW_ONLY;
  return EXIT_PASS;
}
