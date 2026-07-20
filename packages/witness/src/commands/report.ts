import { Command } from 'commander';
import chalk from 'chalk';
import { generateReport } from '../report/generator';
import { loadLocalConfig } from '../config/local-config';
import { logger } from '../utils/logger';

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
 */
export const reportCommand = new Command('report')
  .description(
    'Compare captured temp snapshots against baselines and generate the visual report. ' +
      'For non-JS adapters: write .testivai/temp/<name>/screenshot.png (+ dom.html), then run this.',
  )
  .option('--fail-on-diff', 'Exit non-zero when any snapshot is changed (overrides config failOnDiff)')
  .option('--open', 'Open the HTML report in a browser (overrides config autoOpen)')
  .action(async (options: { failOnDiff?: boolean; open?: boolean }) => {
    try {
      const projectRoot = process.cwd();
      const config = loadLocalConfig(projectRoot);

      const report = generateReport({
        projectRoot,
        reportDir: config.reportDir ?? 'visual-report',
        threshold: config.threshold,
        autoOpen: options.open ?? config.autoOpen,
        // NOTE: `version` here is the results.json SCHEMA version (a public
        // contract), not the package version — conflating them shipped
        // results.json files labeled 1.3.1. Omitted → schema default.

      });

      const { summary } = report;
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

      const failOnDiff = options.failOnDiff ?? config.failOnDiff;
      if (failOnDiff && summary.changed > 0) {
        process.exitCode = 1;
      }
    } catch (error) {
      logger.error('Report generation failed:', error);
      process.exit(1);
    }
  });
