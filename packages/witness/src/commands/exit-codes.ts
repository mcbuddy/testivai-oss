/**
 * The `testivai report` exit-code contract (public, agent-facing).
 *
 *   0  pass         — no changes (and no new snapshots, or --allow-new)
 *   1  changed      — at least one snapshot differs from its baseline
 *   2  new-only     — no changes, but new snapshots exist (no baseline yet)
 *   3  missing-only — no changes, but baselines exist that received NO
 *                     capture this run (coverage loss: a deleted/renamed
 *                     test silently stopped guarding its page)
 *
 * Precedence: changed (1) > missing (3) > new (2).
 *
 * Codes 1/2 are enforced when the gate is on (`--fail-on-diff` or config
 * `failOnDiff`). Code 3 has its own gate, `failOnMissing`, which defaults to
 * TRUE — a baseline that receives no capture is silent coverage loss, so it
 * fails by default. Filtered runs (`--grep`) legitimately skip baselines:
 * opt out with `--allow-missing` or config `failOnMissing: false`.
 */
export interface ExitSummary {
  changed: number;
  newSnapshots: number;
  missing?: number;
}

export const EXIT_PASS = 0;
export const EXIT_CHANGED = 1;
export const EXIT_NEW_ONLY = 2;
export const EXIT_MISSING_ONLY = 3;

export function reportExitCode(
  summary: ExitSummary,
  opts: { gate: boolean; allowNew?: boolean; failOnMissing?: boolean },
): number {
  if (opts.gate && summary.changed > 0) return EXIT_CHANGED;
  if (opts.failOnMissing && (summary.missing ?? 0) > 0) return EXIT_MISSING_ONLY;
  if (opts.gate && summary.newSnapshots > 0 && !opts.allowNew) return EXIT_NEW_ONLY;
  return EXIT_PASS;
}
