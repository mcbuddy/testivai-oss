import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  FRAMEWORKS,
  getFrameworkConfig,
  getFrameworksByLanguage,
  generateTemplates,
  generateConfig,
  generateCypressConfig,
} from '../utils/template-generator';

// Helper: create a temp dir per test
function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-init-'));
}

// Helper: clean up temp dir
function removeTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('getFrameworkConfig', () => {
  it('returns config for a known framework', () => {
    const config = getFrameworkConfig('cypress');
    expect(config).toBeDefined();
    expect(config!.key).toBe('cypress');
    expect(config!.language).toBe('javascript');
  });

  it('returns undefined for an unknown framework', () => {
    expect(getFrameworkConfig('unknown-framework')).toBeUndefined();
  });
});

describe('getFrameworksByLanguage', () => {
  it('returns all javascript frameworks', () => {
    const result = getFrameworksByLanguage('javascript');
    expect(result.length).toBe(4);
    expect(result.map((f) => f.key)).toEqual(
      expect.arrayContaining(['cypress', 'selenium-js', 'webdriverio', 'puppeteer'])
    );
  });

  it('returns all python frameworks', () => {
    const result = getFrameworksByLanguage('python');
    expect(result.length).toBe(3);
    expect(result.map((f) => f.key)).toEqual(
      expect.arrayContaining(['selenium-pytest', 'selenium-unittest', 'robot-framework'])
    );
  });

  it('returns all java frameworks', () => {
    const result = getFrameworksByLanguage('java');
    expect(result.length).toBe(2);
    expect(result.map((f) => f.key)).toEqual(
      expect.arrayContaining(['selenium-junit', 'selenium-testng'])
    );
  });

  it('returns all ruby frameworks', () => {
    const result = getFrameworksByLanguage('ruby');
    expect(result.length).toBe(2);
    expect(result.map((f) => f.key)).toEqual(
      expect.arrayContaining(['rspec-capybara', 'cucumber-capybara'])
    );
  });
});

describe('FRAMEWORKS list', () => {
  it('has exactly 11 frameworks', () => {
    expect(FRAMEWORKS.length).toBe(11);
  });

  it('all frameworks have required fields', () => {
    for (const f of FRAMEWORKS) {
      expect(f.key).toBeTruthy();
      expect(f.label).toBeTruthy();
      expect(f.language).toBeTruthy();
      expect(f.testDirDefault).toBeTruthy();
      expect(f.runCommand).toBeTruthy();
      expect(Array.isArray(f.files)).toBe(true);
      expect(f.files.length).toBeGreaterThan(0);
    }
  });
});

describe('generateTemplates', () => {
  it('throws for unknown framework', () => {
    const tmpDir = makeTempDir();
    try {
      expect(() =>
        generateTemplates({ frameworkKey: 'not-a-framework', testDir: 'tests', force: false, cwd: tmpDir })
      ).toThrow('Unknown framework: not-a-framework');
    } finally {
      removeTempDir(tmpDir);
    }
  });

  it('creates cypress files in correct locations', () => {
    const tmpDir = makeTempDir();
    try {
      const result = generateTemplates({
        frameworkKey: 'cypress',
        testDir: 'cypress/e2e',
        force: false,
        cwd: tmpDir,
      });

      expect(result.created).toContain('cypress/support/testivai-witness.js');
      expect(result.created).toContain('cypress/support/testivai-plugin.js');
      expect(result.created).toContain('cypress/e2e/visual-example.cy.js');
      expect(result.skipped).toHaveLength(0);

      expect(fs.existsSync(path.join(tmpDir, 'cypress/support/testivai-witness.js'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'cypress/support/testivai-plugin.js'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'cypress/e2e/visual-example.cy.js'))).toBe(true);
    } finally {
      removeTempDir(tmpDir);
    }
  });

  it('substitutes {{testDir}} in destination paths', () => {
    const tmpDir = makeTempDir();
    try {
      const result = generateTemplates({
        frameworkKey: 'selenium-pytest',
        testDir: 'my_tests',
        force: false,
        cwd: tmpDir,
      });

      expect(result.created).toContain('my_tests/test_visual_example.py');
      expect(fs.existsSync(path.join(tmpDir, 'my_tests/test_visual_example.py'))).toBe(true);
    } finally {
      removeTempDir(tmpDir);
    }
  });

  it('skips existing files when force is false', () => {
    const tmpDir = makeTempDir();
    try {
      // First run: create files
      generateTemplates({ frameworkKey: 'puppeteer', testDir: 'tests', force: false, cwd: tmpDir });

      // Second run: should skip
      const result = generateTemplates({ frameworkKey: 'puppeteer', testDir: 'tests', force: false, cwd: tmpDir });
      expect(result.created).toHaveLength(0);
      expect(result.skipped.length).toBeGreaterThan(0);
    } finally {
      removeTempDir(tmpDir);
    }
  });

  it('overwrites existing files when force is true', () => {
    const tmpDir = makeTempDir();
    try {
      generateTemplates({ frameworkKey: 'puppeteer', testDir: 'tests', force: false, cwd: tmpDir });
      const result = generateTemplates({ frameworkKey: 'puppeteer', testDir: 'tests', force: true, cwd: tmpDir });
      expect(result.created.length).toBeGreaterThan(0);
      expect(result.skipped).toHaveLength(0);
    } finally {
      removeTempDir(tmpDir);
    }
  });

  it('creates robot-framework files including .robot files', () => {
    const tmpDir = makeTempDir();
    try {
      const result = generateTemplates({
        frameworkKey: 'robot-framework',
        testDir: 'tests',
        force: false,
        cwd: tmpDir,
      });

      expect(result.created).toContain('testivai_witness.py');
      expect(result.created).toContain('testivai_keywords.robot');
      expect(result.created).toContain('tests/visual_example.robot');
    } finally {
      removeTempDir(tmpDir);
    }
  });

  it('creates java files in correct package directory', () => {
    const tmpDir = makeTempDir();
    try {
      const result = generateTemplates({
        frameworkKey: 'selenium-junit',
        testDir: 'src/test/java',
        force: false,
        cwd: tmpDir,
      });

      expect(result.created).toContain('src/test/java/testivai/TestivAIWitness.java');
      expect(result.created).toContain('src/test/java/testivai/VisualExampleTest.java');
    } finally {
      removeTempDir(tmpDir);
    }
  });

  it('creates cucumber files including feature and step definitions', () => {
    const tmpDir = makeTempDir();
    try {
      const result = generateTemplates({
        frameworkKey: 'cucumber-capybara',
        testDir: 'features',
        force: false,
        cwd: tmpDir,
      });

      expect(result.created).toContain('testivai_witness.rb');
      expect(result.created).toContain('features/step_definitions/testivai_steps.rb');
      expect(result.created).toContain('features/visual_example.feature');
    } finally {
      removeTempDir(tmpDir);
    }
  });
});

describe('generateConfig', () => {
  it('creates testivai.config.ts when it does not exist', () => {
    const tmpDir = makeTempDir();
    try {
      const result = generateConfig(false, tmpDir);
      expect(result.created).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'testivai.config.ts'))).toBe(true);

      const content = fs.readFileSync(path.join(tmpDir, 'testivai.config.ts'), 'utf-8');
      expect(content).toContain('WitnessConfig');
      expect(content).toContain('browserPort: 9222');
    } finally {
      removeTempDir(tmpDir);
    }
  });

  it('skips creation when file exists and force is false', () => {
    const tmpDir = makeTempDir();
    try {
      generateConfig(false, tmpDir);
      const result = generateConfig(false, tmpDir);
      expect(result.created).toBe(false);
    } finally {
      removeTempDir(tmpDir);
    }
  });

  it('overwrites when force is true', () => {
    const tmpDir = makeTempDir();
    try {
      fs.writeFileSync(path.join(tmpDir, 'testivai.config.ts'), '// old content', 'utf-8');
      const result = generateConfig(true, tmpDir);
      expect(result.created).toBe(true);
      const content = fs.readFileSync(path.join(tmpDir, 'testivai.config.ts'), 'utf-8');
      expect(content).toContain('browserPort: 9222');
    } finally {
      removeTempDir(tmpDir);
    }
  });
});

describe('generateCypressConfig', () => {
  it('generates cypress.config.js when none exists', () => {
    const tmpDir = makeTempDir();
    try {
      const result = generateCypressConfig(false, tmpDir);
      expect(result.generated).toBe(true);
      expect(result.exists).toBe(false);
      expect(fs.existsSync(path.join(tmpDir, 'cypress.config.js'))).toBe(true);

      const content = fs.readFileSync(path.join(tmpDir, 'cypress.config.js'), 'utf-8');
      expect(content).toContain('testivaiPlugin');
      expect(content).toContain('setupNodeEvents');
    } finally {
      removeTempDir(tmpDir);
    }
  });

  it('detects existing cypress.config.js and does not overwrite', () => {
    const tmpDir = makeTempDir();
    try {
      fs.writeFileSync(path.join(tmpDir, 'cypress.config.js'), '// existing config', 'utf-8');
      const result = generateCypressConfig(false, tmpDir);
      expect(result.exists).toBe(true);
      expect(result.generated).toBe(false);
      expect(result.existingFile).toBe('cypress.config.js');
    } finally {
      removeTempDir(tmpDir);
    }
  });

  it('detects existing cypress.config.ts', () => {
    const tmpDir = makeTempDir();
    try {
      fs.writeFileSync(path.join(tmpDir, 'cypress.config.ts'), '// existing config', 'utf-8');
      const result = generateCypressConfig(false, tmpDir);
      expect(result.exists).toBe(true);
      expect(result.existingFile).toBe('cypress.config.ts');
    } finally {
      removeTempDir(tmpDir);
    }
  });
});
