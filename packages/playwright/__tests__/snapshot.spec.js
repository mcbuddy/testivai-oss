"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const src_1 = require("../src");
const tempDir = path.join(process.cwd(), '.testivai', 'temp');
test_1.test.describe('testivai.witness()', () => {
    // Ensure the temp directory is clean before each test
    test_1.test.beforeEach(async () => {
        await fs.emptyDir(tempDir);
    });
    test_1.test.afterAll(async () => {
        await fs.emptyDir(tempDir);
    });
    (0, test_1.test)('should create all evidence files for a named snapshot', async ({ page }, testInfo) => {
        await page.setContent('<body><h1>Hello Snapshot!</h1></body>');
        await src_1.testivai.witness(page, testInfo, 'test-snapshot');
        const files = await fs.readdir(tempDir);
        (0, test_1.expect)(files).toHaveLength(3);
        const jsonFile = files.find(f => f.endsWith('.json'));
        const htmlFile = files.find(f => f.endsWith('.html'));
        const pngFile = files.find(f => f.endsWith('.png'));
        (0, test_1.expect)(jsonFile, 'JSON file should exist').toBeDefined();
        (0, test_1.expect)(htmlFile, 'HTML file should exist').toBeDefined();
        (0, test_1.expect)(pngFile, 'PNG file should exist').toBeDefined();
        // Verify JSON metadata content
        const metadata = await fs.readJson(path.join(tempDir, jsonFile));
        (0, test_1.expect)(metadata.snapshotName).toBe('test-snapshot');
        (0, test_1.expect)(metadata.testName).toBe('should create all evidence files for a named snapshot');
        (0, test_1.expect)(metadata.layout.body).toBeDefined();
        (0, test_1.expect)(typeof metadata.layout.body.x).toBe('number');
        // Verify HTML content
        const htmlContent = await fs.readFile(path.join(tempDir, htmlFile), 'utf-8');
        (0, test_1.expect)(htmlContent).toContain('<h1>Hello Snapshot!</h1>');
    });
    (0, test_1.test)('should generate a snapshot name from the URL if not provided', async ({ page }, testInfo) => {
        // Using a data URL is a reliable way to set a page URL in a test environment
        await page.goto('data:text/html,<h2>Page Title</h2>');
        await src_1.testivai.witness(page, testInfo);
        const files = await fs.readdir(tempDir);
        const jsonFile = files.find(f => f.endsWith('.json'));
        (0, test_1.expect)(jsonFile, 'JSON file should exist').toBeDefined();
        const metadata = await fs.readJson(path.join(tempDir, jsonFile));
        // The default name for a data URL or empty path is 'snapshot'
        (0, test_1.expect)(metadata.snapshotName).toBe('snapshot');
    });
});
