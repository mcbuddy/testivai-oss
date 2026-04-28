import { BrowserClient } from './client';
import { logger, createLogger } from '../utils/logger';
import { SnapshotPayload, LayoutData, BrowserPerformanceMetrics } from '../types';
import { compressionHelper } from '@testivai/common';

/**
 * Browser capture functionality
 */
export class BrowserCapture {
  private logger: any;
  
  constructor(private client: BrowserClient, options: { debug?: boolean } = {}) {
    // Create a logger with debug options
    this.logger = createLogger({ debug: options.debug || false });
  }

  /**
   * Capture a complete snapshot (screenshot + structure + styles + layout)
   */
  async captureSnapshot(snapshotName: string, testName?: string): Promise<SnapshotPayload> {
    const timestamp = Date.now();
    
    this.logger.capture(snapshotName);

    // Get current URL
    const url = await this.getCurrentUrl();

    // Get viewport information
    const viewport = await this.getViewport();

    // Capture screenshot
    const screenshotData = await this.captureScreenshot();

    // In local mode, skip heavy captures (structure, styles, layout, performance).
    // Only the screenshot is needed for pixel-level visual diffing.
    const isLocal = process.env.TESTIVAI_MODE === 'local';

    // Capture page structure (HTML)
    // @renamed: dom → structure (IP protection)
    const structure = isLocal ? { html: '' } : await this.captureStructure();

    // Capture computed styles
    // @renamed: css → styles (IP protection)
    const styles = isLocal ? { computed_styles: {} } : await this.captureComputedStyles();

    // Capture layout
    const layout = isLocal ? { x: 0, y: 0, width: 0, height: 0 } as any : await this.captureLayout();

    // Capture performance metrics (optional)
    const performanceMetrics = isLocal ? undefined : await this.capturePerformanceTimings();

    // DEBUG: Log what data has been captured
    this.logger.info(`=== DEBUG: Captured Data for ${snapshotName} ===`);
    this.logger.info(`Structure captured: ${structure ? 'YES' : 'NO'}${structure ? ` (size: ${JSON.stringify(structure).length} chars)` : ''}`);
    this.logger.info(`Styles captured: ${styles ? 'YES' : 'NO'}${styles ? ` (elements: ${Object.keys(styles.computed_styles || {}).length})` : ''}`);
    this.logger.info(`Layout captured: ${layout ? 'YES' : 'NO'}${layout ? ` (dimensions: ${layout.width}x${layout.height})` : ''}`);
    this.logger.info(`Screenshot captured: ${screenshotData ? 'YES' : 'NO'}${screenshotData ? ` (size: ${Math.round(screenshotData.length * 0.75 / 1024)}KB)` : ''}`);
    this.logger.info(`Performance metrics captured: ${performanceMetrics ? 'YES' : 'NO'}`);
    this.logger.info(`=== END DEBUG ===`);

    // @renamed: dom → structure, css → styles (IP protection)
    const snapshot: SnapshotPayload = {
      structure,
      styles,
      layout,
      timestamp,
      testName: testName || 'test',
      snapshotName,
      url,
      viewport,
      screenshotData,
      performanceMetrics,
    };

    logger.debug(`Captured snapshot: ${snapshotName}`);
    return snapshot;
  }

  /**
   * Capture screenshot as base64
   */
  private async captureScreenshot(): Promise<string> {
    try {
      const result = await this.client.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: true,
      });

      if (!result.data) {
        throw new Error('No screenshot data received');
      }

      return result.data;
    } catch (error) {
      logger.error('Failed to capture screenshot:', error);
      throw error;
    }
  }

  /**
   * Capture page structure (HTML content)
   * @renamed Was `captureDom` — renamed to conceal internal layer terminology (IP protection)
   */
  private async captureStructure(): Promise<{ html: string }> {
    try {
      // Get document root
      const { root } = await this.client.send('DOM.getDocument');
      
      // Get outer HTML of the document
      const result = await this.client.send('DOM.getOuterHTML', {
        nodeId: root.nodeId,
      });

      if (!result.outerHTML) {
        throw new Error('No structure content received');
      }

      // Try to compress if large
      const compressionResult = await compressionHelper.compress(result.outerHTML);
      const html = typeof compressionResult.data === 'string' 
        ? compressionResult.data 
        : compressionResult.data.toString('utf-8');

      return { html };
    } catch (error) {
      logger.error('Failed to capture structure:', error);
      throw error;
    }
  }

  /**
   * Helper to build stable CSS selector path for a node
   * Uses nth-of-type to ensure uniqueness for elements with same tag/class
   */
  private async buildSelectorPath(nodeId: number): Promise<string | null> {
    try {
      // Get node details
      const nodeResult = await this.client.send('DOM.describeNode', { nodeId });
      const node = nodeResult.node;
      
      // If element has an ID, use that (most stable)
      if (node.attributes) {
        const attrs = node.attributes;
        for (let i = 0; i < attrs.length; i += 2) {
          if (attrs[i] === 'id' && attrs[i + 1]) {
            return `#${attrs[i + 1]}`;
          }
        }
      }
      
      // Build path from parent chain with nth-of-type for uniqueness
      const pathParts: string[] = [];
      let currentNodeId = nodeId;
      
      while (currentNodeId) {
        const { node: currentNode } = await this.client.send('DOM.describeNode', { nodeId: currentNodeId });
        
        if (!currentNode.nodeName || currentNode.nodeName === '#document') {
          break;
        }
        
        let selector = currentNode.localName || currentNode.nodeName.toLowerCase();
        
        // Add up to 3 CSS classes for better uniqueness
        // e.g., button.button.primary-button instead of just button.button
        let hasClass = false;
        if (currentNode.attributes) {
          const attrs = currentNode.attributes;
          for (let i = 0; i < attrs.length; i += 2) {
            if (attrs[i] === 'class' && attrs[i + 1]) {
              const classes = attrs[i + 1].trim().split(/\s+/).filter(Boolean);
              const maxClasses = Math.min(classes.length, 3);
              for (let c = 0; c < maxClasses; c++) {
                selector += `.${classes[c]}`;
              }
              hasClass = classes.length > 0;
              break;
            }
          }
        }
        
        // Add nth-of-type index to ensure uniqueness among siblings
        // This is crucial for distinguishing multiple buttons, divs, etc.
        if (currentNode.parentId && selector !== 'html' && selector !== 'body') {
          try {
            // Get sibling index by querying parent's children
            const siblingIndex = await this.getSiblingIndex(currentNodeId, currentNode.parentId, selector);
            if (siblingIndex > 0) {
              selector += `:nth-of-type(${siblingIndex})`;
            }
          } catch {
            // If we can't get sibling index, continue without it
          }
        }
        
        pathParts.unshift(selector);
        
        // Move to parent
        if (currentNode.parentId) {
          currentNodeId = currentNode.parentId;
        } else {
          break;
        }
      }
      
      return pathParts.join(' > ');
    } catch (error) {
      return null;
    }
  }

  /**
   * Get the nth-of-type index for a node among its siblings
   */
  private async getSiblingIndex(nodeId: number, parentId: number, selector: string): Promise<number> {
    try {
      // Get the tag name from selector (before any class)
      const tagName = selector.split('.')[0];
      
      // Query all siblings with same tag under parent
      const { nodeIds } = await this.client.send('DOM.querySelectorAll', {
        nodeId: parentId,
        selector: `:scope > ${tagName}`
      });
      
      // Find position of current node
      const index = nodeIds.indexOf(nodeId);
      return index >= 0 ? index + 1 : 0; // 1-indexed for CSS nth-of-type
    } catch {
      return 0;
    }
  }

  /**
   * Capture computed CSS styles
   */
  async captureComputedStyles(): Promise<{ computed_styles: Record<string, Record<string, string>> }> {
    try {
      this.logger.info('DEBUG: Starting CSS capture...');
      
      // Enable DOM domain first (required by CSS domain)
      await this.client.send('DOM.enable');
      
      // Enable CSS domain
      await this.client.send('CSS.enable');
      
      // Get document root
      const { root } = await this.client.send('DOM.getDocument');
      
      // Get all elements in the document (limit to first 100 for performance)
      const maxElements = 100;
      
      // Use DOM.querySelectorAll to get actual node IDs
      const { nodeIds } = await this.client.send('DOM.querySelectorAll', {
        nodeId: root.nodeId,
        selector: '*'
      });
      
      // Limit to first N elements for performance
      const limitedNodeIds = nodeIds.slice(0, maxElements);
      
      this.logger.info(`DEBUG: Found ${limitedNodeIds.length} elements for CSS capture`);
      
      const computedStyles: Record<string, Record<string, string>> = {};
      
      // Capture key visual properties for each element
      for (const nodeId of limitedNodeIds) {
        try {
          // Build stable selector path for this element
          const selectorPath = await this.buildSelectorPath(nodeId);
          if (!selectorPath) {
            continue; // Skip if we can't build a stable path
          }
          
          const styles = await this.client.send('CSS.getComputedStyleForNode', {
            nodeId: nodeId,
          });
          
          // Extract only the properties we care about for fingerprinting
          const visualProps = [
            'color', 'background-color', 'font-size', 'font-family', 'font-weight',
            'display', 'position', 'width', 'height', 'margin', 'padding',
            'border', 'border-radius', 'box-shadow', 'text-align', 'line-height'
          ];
          
          const filteredStyles: Record<string, string> = {};
          for (const prop of visualProps) {
            const computedProp = styles.computedStyle.find((s: any) => s.name === prop);
            if (computedProp) {
              filteredStyles[prop] = computedProp.value;
            }
          }
          
          // Use stable selector path as key instead of unstable nodeId
          // Deduplicate: if key already exists, append numeric suffix to prevent overwriting
          let uniqueKey = selectorPath;
          if (computedStyles[uniqueKey]) {
            let suffix = 2;
            while (computedStyles[`${selectorPath}[${suffix}]`]) {
              suffix++;
            }
            uniqueKey = `${selectorPath}[${suffix}]`;
          }
          computedStyles[uniqueKey] = filteredStyles;
        } catch (error) {
          // Skip elements that can't be styled
          continue;
        }
      }
      
      // Disable CSS and DOM domains
      await this.client.send('CSS.disable');
      await this.client.send('DOM.disable');
      
      this.logger.info(`DEBUG: CSS capture complete - captured styles for ${Object.keys(computedStyles).length} elements`);
      logger.debug(`Captured ${Object.keys(computedStyles).length} element styles`);
      
      return { computed_styles: computedStyles };
    } catch (error) {
      logger.error('Failed to capture CSS:', error);
      // Return empty styles instead of throwing
      return { computed_styles: {} };
    }
  }

  /**
   * Capture layout information
   */
  private async captureLayout(): Promise<LayoutData> {
    try {
      // Get layout of the body element using getBoundingClientRect
      const result = await this.client.send('Runtime.evaluate', {
        expression: `
          (function() {
            const body = document.body;
            const rect = body.getBoundingClientRect();
            return {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              top: rect.top,
              left: rect.left,
              right: rect.right,
              bottom: rect.bottom
            };
          })()
        `,
        returnByValue: true,
      });

      if (!result.result.value) {
        throw new Error('No layout data received');
      }

      return result.result.value as LayoutData;
    } catch (error) {
      logger.error('Failed to capture layout:', error);
      throw error;
    }
  }

  /**
   * Capture performance timings
   */
  private async capturePerformanceTimings(): Promise<BrowserPerformanceMetrics | undefined> {
    try {
      // Enable Performance domain
      await this.client.send('Performance.enable');
      
      // Get browser performance metrics
      const perfResult = await this.client.send('Performance.getMetrics');
      
      // Convert metrics array to object
      const runtime: any = {};
      perfResult.metrics.forEach((metric: any) => {
        runtime[metric.name] = metric.value;
      });
      
      // Get navigation timing and Web Vitals via Runtime.evaluate
      const timingResult = await this.client.send('Runtime.evaluate', {
        expression: `
          (function() {
            const timing = performance.timing;
            const navigation = performance.navigation;
            
            // Get paint entries
            const paintEntries = window.performance.getEntriesByType('paint');
            const fcp = paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime;
            
            // Get LCP
            const lcpEntries = window.performance.getEntriesByType('largest-contentful-paint');
            const lcp = lcpEntries[lcpEntries.length - 1]?.startTime;
            
            // Get CLS
            let cls = 0;
            try {
              const clsEntries = window.performance.getEntriesByType('layout-shift');
              clsEntries.forEach((entry: any) => {
                if (!entry.hadRecentInput) {
                  cls += entry.value;
                }
              });
            } catch (e) {
              // CLS might not be available
            }
            
            // Get FID (requires PerformanceObserver)
            let fid = null;
            try {
              const fidEntries = window.performance.getEntriesByType('first-input');
              if (fidEntries.length > 0) {
                fid = (fidEntries[0] as any).processingStart - (fidEntries[0] as any).startTime;
              }
            } catch (e) {
              // FID might not be available
            }
            
            return {
              navigation: {
                type: navigation.type,
                redirectCount: navigation.redirectCount
              },
              timing: {
                navigationStart: timing.navigationStart,
                unloadEventStart: timing.unloadEventStart,
                unloadEventEnd: timing.unloadEventEnd,
                redirectStart: timing.redirectStart,
                redirectEnd: timing.redirectEnd,
                fetchStart: timing.fetchStart,
                domainLookupStart: timing.domainLookupStart,
                domainLookupEnd: timing.domainLookupEnd,
                connectStart: timing.connectStart,
                connectEnd: timing.connectEnd,
                secureConnectionStart: timing.secureConnectionStart,
                requestStart: timing.requestStart,
                responseStart: timing.responseStart,
                responseEnd: timing.responseEnd,
                domLoading: timing.domLoading,
                domInteractive: timing.domInteractive,
                domContentLoadedEventStart: timing.domContentLoadedEventStart,
                domContentLoadedEventEnd: timing.domContentLoadedEventEnd,
                domComplete: timing.domComplete,
                loadEventStart: timing.loadEventStart,
                loadEventEnd: timing.loadEventEnd
              },
              webVitals: {
                firstContentfulPaint: fcp,
                largestContentfulPaint: lcp,
                cumulativeLayoutShift: cls,
                firstInputDelay: fid
              }
            };
          })()
        `,
        returnByValue: true,
      });

      const timingData = timingResult.result.value;
      
      return {
        runtime,
        timing: timingData
      } as BrowserPerformanceMetrics;
    } catch (error) {
      logger.debug('Failed to capture performance timings:', error);
      // Performance capture is optional, so don't throw
      return undefined;
    }
  }

  /**
   * Get current page URL
   */
  private async getCurrentUrl(): Promise<string> {
    try {
      const result = await this.client.send('Runtime.evaluate', {
        expression: 'window.location.href',
        returnByValue: true,
      });

      return result.result.value || 'about:blank';
    } catch (error) {
      logger.debug('Failed to get current URL:', error);
      return 'unknown';
    }
  }

  /**
   * Get viewport dimensions
   */
  private async getViewport(): Promise<{ width: number; height: number }> {
    try {
      const result = await this.client.send('Runtime.evaluate', {
        expression: `
          (function() {
            return {
              width: window.innerWidth,
              height: window.innerHeight
            };
          })()
        `,
        returnByValue: true,
      });

      return result.result.value || { width: 0, height: 0 };
    } catch (error) {
      logger.debug('Failed to get viewport:', error);
      return { width: 0, height: 0 };
    }
  }

  /**
   * Capture Lighthouse audit (if available)
   */
  async captureLighthouse(): Promise<any | undefined> {
    // Lighthouse capture is not implemented in Witness SDK
    // This would require additional setup and dependencies
    // Returning undefined for now
    return undefined;
  }
}
