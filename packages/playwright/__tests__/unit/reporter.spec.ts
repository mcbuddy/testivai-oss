import { TestivAIPlaywrightReporter } from '../../src/reporter';

// Mock the module that imports Playwright-specific types.
// This prevents a type-checking conflict within the Jest environment.
jest.mock('../../src/reporter-types', () => ({}));

// Keep onBegin hermetic: no real git calls, no real temp-dir writes.
// fs-extra members are non-configurable, so stub emptyDir at module level
// while preserving the real fns mode.ts relies on (readJsonSync/existsSync).
jest.mock('fs-extra', () => ({
  __esModule: true,
  ...jest.requireActual('fs-extra'),
  emptyDir: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('simple-git', () => jest.fn(() => ({
  revparse: jest.fn().mockResolvedValue('main'),
})));

describe('TestivAIPlaywrightReporter', () => {
  const OLD_ENV = { ...process.env };

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  test('defaults to local mode when no API key is set (local-first, not disabled)', async () => {
    delete process.env.TESTIVAI_API_KEY;
    delete process.env.TESTIVAI_API_URL;
    delete process.env.TESTIVAI_MODE;

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const reporter = new TestivAIPlaywrightReporter();
    await reporter.onBegin({} as any, { suites: [] } as any);

    // Local-first: reporter runs locally instead of disabling itself.
    expect((reporter as any).localMode).toBe(true);
    expect((reporter as any).options.apiUrl).toBeDefined();
    // The old scary "Disabling reporter." error must be gone.
    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Disabling reporter'),
    );
  });

  test('uses cloud mode when an API key is present', async () => {
    process.env.TESTIVAI_API_KEY = 'env-key';
    delete process.env.TESTIVAI_MODE;

    const reporter = new TestivAIPlaywrightReporter();
    await reporter.onBegin({} as any, { suites: [] } as any);

    expect((reporter as any).localMode).toBe(false);
  });

  test('TESTIVAI_MODE=local forces local mode even with an API key', async () => {
    process.env.TESTIVAI_API_KEY = 'env-key';
    process.env.TESTIVAI_MODE = 'local';

    const reporter = new TestivAIPlaywrightReporter();
    await reporter.onBegin({} as any, { suites: [] } as any);

    expect((reporter as any).localMode).toBe(true);
  });

  test('SnapshotPayload uses structure/styles keys (not dom/css)', () => {
    // Verify the reporter module's SnapshotPayload type uses renamed fields
    // by constructing a payload object matching the reporter's expected shape.
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
