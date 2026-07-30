/**
 * Capture-only resolution.
 *
 * This changes behaviour for existing users — a sharded run stops producing a
 * per-shard report — so the precedence is pinned down here. Measured on a real
 * 8-shard run, per-shard comparison exited 3 on every machine with ~90% of the
 * suite reported as missing, which is what auto-detection prevents.
 */

import { TestivAIPlaywrightReporter } from '../../reporter';
import type { FullConfig } from '../../reporter-types';

/** Minimal FullConfig — the reporter only reads `shard`. */
function config(shard: { current: number; total: number } | null): FullConfig {
  return { shard } as unknown as FullConfig;
}

/** Reach the private resolver without exporting it just for tests. */
function resolve(
  reporter: TestivAIPlaywrightReporter,
  cfg: FullConfig,
  shard: { current: number; total: number } | null,
): boolean {
  const r = reporter as unknown as {
    shard: typeof shard;
    resolveCaptureOnly(c: FullConfig): boolean;
  };
  r.shard = shard;
  return r.resolveCaptureOnly(cfg);
}

describe('capture-only resolution', () => {
  const saved = process.env.TESTIVAI_CAPTURE_ONLY;

  afterEach(() => {
    if (saved === undefined) delete process.env.TESTIVAI_CAPTURE_ONLY;
    else process.env.TESTIVAI_CAPTURE_ONLY = saved;
  });

  beforeEach(() => {
    delete process.env.TESTIVAI_CAPTURE_ONLY;
  });

  it('auto-enables for a sharded run', () => {
    const shard = { current: 3, total: 8 };
    expect(resolve(new TestivAIPlaywrightReporter(), config(shard), shard)).toBe(true);
  });

  it('stays off for an unsharded run — the zero-config path is unchanged', () => {
    expect(resolve(new TestivAIPlaywrightReporter(), config(null), null)).toBe(false);
  });

  it('stays off when a single shard covers the whole suite', () => {
    // `--shard=1/1` runs everything, so comparing locally is correct.
    const shard = { current: 1, total: 1 };
    expect(resolve(new TestivAIPlaywrightReporter(), config(shard), shard)).toBe(false);
  });

  it('honours an explicit true without sharding', () => {
    const r = new TestivAIPlaywrightReporter({ captureOnly: true });
    expect(resolve(r, config(null), null)).toBe(true);
  });

  it('lets an explicit false override shard auto-detection', () => {
    const shard = { current: 2, total: 8 };
    const r = new TestivAIPlaywrightReporter({ captureOnly: false });
    expect(resolve(r, config(shard), shard)).toBe(false);
  });

  it('reads TESTIVAI_CAPTURE_ONLY for CI that cannot edit playwright.config', () => {
    for (const on of ['1', 'true', 'TRUE', 'yes']) {
      process.env.TESTIVAI_CAPTURE_ONLY = on;
      expect(resolve(new TestivAIPlaywrightReporter(), config(null), null)).toBe(true);
    }
    for (const off of ['0', 'false', 'False']) {
      process.env.TESTIVAI_CAPTURE_ONLY = off;
      const shard = { current: 1, total: 4 };
      expect(resolve(new TestivAIPlaywrightReporter(), config(shard), shard)).toBe(false);
    }
  });

  it('prefers the explicit option over the environment variable', () => {
    process.env.TESTIVAI_CAPTURE_ONLY = '1';
    const r = new TestivAIPlaywrightReporter({ captureOnly: false });
    expect(resolve(r, config(null), null)).toBe(false);
  });

  it('ignores an empty environment variable', () => {
    process.env.TESTIVAI_CAPTURE_ONLY = '';
    expect(resolve(new TestivAIPlaywrightReporter(), config(null), null)).toBe(false);
  });
});
