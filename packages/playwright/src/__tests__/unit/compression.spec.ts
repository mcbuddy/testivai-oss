/**
 * Tests for Playwright SDK compression integration
 */

import { TestivAIPlaywrightReporter } from '../../reporter';
import { CompressionHelper } from '@testivai/common';

describe('Playwright Reporter Compression', () => {
  let reporter: TestivAIPlaywrightReporter;

  beforeEach(() => {
    reporter = new TestivAIPlaywrightReporter({
      apiKey: 'test-key',
      apiUrl: 'http://localhost:3000',
      compression: {
        compressUploads: true,
        compressionThreshold: 100, // Small threshold for testing
        compressionLevel: 6,
      },
    });
  });

  it('should initialize with compression helper', () => {
    expect(reporter).toBeDefined();
    // Access private property through type assertion for testing
    const helper = (reporter as any).compressionHelper;
    expect(helper).toBeInstanceOf(CompressionHelper);
  });

  it('should use custom compression options', () => {
    const customReporter = new TestivAIPlaywrightReporter({
      apiKey: 'test-key',
      compression: {
        compressUploads: false,
        compressionLevel: 9,
        compressionThreshold: 1000,
      },
    });

    const helper = (customReporter as any).compressionHelper;
    expect(helper).toBeInstanceOf(CompressionHelper);
  });

  it('should use default compression options when none provided', () => {
    const defaultReporter = new TestivAIPlaywrightReporter({
      apiKey: 'test-key',
    });

    const helper = (defaultReporter as any).compressionHelper;
    expect(helper).toBeInstanceOf(CompressionHelper);
  });
});
