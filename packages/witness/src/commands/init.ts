import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import inquirer from 'inquirer';
import { FrameworkDetector } from '../utils/framework-detect';
import { logger } from '../utils/logger';
import {
  generateTemplates,
  generateConfig,
  generateCypressConfig,
} from '../utils/template-generator';
import { createDefaultConfig } from '../config/local-config';

const LANGUAGE_CHOICES = [
  { name: 'JavaScript / TypeScript', value: 'javascript' },
  { name: 'Python',                  value: 'python' },
  { name: 'Java',                    value: 'java' },
  { name: 'Ruby',                    value: 'ruby' },
];

const FRAMEWORK_CHOICES: Record<string, { name: string; value: string }[]> = {
  javascript: [
    { name: 'Cypress',     value: 'cypress' },
    { name: 'Selenium',    value: 'selenium-js' },
    { name: 'WebdriverIO', value: 'webdriverio' },
    { name: 'Puppeteer',   value: 'puppeteer' },
  ],
  python: [
    { name: 'Selenium (pytest)',    value: 'selenium-pytest' },
    { name: 'Selenium (unittest)', value: 'selenium-unittest' },
    { name: 'Robot Framework',     value: 'robot-framework' },
  ],
  java: [
    { name: 'Selenium (JUnit 5)', value: 'selenium-junit' },
    { name: 'Selenium (TestNG)',  value: 'selenium-testng' },
  ],
  ruby: [
    { name: 'RSpec + Capybara',     value: 'rspec-capybara' },
    { name: 'Cucumber + Capybara',  value: 'cucumber-capybara' },
  ],
};

const TEST_DIR_DEFAULTS: Record<string, string> = {
  'cypress':           'cypress/e2e',
  'selenium-js':       'tests',
  'webdriverio':       'test/specs',
  'puppeteer':         'tests',
  'selenium-pytest':   'tests',
  'selenium-unittest': 'tests',
  'robot-framework':   'tests',
  'selenium-junit':    'src/test/java',
  'selenium-testng':   'src/test/java',
  'rspec-capybara':    'spec/features',
  'cucumber-capybara': 'features',
};

const NEXT_STEPS: Record<string, string[]> = {
  'cypress':           ['1. npx testivai auth <your-api-key>', "2. Add cy.witness('name') to your tests", '3. npx testivai run "cypress run --browser chrome"'],
  'selenium-js':       ['1. npx testivai auth <your-api-key>', "2. Use witness(driver, 'name') in your tests", '3. npx testivai run "npx jest tests/"'],
  'webdriverio':       ['1. npx testivai auth <your-api-key>', "2. Add browser.witness('name') to your tests", '3. npx testivai run "npx wdio run wdio.conf.js"'],
  'puppeteer':         ['1. npx testivai auth <your-api-key>', "2. Use witness(page, 'name') in your tests", '3. npx testivai run "npx jest tests/"'],
  'selenium-pytest':   ['1. npx testivai auth <your-api-key>', "2. Use witness(driver, 'name') in your tests", '3. npx testivai run "pytest tests/ -v"'],
  'selenium-unittest': ['1. npx testivai auth <your-api-key>', "2. Use witness(self.driver, 'name') in tests", '3. npx testivai run "python -m unittest discover tests/"'],
  'robot-framework':   ['1. npx testivai auth <your-api-key>', '2. Use the Witness keyword in your robot tests', '3. npx testivai run "robot tests/"'],
  'selenium-junit':    ['1. npx testivai auth <your-api-key>', '2. Use TestivAIWitness.witness(driver, "name")', '3. npx testivai run "mvn test"'],
  'selenium-testng':   ['1. npx testivai auth <your-api-key>', '2. Use TestivAIWitness.witness(driver, "name")', '3. npx testivai run "mvn test"'],
  'rspec-capybara':    ['1. npx testivai auth <your-api-key>', "2. Include TestivaiWitness and call witness('name')", '3. npx testivai run "bundle exec rspec"'],
  'cucumber-capybara': ['1. npx testivai auth <your-api-key>', '2. Use the "page looks correct" step in features', '3. npx testivai run "bundle exec cucumber"'],
};

function isPlaywrightProject(cwd: string): boolean {
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return !!(
      pkg.dependencies?.['@playwright/test'] ||
      pkg.devDependencies?.['@playwright/test'] ||
      pkg.dependencies?.playwright ||
      pkg.devDependencies?.playwright
    );
  } catch {
    return false;
  }
}

function printBox(lines: string[]): void {
  const width = Math.max(...lines.map((l) => l.length)) + 4;
  console.log(chalk.cyan('  ┌' + '─'.repeat(width) + '┐'));
  for (const line of lines) {
    const pad = ' '.repeat(width - line.length - 2);
    console.log(chalk.cyan('  │') + '  ' + line + pad + chalk.cyan('│'));
  }
  console.log(chalk.cyan('  └' + '─'.repeat(width) + '┘'));
}

export const initCommand = new Command('init')
  .description('Initialize TestivAI Witness SDK in your project')
  .option('-f, --force', 'Overwrite existing configuration files')
  .option('-y, --yes',   'Skip prompts and use auto-detected framework')
  .action(async (options) => {
    try {
      const cwd = process.cwd();

      // ── Auto-detect mode (--yes flag) ─────────────────────────────────────
      if (options.yes) {
        logger.info('Initializing TestivAI Witness SDK...');
        const detection = FrameworkDetector.detect();
        logger.info(`Detected framework: ${detection.framework}`);
        if (detection.confidence < 0.5) {
          logger.warn('Low confidence in framework detection');
        }
        generateConfig(options.force ?? false, cwd);
        console.log(chalk.cyan('\n=== Framework Setup Instructions ==='));
        detection.instructions.forEach((line) => console.log(line));
        console.log(chalk.cyan('\n=== General Setup ==='));
        console.log(`
1. Authenticate with your API key:
   ${chalk.yellow('testivai auth <your-api-key>')}

2. Run your tests:
   ${chalk.yellow('testivai run "your-test-command"')}

${chalk.gray('For more information, see: https://docs.testiv.ai')}
        `);
        logger.success('Initialization complete!');
        return;
      }

      // ── Playwright early-exit ──────────────────────────────────────────────
      if (isPlaywrightProject(cwd)) {
        console.log();
        console.log(chalk.yellow('⚠  Playwright detected in this project.'));
        console.log();
        console.log('For Playwright, use the dedicated SDK instead:');
        console.log(chalk.cyan('  npm install @testivai/witness-playwright'));
        console.log(chalk.gray('  Docs: https://testiv.ai/docs#playwright'));
        console.log();
        return;
      }

      // ── Interactive wizard ─────────────────────────────────────────────────
      console.log();
      console.log(chalk.cyan.bold('  ╔══════════════════════════════════════╗'));
      console.log(chalk.cyan.bold('  ║   TestivAI Visual Regression Setup   ║'));
      console.log(chalk.cyan.bold('  ╚══════════════════════════════════════╝'));
      console.log();

      // ── Mode selection ──────────────────────────────────────────────────
      const { mode } = await inquirer.prompt([
        {
          type: 'list',
          name: 'mode',
          message: 'Select mode:',
          choices: [
            { name: 'Local (free) — visual diffs on your machine, HTML reports', value: 'local' },
            { name: 'Cloud — AI-powered analysis, team dashboard, CI integration', value: 'cloud' },
          ],
        },
      ]);

      if (mode === 'local') {
        // Create .testivai/config.json and baselines directory
        const config = createDefaultConfig(cwd, { mode: 'local' });
        const baselinesDir = path.join(cwd, '.testivai', 'baselines');
        fs.mkdirSync(baselinesDir, { recursive: true });

        // Update .gitignore
        const gitignorePath = path.join(cwd, '.gitignore');
        const gitignoreEntries = [
          '\n# TestivAI local mode',
          '.testivai/temp/',
          'visual-report/',
        ];
        const gitignoreContent = gitignoreEntries.join('\n') + '\n';
        if (fs.existsSync(gitignorePath)) {
          const existing = fs.readFileSync(gitignorePath, 'utf-8');
          if (!existing.includes('.testivai/temp/')) {
            fs.appendFileSync(gitignorePath, gitignoreContent);
          }
        } else {
          fs.writeFileSync(gitignorePath, gitignoreContent);
        }

        console.log(chalk.green('  ✓ Created: .testivai/config.json'));
        console.log(chalk.green('  ✓ Created: .testivai/baselines/'));
        console.log(chalk.green('  ✓ Updated: .gitignore'));
        console.log();
        printBox([
          'Local mode setup complete! Next steps:',
          '',
          '1. Add visual snapshots in your tests',
          '2. Run: npx testivai run "<your-test-command>"',
          '3. Review the HTML report',
          '4. Approve: npx testivai approve --all',
          '',
          'Docs: https://testiv.ai/docs#local-mode',
        ]);
        console.log();
        return;
      }

      // ── Cloud mode: continue with existing flow ──────────────────────────

      const { language } = await inquirer.prompt([
        {
          type: 'list',
          name: 'language',
          message: 'Select your language:',
          choices: LANGUAGE_CHOICES,
        },
      ]);

      const { frameworkKey } = await inquirer.prompt([
        {
          type: 'list',
          name: 'frameworkKey',
          message: 'Select your test framework:',
          choices: FRAMEWORK_CHOICES[language as string],
        },
      ]);

      const defaultTestDir = TEST_DIR_DEFAULTS[frameworkKey as string] ?? 'tests';
      const { testDir } = await inquirer.prompt([
        {
          type: 'input',
          name: 'testDir',
          message: 'Where are your test files?',
          default: defaultTestDir,
        },
      ]);

      console.log();

      // ── Generate template files ────────────────────────────────────────────
      const { created, skipped } = generateTemplates({
        frameworkKey: frameworkKey as string,
        testDir: testDir as string,
        force: options.force ?? false,
        cwd,
      });

      const configResult = generateConfig(options.force ?? false, cwd);
      if (configResult.created) created.push('testivai.config.ts');

      // Cypress: handle cypress.config.js
      if (frameworkKey === 'cypress') {
        const cypressResult = generateCypressConfig(options.force ?? false, cwd);
        if (cypressResult.generated) {
          created.push('cypress.config.js');
        } else if (cypressResult.exists && cypressResult.existingFile) {
          console.log(chalk.yellow(`\n⚠  Existing ${cypressResult.existingFile} detected.`));
          console.log('  Add the TestivAI plugin to your setupNodeEvents:\n');
          console.log(chalk.gray("  const testivaiPlugin = require('./cypress/support/testivai-plugin');"));
          console.log(chalk.gray('  setupNodeEvents(on, config) {'));
          console.log(chalk.gray('    return testivaiPlugin(on, config);'));
          console.log(chalk.gray('  }\n'));
        }
      }

      for (const f of created) {
        console.log(chalk.green('  ✓ Created: ') + f);
      }
      for (const f of skipped) {
        console.log(chalk.yellow('  ⚠ Skipped (exists): ') + f);
      }

      // ── Completion box ─────────────────────────────────────────────────────
      const steps = NEXT_STEPS[frameworkKey as string] ?? [
        '1. npx testivai auth <your-api-key>',
        '2. Add witness calls to your tests',
        '3. npx testivai run "<your-test-command>"',
      ];

      console.log();
      printBox([
        'Setup complete! Next steps:',
        '',
        ...steps,
        '',
        `Docs: https://testiv.ai/docs#${(frameworkKey as string).split('-')[0]}`,
      ]);
      console.log();

    } catch (error: any) {
      if (error?.name === 'ExitPromptError') {
        console.log(chalk.gray('\n  Setup cancelled.'));
        return;
      }
      logger.error('Initialization failed:', error);
      process.exit(1);
    }
  });
