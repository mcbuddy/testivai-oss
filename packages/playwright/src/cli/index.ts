#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createConfigFile } from './init';

const program = new Command();

// Display banner
const showBanner = () => {
  console.log();
  console.log(chalk.cyan.bold('  TestivAI'));
  console.log(chalk.gray('  Catch Visual Bugs Automatically'));
  console.log(chalk.gray('  AI that catches real bugs, ignores the noise.'));
  console.log();
};

program
  .name('testivai')
  .description('TestivAI Playwright SDK CLI')
  .version(require('../../package.json').version)
  .hook('preAction', () => {
    if (!process.argv.includes('--quiet') && !process.argv.includes('-q')) {
      showBanner();
    }
  });

// Global options
program
  .option('-q, --quiet', 'Suppress banner output (ideal for CI)');

program
  .command('init')
  .description('Initialize TestivAI configuration file')
  .action(async () => {
    try {
      await createConfigFile();
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
