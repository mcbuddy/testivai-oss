#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { authCommand } from '../commands/auth';
import { initCommand } from '../commands/init';
import { runCommand } from '../commands/run';
import { witnessCommand } from '../commands/capture';
import { approveCommand } from '../commands/approve';

const packageJson = require('../../package.json');

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
  .description('TestivAI Witness SDK - Framework-agnostic visual regression testing')
  .version(packageJson.version, '-v, --version', 'Display version number')
  .hook('preAction', () => {
    if (!process.argv.includes('--quiet') && !process.argv.includes('-q')) {
      showBanner();
    }
  });

// Global options
program
  .option('-v, --verbose', 'Enable verbose output')
  .option('-q, --quiet', 'Suppress output (ideal for CI)')
  .option('--debug', 'Enable debug mode');

// Add commands
program.addCommand(authCommand);
program.addCommand(initCommand);
program.addCommand(runCommand);
program.addCommand(witnessCommand);
program.addCommand(approveCommand);

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
