import { Command } from 'commander';
import chalk from 'chalk';
import { generateReport } from '../report/generator';
import { loadLocalConfig } from '../config/local-config';
import { logger } from '../utils/logger';
import { reportExitCode } from './exit-codes';

/**
 * `testivai report` — compare temp captures against baselines and write the
 * HTML report + results.json.
 *
 * This is the language-agnostic half of the adapter contract: any Playwright
 * binding (Python, Java, .NET, ...) captures by writing
 * `.testivai/temp/<name>/{screenshot.png, dom.html}` with its native APIs,
 * then shells out to this command for diffing, tolerances, the report, and
 * CI exit codes. The JS adapters call generateReport() in-process; this is
 * the same pipeline behind a CLI.
 *
 * Exit codes (a public contract, applied when the gate is on — `--fail-on-diff`
 * or config `failOnDiff`):
 *   0  pass      — nothing changed (and no new snapshots, unless --allow-new)
 *   1  changed   — at least one snapshot differs from its baseline
 *   2  new-only  — no changes, but new snapshots exist (no baseline yet).
 *                  Distinct from failures so first runs / added tests aren't
 *                  mistaken for regressions. Pass `--allow-new` to treat new
 *                  snapshots as passing (exit 0).
 * Without the gate, the command always exits 0 (report-only).
 */
export const reportCommand = new Command('report')
  .description(
    'Compare captured temp snapshots against baselines and generate the visual report. ' +
      'For non-JS adapters: write .testivai/temp/<name>/screenshot.png (+ dom.html), then run this.',
  )
  .option('--fail-on-diff', 'Exit non-zero on changes (1) / new-only (2); overrides config failOnDiff')
  .option('--allow-new', 'Treat new snapshots as passing (exit 0) — for first runs before baselines exist')
  .option('--json', 'Print the machine-readable results.json payload to stdout instead of the pretty summary')
  .option('--open', 'Open the HTML report in a browser (overrides config autoOpen)')
  .action(async (options: { failOnDiff?: boolean; allowNew?: boolean; json?: boolean; open?: boolean }) => {
    try {
      const projectRoot = process.cwd();
      const config = loadLocalConfig(projectRoot);

      const report = generateReport({
        projectRoot,
        reportDir: config.reportDir ?? 'visual-report',
        threshold: config.threshold,
        // Never pop a browser open while emitting machine output.
        autoOpen: options.json ? false : (options.open ?? config.autoOpen),
        // NOTE: `version` here is the results.json SCHEMA version (a public
        // contract), not the package version — conflating them shipped
        // results.json files labeled 1.3.1. Omitted → schema default.
      });

      const { summary } = report;

      // Exit-code contract (only enforced when the gate is on).
      const gate = options.failOnDiff ?? config.failOnDiff ?? false;
      const exitCode = reportExitCode(summary, { gate, allowNew: options.allowNew });

      if (options.json) {
        // `report` IS the results.json schema — emit it verbatim so agents get
        // one stable, parseable contract (summary + per-snapshot regions).
        process.stdout.write(JSON.stringify(report, null, 2) + '\n');
      } else {
        console.log();
        console.log(chalk.cyan.bold('  ═══ TestivAI Visual Report ═══'));
        console.log(
          `  Total: ${summary.total}  |  Passed: ${summary.passed}  |  Changed: ${summary.changed}  |  New: ${summary.newSnapshots}`,
        );
        if (summary.newSnapshots > 0) {
          console.log(chalk.gray('  New baselines: npx testivai approve --all   (then commit .testivai/baselines/)'));
        }
        if (summary.changed > 0) {
          console.log(
            chalk.gray(`  Review: ${config.reportDir ?? 'visual-report'}/index.html — approve with: npx testivai approve <name>`),
          );
        }
      }

      // exitCode is already 0 when the gate is off (report-only).
      process.exitCode = exitCode;
    } catch (error) {
      if (options.json) {
        process.stdout.write(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }) + '\n');
      } else {
        logger.error('Report generation failed:', error);
      }
      process.exit(1);
    }
  });
