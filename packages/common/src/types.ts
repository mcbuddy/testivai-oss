/**
 * Shared TypeScript types for TestivAI SDKs and CLI
 */

/**
 * TestivAI configuration options
 */
export interface TestivaiConfig {
  /** Base URL for visual tests (optional, can be overridden per test) */
  baseUrl?: string;
  /** Output directory for generated tests */
  outputDir?: string;
  /** Viewport settings */
  viewport?: {
    width: number;
    height: number;
  };
}

/**
 * API Key validation response from Core API
 */
export interface ApiKeyValidationResponse {
  valid: boolean;
  projectId?: string;
  projectName?: string;
  organizationId?: string;
  organizationName?: string;
  error?: string;
}

/**
 * Credentials stored locally
 */
export interface StoredCredentials {
  apiKey: string;
  validatedAt: string;
  projectId?: string;
  projectName?: string;
}

/**
 * Visual check result
 */
export interface VisualCheckResult {
  testRunId: string;
  status: 'passed' | 'failed' | 'new_baseline';
  hasDiff: boolean;
  diffUrl?: string;
  dashboardUrl?: string;
  pixelsChanged?: number;
  percentChanged?: number;
}

/**
 * Capture data sent to Core API
 */
export interface CaptureData {
  snapshotName?: string;
  name?: string;
  url: string;
  /**
   * Page structure data (raw HTML string)
   * @renamed Was `dom` — renamed to conceal internal layer terminology (IP protection)
   */
  structure?: string;
  html?: string;
  layout?: object;
  screenshot: Buffer;
  viewport: {
    width: number;
    height: number;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Unified Browser Performance metrics for both Playwright and Witness SDKs
 */
export interface BrowserPerformanceMetrics {
  /** Browser runtime metrics */
  cdp?: {
    Timestamp?: number;
    Documents?: number;
    Frames?: number;
    JSEventListeners?: number;
    Nodes?: number;
    LayoutCount?: number;
    RecalcStyleCount?: number;
    LayoutDuration?: number;
    RecalcStyleDuration?: number;
    ScriptDuration?: number;
    TaskDuration?: number;
    JSHeapUsedSize?: number;
    JSHeapTotalSize?: number;
  };
  /** Navigation timing and Web Vitals */
  timing?: {
    navigation?: {
      type: number;
      redirectCount: number;
    };
    timing?: {
      navigationStart: number;
      unloadEventStart: number;
      unloadEventEnd: number;
      redirectStart: number;
      redirectEnd: number;
      fetchStart: number;
      domainLookupStart: number;
      domainLookupEnd: number;
      connectStart: number;
      connectEnd: number;
      secureConnectionStart: number;
      requestStart: number;
      responseStart: number;
      responseEnd: number;
      domLoading: number;
      domInteractive: number;
      domContentLoadedEventStart: number;
      domContentLoadedEventEnd: number;
      domComplete: number;
      loadEventStart: number;
      loadEventEnd: number;
    };
    webVitals?: {
      firstContentfulPaint?: number;
      largestContentfulPaint?: number;
      cumulativeLayoutShift?: number;
      firstInputDelay?: number;
    };
  };
  /** Timestamp when metrics were captured */
  timestamp?: number;
}

/**
 * @deprecated Use BrowserPerformanceMetrics instead
 */
export type CDPerformanceMetrics = BrowserPerformanceMetrics;
