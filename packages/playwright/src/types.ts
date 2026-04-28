/**
 * Types for Testivai Witness Playwright SDK
 * 
 * Defines the data shapes for evidence collection:
 * - SnapshotPayload: DOM + Layout data for a single snapshot
 * - BatchPayload: Git + Browser info + collection of snapshots
 * - TestivAIConfig: Configuration for visual analysis behavior
 */

/**
 * Layout configuration for visual analysis
 */
export interface LayoutConfig {
  /** Sensitivity level: 0-4 scale (0=strict/precise, 4=very lenient) */
  sensitivity: number;
  /** Base pixel tolerance for layout differences */
  tolerance: number;
  /** Per-selector tolerance overrides (optional) */
  selectorTolerances?: Record<string, number>;
  /** Use relative tolerance for large elements (optional) */
  useRelativeTolerance?: boolean;
  /** Percentage multiplier for relative tolerance (optional) */
  relativeTolerance?: number;
}

/**
 * AI configuration for visual analysis
 */
export interface AIConfig {
  /** Sensitivity level: 0-4 scale (0=conservative, 4=aggressive) */
  sensitivity: number;
  /** Minimum confidence threshold for AI_BUG verdict (0.0-1.0) */
  confidence: number;
  /** Include AI reasoning in results (optional) */
  enableReasoning?: boolean;
}

/**
 * Performance metrics configuration
 */
export interface PerformanceMetricsConfig {
  /** Enable performance metrics capture (default: true) */
  enabled?: boolean;
}

/**
 * Structure analysis configuration
 * Controls how page structure (HTML elements, hierarchy, semantics) is analyzed.
 * @renamed Was `DOMAnalysisConfig` — renamed to conceal internal layer terminology (IP protection)
 */
export interface StructureAnalysisConfig {
  /** Enable fingerprint generation (default: true) */
  enableFingerprint?: boolean;
  /** Enable structural analysis (default: true) */
  enableStructure?: boolean;
  /** Enable semantic analysis (default: true) */
  enableSemantic?: boolean;
  /** Attributes to ignore in analysis */
  ignoreAttributes?: string[];
  /** Elements to ignore completely */
  ignoreElements?: string[];
  /** Content patterns to ignore */
  ignoreContentPatterns?: RegExp[];
}

/**
 * Structure fingerprint and analysis result
 * Contains the structural analysis of a page: element fingerprint, hierarchy info, and semantic structure.
 * @renamed Was `DOMAnalysis` — renamed to conceal internal layer terminology (IP protection)
 */
export interface StructureAnalysis {
  /** Fast hash of normalized DOM structure */
  fingerprint?: string;
  /** Structural information about the DOM */
  structure?: {
    totalElements: number;
    elementTypes: Record<string, number>;
    maxDepth: number;
    interactiveElements: {
      buttons: number;
      inputs: number;
      links: number;
      forms: number;
    };
  };
  /** Semantic structure information */
  semantic?: {
    headings: Record<string, number>;
    landmarks: {
      hasHeader: boolean;
      hasNav: boolean;
      hasMain: boolean;
      hasFooter: boolean;
      hasAside: boolean;
    };
    lists: {
      ordered: number;
      unordered: number;
    };
    tables: number;
    images: number;
  };
  /** Component analysis (if detectable) */
  components?: Record<string, Array<{
    selector: string;
    text: string;
    attributes: Record<string, string>;
  }>>;
}

/**
 * Structure change information
 * Describes a detected change in page structure between baseline and current.
 * @renamed Was `DOMChange` — renamed to conceal internal layer terminology (IP protection)
 */
export interface StructureChange {
  type: 'fingerprint' | 'structure' | 'semantic' | 'component';
  severity: 'low' | 'medium' | 'high';
  description: string;
  details?: any;
}

/**
 * Performance timing metrics
 * @deprecated Use performanceMetrics with browser Performance.getMetrics instead
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
 * @deprecated Lighthouse has been removed. Use performanceMetrics with browser Performance.getMetrics instead
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
 * Environment-specific configuration overrides
 */
export interface EnvironmentConfig {
  /** Configuration for CI environments */
  ci?: {
    layout?: Partial<LayoutConfig>;
    ai?: Partial<AIConfig>;
  };
  /** Configuration for development environments */
  development?: {
    layout?: Partial<LayoutConfig>;
    ai?: Partial<AIConfig>;
  };
  /** Configuration for production environments */
  production?: {
    layout?: Partial<LayoutConfig>;
    ai?: Partial<AIConfig>;
  };
}

/**
 * Complete TestivAI project configuration
 */
export interface TestivAIProjectConfig {
  /** API key for authentication */
  apiKey?: string;
  /** API endpoint URL (defaults to production) */
  apiUrl?: string;
  /** Layout analysis settings */
  layout: LayoutConfig;
  /** AI analysis settings */
  ai: AIConfig;
  /** Performance metrics settings (optional) */
  performanceMetrics?: PerformanceMetricsConfig;
  /**
   * Structure analysis settings (optional)
   * @renamed Was `dom` — renamed to conceal internal layer terminology (IP protection)
   */
  structure?: StructureAnalysisConfig;
  /** Environment-specific overrides (optional) */
  environments?: EnvironmentConfig;
}

/**
 * Per-test configuration overrides
 */
export interface TestivAIConfig {
  /** Layout settings (optional - overrides project defaults) */
  layout?: Partial<LayoutConfig>;
  /** AI settings (optional - overrides project defaults) */
  ai?: Partial<AIConfig>;
  /** Performance settings (optional - overrides project defaults) */
  performanceMetrics?: Partial<PerformanceMetricsConfig>;
  /**
   * Structure analysis settings (optional - overrides project defaults)
   * @renamed Was `dom` — renamed to conceal internal layer terminology (IP protection)
   */
  structure?: Partial<StructureAnalysisConfig>;
  /** Element selectors to capture (existing option) */
  selectors?: string[];
  /** Use browser capture for full-page screenshots (default: true, set to false for scroll-and-stitch) */
  useBrowserCapture?: boolean;
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
 * Computed styles data for visual comparison
 * @renamed Was `CSSData` — renamed to conceal internal layer terminology (IP protection)
 */
export interface StylesData {
  /** Computed styles keyed by element selector path */
  computed_styles: Record<string, Record<string, string>>;
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
  styles?: StylesData;
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
  viewport?: {
    width: number;
    height: number;
  };
  /** TestivAI configuration for this snapshot */
  testivaiConfig?: TestivAIConfig;
  /** Base64-encoded screenshot data (PNG) */
  screenshotData?: string;
  /** Performance timing metrics (optional) */
  performanceTimings?: PerformanceTimings;
  /** Performance metrics from browser Performance.getMetrics (optional) */
  performanceMetrics?: any;
  /** Lighthouse results (optional) */
  lighthouseResults?: LighthouseResults;
  /**
   * Structure analysis results (optional)
   * @renamed Was `domAnalysis` — renamed to conceal internal layer terminology (IP protection)
   */
  structureAnalysis?: StructureAnalysis;
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
  /** Batch ID (generated) */
  batchId: string;
  /** Timestamp when batch was created */
  timestamp: number;
  /** Unique identifier for a CI/CD run, to group sharded jobs */
  runId?: string | null;
  /** CI environment information for integration feedback (optional) */
  ci?: CiInfoPayload | null;
}

