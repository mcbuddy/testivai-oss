import { Command } from 'commander';
import chalk from 'chalk';
import { BaselineStore } from '../baselines/store';
import { logger } from '../utils/logger';

export const approveCommand = new Command('approve')
  .description('Approve visual snapshots as new baselines')
  .argument('[name]', 'Snapshot name to approve (omit for interactive list)')
  .option('--all', 'Approve all changed/new snapshots')
  .option('--undo', 'Undo the last approval (restore previous baseline)')
  .action(async (name: string | undefined, options: { all?: boolean; undo?: boolean }) => {
    try {
      const cwd = process.cwd();
      const store = new BaselineStore(cwd);

      // ── Undo mode ─────────────────────────────────────────────────────────
      if (options.undo) {
        if (!name) {
          logger.error('Please specify a snapshot name to undo: testivai approve --undo <name>');
          process.exit(1);
        }
        try {
          store.undo(name);
          console.log(chalk.green(`  ✓ Restored previous baseline for "${name}"`));
          console.log(chalk.gray(`    git add .testivai/baselines/${name}/`));
        } catch (err: any) {
          logger.error(err.message);
          process.exit(1);
        }
        return;
      }

      // ── Approve all ─────────────────────────────────────────────────────────
      if (options.all) {
        const tempNames = store.listTemp();
        if (tempNames.length === 0) {
          console.log(chalk.yellow('  No temp snapshots found. Run your tests first.'));
          return;
        }

        let approved = 0;
        for (const snapName of tempNames) {
          try {
            store.approve(snapName);
            console.log(chalk.green(`  ✓ Approved: ${snapName}`));
            approved++;
          } catch (err: any) {
            logger.error(`  ✗ Failed to approve "${snapName}": ${err.message}`);
          }
        }

        console.log();
        console.log(chalk.cyan(`  ${approved}/${tempNames.length} snapshot(s) approved.`));
        console.log(chalk.gray('  git add .testivai/baselines/'));
        return;
      }

      // ── Approve specific name ─────────────────────────────────────────────
      if (name) {
        try {
          store.approve(name);
          console.log(chalk.green(`  ✓ Approved: ${name}`));
          console.log(chalk.gray(`    git add .testivai/baselines/${name}/`));
        } catch (err: any) {
          logger.error(err.message);
          process.exit(1);
        }
        return;
      }

      // ── No name, no --all: show available snapshots ─────────────────────────
      const tempNames = store.listTemp();
      if (tempNames.length === 0) {
        console.log(chalk.yellow('  No temp snapshots found. Run your tests first.'));
        return;
      }

      console.log(chalk.cyan('  Available snapshots to approve:\n'));
      for (const snapName of tempNames) {
        const isNew = !store.exists(snapName);
        const label = isNew ? chalk.yellow('[new]') : chalk.red('[changed]');
        console.log(`    ${label} ${snapName}`);
      }
      console.log();
      console.log(chalk.gray('  To approve:  testivai approve <name>'));
      console.log(chalk.gray('  To approve all: testivai approve --all'));

    } catch (error: any) {
      logger.error('Approve failed:', error);
      process.exit(1);
    }
  });
