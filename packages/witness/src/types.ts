/**
 * Types for TestivAI Witness SDK
 * Extends types from @testivai/common with browser-specific additions
 */

import { TestivaiConfig } from '@testivai/common';

/**
 * Witness SDK configuration extending the base TestivaiConfig
 */
export interface WitnessConfig extends TestivaiConfig {
  /** Browser remote debugging port */
  browserPort?: number;
  /** Project ID from TestivAI dashboard */
  projectId?: string;
  /** Auto-launch Chrome if not running */
  autoLaunch?: boolean;
  /** Chrome executable path (for auto-launch) */
  chromePath?: string;
  /** Additional Chrome launch arguments */
  chromeArgs?: string[];
  /** Timeout for browser connections (ms) */
  connectionTimeout?: number;
  /** Retry attempts for browser connection */
  connectionRetries?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Git information for batch context
 */
export interface GitInfo {
  /** Current branch name */
  branch: string;
  /** Current commit hash */
  commit: string;
  /** Repository URL (optional) */
  repository?: string;
  /** Commit message (optional) */
  message?: string;
  /** Author name (optional) */
  author?: string;
}

/**
 * Browser context information
 */
export interface BrowserInfo {
  /** Browser name (chromium, firefox, webkit) */
  name: string;
  /** Browser version */
  version: string;
  /** Viewport width */
  viewportWidth: number;
  /** Viewport height */
  viewportHeight: number;
  /** User agent string */
  userAgent: string;
  /** Operating system */
  os?: string;
  /** Device type (desktop, mobile, tablet) */
  device?: string;
}

/**
 * Page structure snapshot data (HTML content)
 * @renamed Was `DOMData` — renamed to conceal internal layer terminology (IP protection)
 */
export interface StructureData {
  /** Serialized HTML of the element */
  html: string;
  /** Computed styles (optional) */
  styles?: Record<string, string>;
}

/**
 * Layout/Bounding box data for an element
 */
export interface LayoutData {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Width */
  width: number;
  /** Height */
  height: number;
  /** Top position */
  top: number;
  /** Left position */
  left: number;
  /** Right position */
  right: number;
  /** Bottom position */
  bottom: number;
}

/**
 * Unified Performance metrics for both Playwright and Witness SDKs
 */
export interface BrowserPerformanceMetrics {
  /** Browser runtime metrics */
  runtime?: {
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
 * Performance timing metrics
 * @deprecated Use BrowserPerformanceMetrics instead
 */
export interface PerformanceTimings {
  /** Navigation start time */
  navigationStart?: number;
  /** DOM content loaded time */
  domContentLoaded?: number;
  /** Page load complete time */
  loadComplete?: number;
  /** First contentful paint */
  firstContentfulPaint?: number;
  /** Largest contentful paint */
  largestContentfulPaint?: number;
  /** Time to interactive */
  timeToInteractive?: number;
  /** Total blocking time */
  totalBlockingTime?: number;
  /** Cumulative layout shift */
  cumulativeLayoutShift?: number;
}

/**
 * Lighthouse performance results
 */
export interface LighthouseResults {
  /** Performance score (0-100) */
  performance?: number;
  /** Accessibility score (0-100) */
  accessibility?: number;
  /** Best practices score (0-100) */
  bestPractices?: number;
  /** SEO score (0-100) */
  seo?: number;
  /** Core Web Vitals */
  coreWebVitals?: {
    lcp?: number;
    fid?: number;
    cls?: number;
  };
}

/**
 * Snapshot payload for a single evidence capture
 */
export interface SnapshotPayload {
  /**
   * Page structure data (HTML content)
   * @renamed Was `dom` — renamed to conceal internal layer terminology (IP protection)
   */
  structure: StructureData;
  /**
   * Computed styles data (optional)
   * @renamed Was `css` — renamed to conceal internal layer terminology (IP protection)
   */
  styles?: { computed_styles: Record<string, Record<string, string>> };
  /** Layout/bounding box data */
  layout: LayoutData;
  /** Timestamp when snapshot was taken */
  timestamp: number;
  /** Test name or identifier */
  testName: string;
  /** Snapshot name or identifier */
  snapshotName: string;
  /** URL of the page when snapshot was taken */
  url?: string;
  /** Viewport dimensions */
  viewport?: { width: number; height: number };
  /** Screenshot data (base64) */
  screenshotData?: string;
  /** Performance metrics */
  performanceMetrics?: BrowserPerformanceMetrics;
}

/**
 * CI environment information for integration feedback (e.g., GitHub commit statuses, PR comments).
 * Mirrors CiInfo from ci.ts for payload serialization.
 */
export interface CiInfoPayload {
  /** CI provider name (e.g., 'github_actions', 'gitlab_ci', 'circleci') */
  provider: string;
  /** Pull/Merge request number (if available) */
  prNumber?: number;
  /** URL to the CI run (if available) */
  runUrl?: string;
  /** CI build/run identifier */
  buildId?: string;
}

/**
 * Batch payload containing all evidence for a test run
 */
export interface BatchPayload {
  /** Git information */
  git: GitInfo;
  /** Browser context information */
  browser: BrowserInfo;
  /** Collection of snapshots */
  snapshots: SnapshotPayload[];
  /** Timestamp when batch was created */
  timestamp: number;
  /** Unique identifier for a CI/CD run, to group sharded jobs */
  runId?: string | null;
  /** CI environment information for integration feedback (optional) */
  ci?: CiInfoPayload | null;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Browser connection information
 */
export interface BrowserConnectionInfo {
  /** WebSocket URL for browser connection */
  webSocketDebuggerUrl: string;
  /** Browser devtools URL */
  devtoolsFrontendUrl: string;
  /** Browser ID */
  id: string;
  /** Browser title */
  title?: string;
  /** Browser URL */
  url?: string;
  /** Browser version */
  browserVersion?: string;
  /** Protocol version */
  protocolVersion?: string;
  /** User agent */
  userAgent?: string;
  /** V8 version */
  v8Version?: string;
  /** WebKit version */
  webKitVersion?: string;
}

/**
 * Framework detection result
 */
export interface FrameworkDetection {
  /** Detected framework */
  framework: 'cypress' | 'webdriverio' | 'selenium-js' | 'selenium-python' | 'unknown';
  /** Confidence level (0-1) */
  confidence: number;
  /** Evidence for detection */
  evidence: string[];
  /** Configuration files found */
  configFiles: string[];
  /** Instructions for setup */
  instructions: string[];
}

/**
 * Command execution result
 */
export interface CommandResult {
  /** Exit code */
  exitCode: number;
  /** Signal that terminated the process */
  signal: string | null;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Duration in milliseconds */
  duration: number;
}

/**
 * Batch upload result
 */
export interface BatchResult {
  /** Batch ID */
  batchId: string;
  /** Number of snapshots uploaded */
  snapshotCount: number;
  /** Upload duration in milliseconds */
  duration: number;
  /** Dashboard URL */
  dashboardUrl?: string;
}
