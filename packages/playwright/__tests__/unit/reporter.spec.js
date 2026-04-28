"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reporter_1 = require("../../src/reporter");
// Mock the module that imports Playwright-specific types.
// This prevents a type-checking conflict within the Jest environment.
jest.mock('../../src/reporter-types', () => ({}));
describe('TestivAIPlaywrightReporter', () => {
    const OLD_ENV = { ...process.env };
    beforeEach(() => {
        jest.resetModules();
        process.env = { ...OLD_ENV };
    });
    afterAll(() => {
        process.env = OLD_ENV;
    });
    test('should initialize with API URL and key from environment variables', () => {
        process.env.TESTIVAI_API_URL = 'http://env.api';
        process.env.TESTIVAI_API_KEY = 'env-key';
        const reporter = new reporter_1.TestivAIPlaywrightReporter();
        // Accessing private options for testing purposes
        expect(reporter.options.apiUrl).toBe('http://env.api');
        expect(reporter.options.apiKey).toBe('env-key');
    });
    test('should be disabled if API URL is not provided', async () => {
        delete process.env.TESTIVAI_API_URL;
        delete process.env.TESTIVAI_API_KEY;
        const reporter = new reporter_1.TestivAIPlaywrightReporter();
        // onBegin should set the apiUrl to undefined, disabling the reporter.
        await reporter.onBegin({}, { suites: [] });
        expect(reporter.options.apiUrl).toBeUndefined();
    });
    test('should be disabled if API Key is not provided', async () => {
        delete process.env.TESTIVAI_API_KEY;
        process.env.TESTIVAI_API_URL = 'http://env.api';
        const reporter = new reporter_1.TestivAIPlaywrightReporter();
        // onBegin should set the apiUrl to undefined, disabling the reporter.
        await reporter.onBegin({}, { suites: [] });
        expect(reporter.options.apiUrl).toBeUndefined();
    });
});
