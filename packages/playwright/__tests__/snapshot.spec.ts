import { test, expect } from '@playwright/test';
import * as fs from 'fs-extra';
import * as path from 'path';
import { testivai } from '../src';

const tempDir = path.join(process.cwd(), '.testivai', 'temp');

test.describe('testivai.witness()', () => {
  // Ensure the temp directory is clean before each test
  test.beforeEach(async () => {
    await fs.emptyDir(tempDir);
  });

  test.afterAll(async () => {
    await fs.emptyDir(tempDir);
  });

  test('should create all evidence files for a named snapshot', async ({ page }, testInfo) => {
    await page.setContent('<body><h1>Hello Snapshot!</h1></body>');
    await testivai.witness(page, testInfo, 'test-snapshot');

    const files = await fs.readdir(tempDir);
    expect(files).toHaveLength(3);

    const jsonFile = files.find(f => f.endsWith('.json'));
    const htmlFile = files.find(f => f.endsWith('.html'));
    const pngFile = files.find(f => f.endsWith('.png'));

    expect(jsonFile, 'JSON file should exist').toBeDefined();
    expect(htmlFile, 'HTML file should exist').toBeDefined();
    expect(pngFile, 'PNG file should exist').toBeDefined();

    // Verify JSON metadata content
    const metadata = await fs.readJson(path.join(tempDir, jsonFile!));
    expect(metadata.snapshotName).toBe('test-snapshot');
    expect(metadata.testName).toBe('should create all evidence files for a named snapshot');
    expect(metadata.layout.body).toBeDefined();
    expect(typeof metadata.layout.body.x).toBe('number');

    // Verify HTML content
    const htmlContent = await fs.readFile(path.join(tempDir, htmlFile!), 'utf-8');
    expect(htmlContent).toContain('<h1>Hello Snapshot!</h1>');
  });

  test('should generate a snapshot name from the URL if not provided', async ({ page }, testInfo) => {
    // Using a data URL is a reliable way to set a page URL in a test environment
    await page.goto('data:text/html,<h2>Page Title</h2>');
    await testivai.witness(page, testInfo);

    const files = await fs.readdir(tempDir);
    const jsonFile = files.find(f => f.endsWith('.json'));
    expect(jsonFile, 'JSON file should exist').toBeDefined();

    const metadata = await fs.readJson(path.join(tempDir, jsonFile!));
    // The default name for a data URL or empty path is 'snapshot'
    expect(metadata.snapshotName).toBe('snapshot');
  });
});
