/**
 * Tests for compression utilities
 */

import { CompressionHelper } from '../compression';

describe('CompressionHelper', () => {
  let compressionHelper: CompressionHelper;

  beforeEach(() => {
    compressionHelper = new CompressionHelper();
  });

  describe('compress', () => {
    it('should not compress small data below threshold', async () => {
      const smallData = JSON.stringify({ test: 'small data' });
      const result = await compressionHelper.compress(smallData);

      expect(result.compressionRatio).toBe(0);
      expect(result.originalSize).toBe(result.compressedSize);
      expect(typeof result.data).toBe('string');
      expect(result.headers).toBeUndefined();
    });

    it('should compress large data above threshold', async () => {
      // Create data larger than 5MB threshold (using smaller threshold for test)
      const testHelper = new CompressionHelper({ compressionThreshold: 100 });
      const largeData = 'x'.repeat(1000);
      const result = await testHelper.compress(largeData);

      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.compressedSize).toBeLessThan(result.originalSize);
      expect(Buffer.isBuffer(result.data)).toBe(true);
      expect(result.headers).toEqual({
        'Content-Encoding': 'gzip',
        'Content-Type': 'application/json',
      });
    });

    it('should respect compression disabled option', async () => {
      const testHelper = new CompressionHelper({ compressUploads: false });
      const largeData = 'x'.repeat(1000);
      const result = await testHelper.compress(largeData);

      expect(result.compressionRatio).toBe(0);
      expect(result.originalSize).toBe(result.compressedSize);
    });

    it('should use custom compression level', async () => {
      const testHelper = new CompressionHelper({ 
        compressionThreshold: 100,
        compressionLevel: 9 // Maximum compression
      });
      const largeData = 'x'.repeat(1000);
      const result = await testHelper.compress(largeData);

      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.compressionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(compressionHelper.formatBytes(512)).toBe('512 B');
      expect(compressionHelper.formatBytes(1536)).toBe('1.5 KB');
      expect(compressionHelper.formatBytes(1048576)).toBe('1.0 MB');
    });
  });

  describe('logCompressionResult', () => {
    it('should log compression result when compressed', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const result = {
        data: Buffer.from('compressed'),
        originalSize: 1000,
        compressedSize: 100,
        compressionRatio: 0.9,
        compressionTime: 50,
      };

      compressionHelper.logCompressionResult(result);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Compressed batch: 1000 B → 100 B (90.0% reduction, 50ms)')
      );

      consoleSpy.mockRestore();
    });

    it('should not log when not compressed', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const result = {
        data: 'uncompressed',
        originalSize: 50,
        compressedSize: 50,
        compressionRatio: 0,
        compressionTime: 0,
      };

      compressionHelper.logCompressionResult(result);

      // Should not log when compression ratio is 0
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
