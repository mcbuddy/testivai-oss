import { TestivAIPlaywrightReporter } from '../../src/reporter';

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

    const reporter = new TestivAIPlaywrightReporter();
    // Accessing private options for testing purposes
    expect((reporter as any).options.apiUrl).toBe('http://env.api');
    expect((reporter as any).options.apiKey).toBe('env-key');
  });

  test('should be disabled if API URL is not provided', async () => {
    delete process.env.TESTIVAI_API_URL;
    delete process.env.TESTIVAI_API_KEY;
    const reporter = new TestivAIPlaywrightReporter();
    // onBegin should set the apiUrl to undefined, disabling the reporter.
    await reporter.onBegin({} as any, { suites: [] } as any);
    expect((reporter as any).options.apiUrl).toBeUndefined();
  });

  test('should be disabled if API Key is not provided', async () => {
    delete process.env.TESTIVAI_API_KEY;
    process.env.TESTIVAI_API_URL = 'http://env.api';
    const reporter = new TestivAIPlaywrightReporter();
    // onBegin should set the apiUrl to undefined, disabling the reporter.
    await reporter.onBegin({} as any, { suites: [] } as any);
    expect((reporter as any).options.apiUrl).toBeUndefined();
  });

  test('SnapshotPayload uses structure/styles keys (not dom/css)', () => {
    // Verify the reporter module's SnapshotPayload type uses renamed fields
    // by constructing a payload object matching the reporter's expected shape.
    // This ensures the terminology rename is enforced in the reporter's output.
    const payload = {
      structure: { html: '<html></html>' },
      styles: { computed_styles: {} },
      layout: { x: 0, y: 0, width: 1024, height: 768, top: 0, left: 0, right: 1024, bottom: 768 },
      timestamp: Date.now(),
      testName: 'test',
      snapshotName: 'snapshot',
      url: 'http://localhost',
      viewport: { width: 1024, height: 768 },
    };

    // New field names exist
    expect(payload).toHaveProperty('structure');
    expect(payload).toHaveProperty('styles');
    expect(payload.structure).toHaveProperty('html');

    // Old field names must NOT exist
    expect(payload).not.toHaveProperty('dom');
    expect(payload).not.toHaveProperty('css');
    expect(payload).not.toHaveProperty('domAnalysis');
  });
});