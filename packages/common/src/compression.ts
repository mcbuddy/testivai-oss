/**
 * Compression utilities for TestivAI SDKs
 * Handles gzip compression for upload optimization
 */

import * as zlib from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(zlib.gzip);

export interface CompressionOptions {
  compressUploads?: boolean;
  compressionLevel?: number;
  compressionThreshold?: number;
}

export interface CompressionResult {
  data: Buffer | string;
  headers?: Record<string, string>;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressionTime: number;
}

export class CompressionHelper {
  private options: Required<CompressionOptions>;

  constructor(options: CompressionOptions = {}) {
    this.options = {
      compressUploads: options.compressUploads !== false, // default: true
      compressionLevel: options.compressionLevel || 6,
      compressionThreshold: options.compressionThreshold || 5 * 1024 * 1024, // 5MB
    };
  }

  /**
   * Compress data if it meets the threshold
   */
  async compress(data: string): Promise<CompressionResult> {
    const originalSize = Buffer.byteLength(data);
    const startTime = Date.now();

    // Don't compress if disabled or below threshold
    if (!this.options.compressUploads || originalSize < this.options.compressionThreshold) {
      return {
        data,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 0,
        compressionTime: Date.now() - startTime,
      };
    }

    // Compress the data
    const compressedData = await gzipAsync(Buffer.from(data), { 
      level: this.options.compressionLevel 
    });
    
    const compressionTime = Date.now() - startTime;
    const compressionRatio = 1 - compressedData.length / originalSize;

    return {
      data: compressedData,
      headers: {
        'Content-Encoding': 'gzip',
        'Content-Type': 'application/json',
      },
      originalSize,
      compressedSize: compressedData.length,
      compressionRatio,
      compressionTime,
    };
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Log compression result
   */
  logCompressionResult(result: CompressionResult): void {
    if (result.compressionRatio > 0) {
      console.log(
        `Testivai Reporter: Compressed batch: ${this.formatBytes(result.originalSize)} → ` +
        `${this.formatBytes(result.compressedSize)} (${(result.compressionRatio * 100).toFixed(1)}% reduction, ${result.compressionTime}ms)`
      );
    }
  }
}

export const compressionHelper = new CompressionHelper();
