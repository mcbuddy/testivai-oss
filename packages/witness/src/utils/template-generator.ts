import * as fs from 'fs';
import * as path from 'path';

export interface FileMapping {
  src: string;   // relative to templates dir (e.g. 'cypress/testivai-witness.js')
  dest: string;  // relative to cwd; use {{testDir}} as placeholder
}

export interface FrameworkConfig {
  key: string;
  label: string;
  language: string;
  testDirDefault: string;
  runCommand: string;
  files: FileMapping[];
  note?: string;
}

export const FRAMEWORKS: FrameworkConfig[] = [
  {
    key: 'cypress',
    label: 'Cypress',
    language: 'javascript',
    testDirDefault: 'cypress/e2e',
    runCommand: 'testivai run "cypress run --browser chrome"',
    files: [
      { src: 'cypress/testivai-witness.js', dest: 'cypress/support/testivai-witness.js' },
      { src: 'cypress/testivai-plugin.js',  dest: 'cypress/support/testivai-plugin.js' },
      { src: 'cypress/visual-example.cy.js', dest: 'cypress/e2e/visual-example.cy.js' },
    ],
  },
  {
    key: 'selenium-js',
    label: 'Selenium',
    language: 'javascript',
    testDirDefault: 'tests',
    runCommand: 'testivai run "npx jest tests/"',
    files: [
      { src: 'selenium-js/testivai-witness.js', dest: 'testivai-witness.js' },
      { src: 'selenium-js/visual-example.test.js', dest: '{{testDir}}/visual-example.test.js' },
    ],
  },
  {
    key: 'webdriverio',
    label: 'WebdriverIO',
    language: 'javascript',
    testDirDefault: 'test/specs',
    runCommand: 'testivai run "npx wdio run wdio.conf.js"',
    files: [
      { src: 'webdriverio/testivai-witness.js', dest: 'testivai-witness.js' },
      { src: 'webdriverio/visual-example.js', dest: 'test/specs/visual-example.js' },
    ],
    note: 'Add --remote-debugging-port=9222 to goog:chromeOptions.args in wdio.conf.js.',
  },
  {
    key: 'puppeteer',
    label: 'Puppeteer',
    language: 'javascript',
    testDirDefault: 'tests',
    runCommand: 'testivai run "npx jest tests/"',
    files: [
      { src: 'puppeteer/testivai-witness.js', dest: 'testivai-witness.js' },
      { src: 'puppeteer/visual-example.test.js', dest: '{{testDir}}/visual-example.test.js' },
    ],
  },
  {
    key: 'selenium-pytest',
    label: 'Selenium (pytest)',
    language: 'python',
    testDirDefault: 'tests',
    runCommand: 'testivai run "pytest tests/ -v"',
    files: [
      { src: 'selenium-pytest/testivai_witness.py', dest: 'testivai_witness.py' },
      { src: 'selenium-pytest/test_visual_example.py', dest: '{{testDir}}/test_visual_example.py' },
    ],
  },
  {
    key: 'selenium-unittest',
    label: 'Selenium (unittest)',
    language: 'python',
    testDirDefault: 'tests',
    runCommand: 'testivai run "python -m unittest discover tests/"',
    files: [
      { src: 'selenium-unittest/testivai_witness.py', dest: 'testivai_witness.py' },
      { src: 'selenium-unittest/test_visual_example.py', dest: '{{testDir}}/test_visual_example.py' },
    ],
  },
  {
    key: 'robot-framework',
    label: 'Robot Framework',
    language: 'python',
    testDirDefault: 'tests',
    runCommand: 'testivai run "robot tests/"',
    files: [
      { src: 'robot-framework/testivai_witness.py', dest: 'testivai_witness.py' },
      { src: 'robot-framework/testivai_keywords.robot', dest: 'testivai_keywords.robot' },
      { src: 'robot-framework/visual_example.robot', dest: '{{testDir}}/visual_example.robot' },
    ],
  },
  {
    key: 'selenium-junit',
    label: 'Selenium (JUnit 5)',
    language: 'java',
    testDirDefault: 'src/test/java',
    runCommand: 'testivai run "mvn test"',
    files: [
      { src: 'selenium-junit/TestivAIWitness.java', dest: 'src/test/java/testivai/TestivAIWitness.java' },
      { src: 'selenium-junit/VisualExampleTest.java', dest: 'src/test/java/testivai/VisualExampleTest.java' },
    ],
  },
  {
    key: 'selenium-testng',
    label: 'Selenium (TestNG)',
    language: 'java',
    testDirDefault: 'src/test/java',
    runCommand: 'testivai run "mvn test"',
    files: [
      { src: 'selenium-testng/TestivAIWitness.java', dest: 'src/test/java/testivai/TestivAIWitness.java' },
      { src: 'selenium-testng/VisualExampleTest.java', dest: 'src/test/java/testivai/VisualExampleTest.java' },
    ],
  },
  {
    key: 'rspec-capybara',
    label: 'RSpec + Capybara',
    language: 'ruby',
    testDirDefault: 'spec/features',
    runCommand: 'testivai run "bundle exec rspec"',
    files: [
      { src: 'rspec-capybara/testivai_witness.rb', dest: 'testivai_witness.rb' },
      { src: 'rspec-capybara/visual_example_spec.rb', dest: 'spec/features/visual_example_spec.rb' },
    ],
    note: 'Configure Capybara to use Chrome with --remote-debugging-port=9222 in spec/spec_helper.rb.',
  },
  {
    key: 'cucumber-capybara',
    label: 'Cucumber + Capybara',
    language: 'ruby',
    testDirDefault: 'features',
    runCommand: 'testivai run "bundle exec cucumber"',
    files: [
      { src: 'cucumber-capybara/testivai_witness.rb', dest: 'testivai_witness.rb' },
      { src: 'cucumber-capybara/testivai_steps.rb', dest: 'features/step_definitions/testivai_steps.rb' },
      { src: 'cucumber-capybara/visual_example.feature', dest: 'features/visual_example.feature' },
    ],
    note: 'Configure Capybara to use Chrome with --remote-debugging-port=9222 in features/support/env.rb.',
  },
];

export function getFrameworkConfig(key: string): FrameworkConfig | undefined {
  return FRAMEWORKS.find((f) => f.key === key);
}

export function getFrameworksByLanguage(language: string): FrameworkConfig[] {
  return FRAMEWORKS.filter((f) => f.language === language);
}

export interface GenerateOptions {
  frameworkKey: string;
  testDir: string;
  force: boolean;
  cwd?: string;
}

export interface GenerateResult {
  created: string[];
  skipped: string[];
}

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

export function generateTemplates(options: GenerateOptions): GenerateResult {
  const { frameworkKey, testDir, force, cwd = process.cwd() } = options;
  const config = getFrameworkConfig(frameworkKey);
  if (!config) throw new Error(`Unknown framework: ${frameworkKey}`);

  const created: string[] = [];
  const skipped: string[] = [];

  for (const mapping of config.files) {
    const destRelative = mapping.dest.replace('{{testDir}}', testDir);
    const srcPath = path.join(TEMPLATES_DIR, mapping.src);
    const destPath = path.join(cwd, destRelative);

    if (fs.existsSync(destPath) && !force) {
      skipped.push(destRelative);
      continue;
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    created.push(destRelative);
  }

  return { created, skipped };
}

const CONFIG_CONTENT = `/**
 * TestivAI Configuration
 * Generated by @testivai/witness
 */
import type { WitnessConfig } from '@testivai/witness';

const config: WitnessConfig = {
  // API key (set via TESTIVAI_API_KEY environment variable)
  // apiKey: 'your-api-key-here',

  // Project ID from TestivAI dashboard
  // projectId: 'your-project-id-here',

  // Chrome remote debugging port
  browserPort: 9222,

  // Auto-launch Chrome if not running (experimental)
  autoLaunch: false,
};

export default config;
`;

export function generateConfig(force: boolean, cwd: string = process.cwd()): { created: boolean } {
  const configPath = path.join(cwd, 'testivai.config.ts');
  if (fs.existsSync(configPath) && !force) {
    return { created: false };
  }
  fs.writeFileSync(configPath, CONFIG_CONTENT, 'utf-8');
  return { created: true };
}

const CYPRESS_CONFIG_CONTENT = `const { defineConfig } = require('cypress');
const testivaiPlugin = require('./cypress/support/testivai-plugin');

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      return testivaiPlugin(on, config);
    },
  },
});
`;

export function generateCypressConfig(force: boolean, cwd: string = process.cwd()): {
  exists: boolean;
  generated: boolean;
  existingFile?: string;
} {
  for (const file of ['cypress.config.js', 'cypress.config.ts']) {
    if (fs.existsSync(path.join(cwd, file))) {
      return { exists: true, generated: false, existingFile: file };
    }
  }

  const configPath = path.join(cwd, 'cypress.config.js');
  if (fs.existsSync(configPath) && !force) {
    return { exists: true, generated: false, existingFile: 'cypress.config.js' };
  }

  fs.writeFileSync(configPath, CYPRESS_CONFIG_CONTENT, 'utf-8');
  return { exists: false, generated: true };
}
