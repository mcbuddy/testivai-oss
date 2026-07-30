/**
 * `testivai merge-captures <dirs...>`
 *
 * Unions captures produced by several sharded CI machines into this project's
 * `.testivai/temp/`, so a single `testivai report` can compare the whole suite
 * at once.
 *
 * WHY THIS EXISTS
 * ---------------
 * A shard only runs a slice of the suite. Comparing inside a shard therefore
 * reports every baseline the *other* shards own as missing coverage — measured
 * on a real 8-shard run, every shard exited 3 with roughly 90% of the suite
 * listed as missing, and produced 8 partial reports with no combined view.
 *
 * The fix is not to merge eight reports; it is to not produce them. Shards
 * capture (the reporter does this automatically when Playwright reports a
 * sharded run), CI collects the capture directories, this command unions them,
 * and `testivai report` compares once against the full set.
 *
 * Accepts either shape, because `actions/download-artifact` produces the
 * first and a manual copy tends to produce the second:
 *
 *   collected/temp-shard-1/<snapshot>/screenshot.png   ← parent of artifacts
 *   collected/<snapshot>/screenshot.png                ← a temp dir itself
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

/** A directory is a capture if it holds the file every capture must have. */
function isCaptureDir(dir: string): boolean {
  return fs.existsSync(path.join(dir, 'screenshot.png'));
}

function subdirs(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => path.join(dir, e.name));
  } catch {
    return [];
  }
}

export interface MergeResult {
  merged: string[];
  /** Snapshot names supplied by more than one source directory. */
  conflicts: string[];
  /** Inputs that contained no captures at all. */
  empty: string[];
}

/**
 * Collect capture directories from `sources` into `destTemp`.
 *
 * A shard that ran zero tests legitimately produces nothing, so an empty input
 * is reported rather than treated as an error. A snapshot arriving from two
 * sources IS suspicious — shards should partition the suite — so it is
 * surfaced; last write wins.
 */
export function mergeCaptures(sources: string[], destTemp: string): MergeResult {
  const seen = new Map<string, string>();
  const conflicts: string[] = [];
  const empty: string[] = [];

  fs.mkdirSync(destTemp, { recursive: true });

  for (const source of sources) {
    if (!fs.existsSync(source)) {
      empty.push(source);
      continue;
    }

    // Either the source is itself a capture dir's parent, or it is a parent of
    // artifact dirs which are in turn parents of capture dirs.
    let captureDirs = subdirs(source).filter(isCaptureDir);
    if (captureDirs.length === 0) {
      captureDirs = subdirs(source).flatMap((d) => subdirs(d).filter(isCaptureDir));
    }

    if (captureDirs.length === 0) {
      empty.push(source);
      continue;
    }

    for (const dir of captureDirs) {
      const name = path.basename(dir);
      const prior = seen.get(name);
      if (prior && prior !== dir) conflicts.push(name);
      seen.set(name, dir);
      fs.cpSync(dir, path.join(destTemp, name), { recursive: true });
    }
  }

  return { merged: [...seen.keys()].sort(), conflicts: [...new Set(conflicts)].sort(), empty };
}

export const mergeCapturesCommand = new Command('merge-captures')
  .description('Union sharded capture directories into .testivai/temp/ before running report')
  .argument('<dirs...>', 'directories holding captures (or parents of downloaded artifacts)')
  .option('--json', 'print a machine-readable result to stdout')
  .action((dirs: string[], options: { json?: boolean }) => {
    const destTemp = path.join(process.cwd(), '.testivai', 'temp');
    const result = mergeCaptures(dirs, destTemp);

    if (options.json) {
      process.stdout.write(JSON.stringify(result) + '\n');
      return;
    }

    console.log();
    console.log(chalk.green(`  ✓ merged ${result.merged.length} capture(s) into .testivai/temp/`));
    for (const name of result.merged) console.log(chalk.gray(`    ${name}`));

    if (result.empty.length > 0) {
      console.log();
      console.log(chalk.gray(`  ${result.empty.length} input(s) held no captures (a shard may have run no tests):`));
      for (const d of result.empty) console.log(chalk.gray(`    ${d}`));
    }

    if (result.conflicts.length > 0) {
      console.log();
      console.log(chalk.yellow('  ⚠ the same snapshot arrived from more than one source:'));
      for (const name of result.conflicts) console.log(chalk.yellow(`    ${name}`));
      console.log(chalk.gray('    Shards should partition the suite — check for an overlapping --shard split.'));
    }

    console.log();
    console.log(chalk.cyan('  Next: npx testivai report --fail-on-diff'));
    console.log();
  });
