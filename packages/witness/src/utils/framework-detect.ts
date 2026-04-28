import * as fs from 'fs';
import * as path from 'path';
import { FrameworkDetection } from '../types';

/**
 * Framework detection utility
 */
export class FrameworkDetector {
  /**
   * Detect the testing framework in use
   */
  static detect(): FrameworkDetection {
    const cwd = process.cwd();
    const evidence: string[] = [];
    const configFiles: string[] = [];
    let framework: FrameworkDetection['framework'] = 'unknown';
    let confidence = 0;

    // Check for Cypress
    const cypressResult = this.detectCypress(cwd);
    if (cypressResult.detected) {
      framework = 'cypress';
      confidence = cypressResult.confidence;
      evidence.push(...cypressResult.evidence);
      configFiles.push(...cypressResult.configFiles);
    }

    // Check for WebdriverIO
    const wdioResult = this.detectWebdriverIO(cwd);
    if (wdioResult.detected && wdioResult.confidence > confidence) {
      framework = 'webdriverio';
      confidence = wdioResult.confidence;
      evidence.length = 0;
      configFiles.length = 0;
      evidence.push(...wdioResult.evidence);
      configFiles.push(...wdioResult.configFiles);
    }

    // Check for Selenium JS
    const seleniumJsResult = this.detectSeleniumJS(cwd);
    if (seleniumJsResult.detected && seleniumJsResult.confidence > confidence) {
      framework = 'selenium-js';
      confidence = seleniumJsResult.confidence;
      evidence.length = 0;
      configFiles.length = 0;
      evidence.push(...seleniumJsResult.evidence);
      configFiles.push(...seleniumJsResult.configFiles);
    }

    // Check for Selenium Python
    const seleniumPyResult = this.detectSeleniumPython(cwd);
    if (seleniumPyResult.detected && seleniumPyResult.confidence > confidence) {
      framework = 'selenium-python';
      confidence = seleniumPyResult.confidence;
      evidence.length = 0;
      configFiles.length = 0;
      evidence.push(...seleniumPyResult.evidence);
      configFiles.push(...seleniumPyResult.configFiles);
    }

    const instructions = this.generateInstructions(framework);

    return {
      framework,
      confidence,
      evidence,
      configFiles,
      instructions,
    };
  }

  /**
   * Detect Cypress
   */
  private static detectCypress(cwd: string) {
    const detected = false;
    const evidence: string[] = [];
    const configFiles: string[] = [];
    let confidence = 0;

    // Check for cypress.config.js/ts
    const cypressConfigFiles = ['cypress.config.js', 'cypress.config.ts'];
    for (const file of cypressConfigFiles) {
      if (fs.existsSync(path.join(cwd, file))) {
        configFiles.push(file);
        evidence.push(`Found ${file}`);
        confidence += 0.4;
      }
    }

    // Check for cypress folder
    if (fs.existsSync(path.join(cwd, 'cypress'))) {
      evidence.push('Found cypress/ directory');
      confidence += 0.3;
    }

    // Check package.json for cypress dependency
    const packageJsonPath = path.join(cwd, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.dependencies?.cypress || packageJson.devDependencies?.cypress) {
          evidence.push('Found cypress in package.json');
          confidence += 0.3;
        }
      } catch {
        // Ignore errors
      }
    }

    return { detected: confidence > 0, confidence, evidence, configFiles };
  }

  /**
   * Detect WebdriverIO
   */
  private static detectWebdriverIO(cwd: string) {
    const detected = false;
    const evidence: string[] = [];
    const configFiles: string[] = [];
    let confidence = 0;

    // Check for wdio.conf.js/ts
    const wdioConfigFiles = ['wdio.conf.js', 'wdio.conf.ts'];
    for (const file of wdioConfigFiles) {
      if (fs.existsSync(path.join(cwd, file))) {
        configFiles.push(file);
        evidence.push(`Found ${file}`);
        confidence += 0.5;
      }
    }

    // Check package.json for webdriverio dependency
    const packageJsonPath = path.join(cwd, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.dependencies?.webdriverio || packageJson.devDependencies?.webdriverio) {
          evidence.push('Found webdriverio in package.json');
          confidence += 0.5;
        }
      } catch {
        // Ignore errors
      }
    }

    return { detected: confidence > 0, confidence, evidence, configFiles };
  }

  /**
   * Detect Selenium JS
   */
  private static detectSeleniumJS(cwd: string) {
    const detected = false;
    const evidence: string[] = [];
    const configFiles: string[] = [];
    let confidence = 0;

    // Check package.json for selenium-webdriver dependency
    const packageJsonPath = path.join(cwd, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.dependencies?.['selenium-webdriver'] || 
            packageJson.devDependencies?.['selenium-webdriver']) {
          evidence.push('Found selenium-webdriver in package.json');
          confidence = 0.8;
        }
      } catch {
        // Ignore errors
      }
    }

    // Look for selenium usage in test files
    const testDirs = ['test', 'tests', 'spec', '__tests__'];
    for (const testDir of testDirs) {
      const dirPath = path.join(cwd, testDir);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          if (file.endsWith('.js') || file.endsWith('.ts')) {
            const filePath = path.join(dirPath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            if (content.includes('selenium-webdriver') || 
                content.includes('import { Builder }') ||
                content.includes('webdriver')) {
              evidence.push(`Found selenium usage in ${path.join(testDir, file)}`);
              confidence = Math.max(confidence, 0.6);
              break;
            }
          }
        }
      }
    }

    return { detected: confidence > 0, confidence, evidence, configFiles };
  }

  /**
   * Detect Selenium Python
   */
  private static detectSeleniumPython(cwd: string) {
    const detected = false;
    const evidence: string[] = [];
    const configFiles: string[] = [];
    let confidence = 0;

    // Check for requirements.txt or pyproject.toml
    const reqFiles = ['requirements.txt', 'pyproject.toml', 'Pipfile'];
    for (const file of reqFiles) {
      if (fs.existsSync(path.join(cwd, file))) {
        const content = fs.readFileSync(path.join(cwd, file), 'utf-8');
        if (content.includes('selenium')) {
          evidence.push(`Found selenium in ${file}`);
          confidence += 0.5;
          configFiles.push(file);
        }
      }
    }

    // Look for selenium usage in Python files
    const testDirs = ['test', 'tests', 'spec'];
    for (const testDir of testDirs) {
      const dirPath = path.join(cwd, testDir);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          if (file.endsWith('.py')) {
            const filePath = path.join(dirPath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            if (content.includes('from selenium import') || 
                content.includes('import selenium') ||
                content.includes('webdriver')) {
              evidence.push(`Found selenium usage in ${path.join(testDir, file)}`);
              confidence = Math.max(confidence, 0.7);
              break;
            }
          }
        }
      }
    }

    return { detected: confidence > 0, confidence, evidence, configFiles };
  }

  /**
   * Generate setup instructions for the detected framework
   */
  private static generateInstructions(framework: FrameworkDetection['framework']): string[] {
    switch (framework) {
      case 'cypress':
        return [
          '',
          'To use TestivAI with Cypress:',
          '',
          '1. Add this custom command to cypress/support/commands.js:',
          '',
          '  // testivai-witness.js',
          '  Cypress.Commands.add(\'witness\', (name) => {',
          '    return cy.window().invoke(\'testivaiWitness\', name);',
          '  });',
          '',
          '2. Use in your tests:',
          '',
          '  it(\'should capture visual snapshot\', () => {',
          '    cy.visit(\'/my-page\');',
          '    cy.witness(\'my-snapshot\');',
          '  });',
          '',
          '3. Run tests with:',
          '  testivai run "cypress run"',
          '',
        ];

      case 'webdriverio':
        return [
          '',
          'To use TestivAI with WebdriverIO:',
          '',
          '1. Add this custom command to your test setup:',
          '',
          '  // In wdio.conf.js or test setup',
          '  browser.addCommand(\'witness\', function(name) {',
          '    return this.executeScript(\'return window.testivaiWitness(arguments[0])\', name);',
          '  });',
          '',
          '2. Use in your tests:',
          '',
          '  it(\'should capture visual snapshot\', async () => {',
          '    await browser.url(\'/my-page\');',
          '    await browser.witness(\'my-snapshot\');',
          '  });',
          '',
          '3. Run tests with:',
          '  testivai run "npx wdio"',
          '',
        ];

      case 'selenium-js':
        return [
          '',
          'To use TestivAI with Selenium (JavaScript):',
          '',
          '1. In your tests, use execute_script:',
          '',
          '  const { Builder, By } = require(\'selenium-webdriver\');',
          '',
          '  async function captureSnapshot(driver, name) {',
          '    await driver.executeScript(`return window.testivaiWitness(\'${name}\')`);',
          '  }',
          '',
          '2. Use in your tests:',
          '',
          '  it(\'should capture visual snapshot\', async () => {',
          '    const driver = await new Builder().forBrowser(\'chrome\').build();',
          '    await driver.get(\'http://localhost:3000\');',
          '    await captureSnapshot(driver, \'my-snapshot\');',
          '  });',
          '',
          '3. Run tests with:',
          '  testivai run "npm test"',
          '',
        ];

      case 'selenium-python':
        return [
          '',
          'To use TestivAI with Selenium (Python):',
          '',
          '1. In your tests, use execute_script:',
          '',
          '  from selenium import webdriver',
          '',
          '  def capture_snapshot(driver, name):',
          '      driver.execute_script(f"return window.testivaiWitness(\'{name}\')")',
          '',
          '2. Use in your tests:',
          '',
          '  def test_visual_snapshot():',
          '      driver = webdriver.Chrome()',
          '      driver.get("http://localhost:3000")',
          '      capture_snapshot(driver, "my-snapshot")',
          '',
          '3. Run tests with:',
          '  testivai run "pytest tests/"',
          '',
        ];

      default:
        return [
          '',
          'No supported testing framework detected.',
          '',
          'To use TestivAI, you need to:',
          '',
          '1. Launch Chrome with remote debugging:',
          '   chrome --remote-debugging-port=9222',
          '',
          '2. In your test code, call:',
          '   window.testivaiWitness(\'snapshot-name\')',
          '',
          '3. Run your tests with:',
          '   testivai run "your-test-command"',
          '',
        ];
    }
  }
}
