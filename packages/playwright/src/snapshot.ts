import { Page, TestInfo } from '@playwright/test';
import * as fs from 'fs-extra';
import * as path from 'path';
import { URL } from 'url';
import sharp from 'sharp';
import { SnapshotPayload, LayoutData, TestivAIConfig, StructureAnalysis, StructureAnalysisConfig } from './types';
import { loadConfig, mergeTestConfig } from './config/loader';

/**
 * Generates a safe filename from a URL.
 * @param pageUrl The URL of the page.
 * @returns A sanitized string suitable for a filename.
 */
function getSnapshotNameFromUrl(pageUrl: string): string {
  // Handle data URIs, which are common in test environments
  if (pageUrl.startsWith('data:')) {
    return 'snapshot';
  }

  try {
    const url = new URL(pageUrl);
    const pathName = url.pathname.substring(1).replace(/\//g, '_'); // remove leading slash and replace others
    return pathName || 'home';
  } catch (error) {
    // Fallback for invalid URLs
    return 'snapshot';
  }
}

/**
 * Captures a snapshot of the page, including a screenshot, DOM, and layout data.
 * The evidence is stored in a temporary directory for the reporter to process later.
 *
 * @param page The Playwright Page object.
 * @param testInfo The Playwright TestInfo object, passed from the test.
 * @param name An optional unique name for the snapshot. If not provided, a name is generated from the URL.
 * @param config Optional TestivAI configuration for this snapshot (overrides project defaults).
 */
export async function snapshot(
  page: Page,
  testInfo: TestInfo,
  name?: string,
  config?: TestivAIConfig
): Promise<void> {
  // Check for local mode - only capture screenshots, skip heavy data
  const isLocalMode = process.env.TESTIVAI_MODE === 'local';

  // Load project configuration and merge with test-specific overrides
  const projectConfig = await loadConfig();
  const effectiveConfig = mergeTestConfig(projectConfig, config);

  // Debug: Log config
  if (process.env.TESTIVAI_DEBUG === 'true') {
    console.log('[TestivAI] Config:', {
      projectConfig,
      testConfig: config,
      effectiveConfig,
      isLocalMode
    });
  }

  const outputDir = path.join(process.cwd(), '.testivai', 'temp');
  await fs.ensureDir(outputDir);

  const snapshotName = name || getSnapshotNameFromUrl(page.url());
  const timestamp = Date.now();
  const safeName = snapshotName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const baseFilename = `${timestamp}_${safeName}`;

  // 1. Capture full-page screenshot
  const screenshotPath = path.join(outputDir, `${baseFilename}.png`);
  
  // Check if scroll-and-stitch is explicitly requested (backup method)
  if (effectiveConfig.useBrowserCapture === false) {
    // Use scroll-and-stitch approach (backup method)
    if (process.env.TESTIVAI_DEBUG === 'true') {
      console.log('[TestivAI] Using scroll-and-stitch approach (backup method)');
    }
    
    // Get viewport dimensions
    const viewport = page.viewportSize();
    const viewportWidth = viewport?.width || 1280;
    const viewportHeight = viewport?.height || 720;
    
    // Find the main scrollable container and get its dimensions
    const scrollableInfo = await page.evaluate(`
    (function() {
      var mainScrollable = null;
      var maxScrollHeight = 0;
      
      // Find the element with the most scrollable content
      document.querySelectorAll('*').forEach(function(el) {
        var computed = window.getComputedStyle(el);
        var isScrollable = (
          computed.overflowY === 'auto' || 
          computed.overflowY === 'scroll'
        );
        
        if (isScrollable && el.scrollHeight > el.clientHeight) {
          if (el.scrollHeight > maxScrollHeight) {
            maxScrollHeight = el.scrollHeight;
            mainScrollable = el;
          }
        }
      });
      
      // If we found a scrollable container, add a temporary ID
      if (mainScrollable) {
        if (!mainScrollable.id) {
          mainScrollable.id = '__testivai_scrollable_' + Date.now();
        }
        return {
          hasScrollable: true,
          scrollableId: mainScrollable.id,
          scrollHeight: mainScrollable.scrollHeight,
          clientHeight: mainScrollable.clientHeight,
          scrollTop: mainScrollable.scrollTop
        };
      }
      
      // Fallback to document scroll
      return {
        hasScrollable: false,
        scrollableId: null,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: window.innerHeight,
        scrollTop: window.scrollY
      };
    })()
  `) as { 
    hasScrollable: boolean; 
    scrollableId: string | null; 
    scrollHeight: number; 
    clientHeight: number;
    scrollTop: number;
  };
  
  // Calculate number of screenshots needed
  const totalHeight = scrollableInfo.scrollHeight;
  const captureHeight = scrollableInfo.clientHeight;
  const numCaptures = Math.ceil(totalHeight / captureHeight);
  
  // Debug logging (only when TESTIVAI_DEBUG is enabled)
  if (process.env.TESTIVAI_DEBUG === 'true') {
    console.log(`[TestivAI] Scroll-and-stitch info:`, {
      hasScrollable: scrollableInfo.hasScrollable,
      scrollableId: scrollableInfo.scrollableId,
      totalHeight,
      captureHeight,
      numCaptures,
      viewportWidth,
      viewportHeight
    });
  }
  
  // If only one capture needed, just take a regular screenshot
  if (numCaptures <= 1) {
    await page.screenshot({ path: screenshotPath, fullPage: true });
  } else {
    // Scroll-and-stitch approach
    const screenshots: Buffer[] = [];
    
    for (let i = 0; i < numCaptures; i++) {
      const scrollPosition = i * captureHeight;
      
      // Scroll to position
      if (scrollableInfo.hasScrollable && scrollableInfo.scrollableId) {
        await page.evaluate(`
          document.getElementById('${scrollableInfo.scrollableId}').scrollTop = ${scrollPosition};
        `);
      } else {
        await page.evaluate(`window.scrollTo(0, ${scrollPosition})`);
      }
      
      // Wait for scroll and any lazy-loaded content
      await page.waitForTimeout(100);
      
      // Capture this viewport
      const screenshotBuffer = await page.screenshot({ fullPage: false });
      screenshots.push(screenshotBuffer);
    }
    
    // Stitch screenshots together using sharp
    // Calculate the actual height of the last capture (may be partial)
    const lastCaptureHeight = totalHeight - (captureHeight * (numCaptures - 1));
    
    // Create composite image
    const compositeInputs = screenshots.map((buffer, index) => {
      const isLast = index === screenshots.length - 1;
      const yOffset = index * captureHeight;
      
      // For the last screenshot, we need to crop from the bottom
      if (isLast && lastCaptureHeight < captureHeight) {
        return {
          input: buffer,
          top: yOffset,
          left: 0,
          // We'll handle the cropping separately
        };
      }
      
      return {
        input: buffer,
        top: yOffset,
        left: 0,
      };
    });
    
    // Create the final stitched image
    const finalImage = sharp({
      create: {
        width: viewportWidth,
        height: totalHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    });
    
    // Composite all screenshots
    const stitchedImage = await finalImage
      .composite(compositeInputs)
      .png()
      .toBuffer();
    
    await fs.writeFile(screenshotPath, stitchedImage);
    
    // Restore original scroll position
    if (scrollableInfo.hasScrollable && scrollableInfo.scrollableId) {
      await page.evaluate(`
        document.getElementById('${scrollableInfo.scrollableId}').scrollTop = ${scrollableInfo.scrollTop};
      `);
    } else {
      await page.evaluate(`window.scrollTo(0, ${scrollableInfo.scrollTop})`);
    }
  }
  } else {
    // Use browser capture approach (default)
    if (process.env.TESTIVAI_DEBUG === 'true') {
      console.log('[TestivAI] Using browser capture approach (default) for full-page screenshot');
    }
    
    try {
      // Create a browser session
      const client = await page.context().newCDPSession(page);
      
      // Enable Page domain
      await client.send('Page.enable');
      
      // Temporarily remove height constraints to get the full scrollable content
      await page.addStyleTag({
        content: `
          html, body {
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
          }
          #testivai-layout-root, [class*="h-screen"] {
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
        `
      });
      
      // Wait a bit for styles to apply
      await page.waitForTimeout(100);
      
      // Get layout metrics to determine full page size
      const layoutMetrics = await client.send('Page.getLayoutMetrics');
      
      // Calculate full page dimensions
      const pageWidth = Math.ceil(layoutMetrics.contentSize.width);
      const pageHeight = Math.ceil(layoutMetrics.contentSize.height);
      
      if (process.env.TESTIVAI_DEBUG === 'true') {
        console.log('[TestivAI] Browser layout metrics:', {
          pageWidth,
          pageHeight,
          viewportWidth: layoutMetrics.layoutViewport.clientWidth,
          viewportHeight: layoutMetrics.layoutViewport.clientHeight
        });
      }
      
      // Capture screenshot with captureBeyondViewport: true
      const screenshot = await client.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        clip: {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
          scale: 1
        }
      });
      
      // Save the screenshot
      await fs.writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));
      
      // Remove the temporary style tag
      await page.evaluate(`
        const styleTags = document.querySelectorAll('style');
        // Remove the last added style tag (our temporary one)
        if (styleTags.length > 0) {
          styleTags[styleTags.length - 1].remove();
        }
      `);
      
      // Close browser session
      await client.detach();
      
    } catch (error: any) {
      console.error('[TestivAI] Browser screenshot failed:', error.message);
      // Fallback to regular screenshot
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }
  }

  // 1.5. Local mode: also place the screenshot in the layout expected by
  //      @testivai/witness/report (subdirectory keyed by snapshot name).
  //      This is what `BaselineStore.listTemp()` and `compareAll()` enumerate.
  if (isLocalMode) {
    const localSnapshotDir = path.join(outputDir, snapshotName);
    await fs.ensureDir(localSnapshotDir);
    await fs.copyFile(screenshotPath, path.join(localSnapshotDir, 'screenshot.png'));
  }

  // 2. Dump page structure (HTML) - skip in local mode
  // @renamed: domPath → structurePath (IP protection)
  let structurePath = '';
  if (!isLocalMode) {
    structurePath = path.join(outputDir, `${baseFilename}.html`);
    const htmlContent = await page.content();
    await fs.writeFile(structurePath, htmlContent);
  }

  // 2.5. Capture computed styles using browser session - skip in local mode
  // @renamed: cssPath → stylesPath (IP protection)
  let stylesPath = '';
  if (!isLocalMode) {
    stylesPath = path.join(outputDir, `${baseFilename}.css.json`);
    try {
      const browserSession = await page.context().newCDPSession(page);

      // Enable DOM and CSS domains
      await browserSession.send('DOM.enable');
      await browserSession.send('CSS.enable');

      // Get all elements and their computed styles
      const computedStyles: Record<string, Record<string, string>> = {};

      // Visual properties we care about
      const visualProperties = [
        'color', 'background-color', 'background-image',
        'font-size', 'font-weight', 'font-family',
        'width', 'height', 'padding', 'margin',
        'border', 'border-radius', 'box-shadow',
        'display', 'position', 'top', 'left', 'right', 'bottom',
        'transform', 'opacity', 'visibility', 'z-index'
      ];

      // Execute script to get all elements with unique identifiers
      const elementsData = await browserSession.send('Runtime.evaluate', {
        expression: `
          (function() {
            // Helper to get stable CSS selector path for an element
            function getElementPath(element) {
              if (element.id) {
                return '#' + element.id;
              }

              const path = [];
              let current = element;

              while (current && current !== document.body) {
                let selector = current.tagName.toLowerCase();

                // Add up to 3 CSS classes for better uniqueness
                // e.g., button.button.primary-button instead of just button.button
                if (current.className && typeof current.className === 'string') {
                  const classes = current.className.trim().split(/\\s+/).filter(Boolean);
                  const maxClasses = Math.min(classes.length, 3);
                  for (let c = 0; c < maxClasses; c++) {
                    selector += '.' + classes[c];
                  }
                }

                // Get nth-child position for uniqueness
                if (current.parentNode) {
                  const siblings = Array.from(current.parentNode.children);
                  const sameTagSiblings = siblings.filter(s => s.tagName === current.tagName);
                  if (sameTagSiblings.length > 1) {
                    const index = sameTagSiblings.indexOf(current) + 1;
                    selector += \`:nth-of-type(\${index})\`;
                  }
                }

                path.unshift(selector);
                current = current.parentElement;
              }

              return path.join(' > ');
            }

            const elements = document.querySelectorAll('*');
            const result = [];
            elements.forEach((el, index) => {
              const selectorPath = getElementPath(el);
              const tagName = el.tagName.toLowerCase();
              const className = el.className || '';
              result.push({
                selectorPath,
                tagName,
                className,
                index
              });
            });
            return result;
          })()
        `,
        returnByValue: true
      });

      if (elementsData.result.value) {
        const elements = elementsData.result.value as Array<{selectorPath: string, tagName: string, className: string, index: number}>;

        // Get computed styles for each element (sample first 100 to avoid performance issues)
        const sampleSize = Math.min(elements.length, 100);
        for (let i = 0; i < sampleSize; i++) {
          const element = elements[i];
          try {
            const styleResult = await browserSession.send('Runtime.evaluate', {
              expression: `
                (function() {
                  const el = document.querySelectorAll('*')[${element.index}];
                  if (!el) return null;
                  const styles = window.getComputedStyle(el);
                  const result = {};
                  ${JSON.stringify(visualProperties)}.forEach(prop => {
                    result[prop] = styles.getPropertyValue(prop);
                  });
                  return result;
                })()
              `,
              returnByValue: true
            });

            if (styleResult.result.value) {
              // Use stable selector path as element ID instead of unstable index
              // Deduplicate: if key already exists, append numeric suffix to prevent overwriting
              let uniqueKey = element.selectorPath;
              if (computedStyles[uniqueKey]) {
                let suffix = 2;
                while (computedStyles[`${element.selectorPath}[${suffix}]`]) {
                  suffix++;
                }
                uniqueKey = `${element.selectorPath}[${suffix}]`;
              }
              computedStyles[uniqueKey] = styleResult.result.value as Record<string, string>;
            }
          } catch (err) {
            // Skip elements that fail
            continue;
          }
        }
      }

      // Disable domains and close session
      await browserSession.send('CSS.disable');
      await browserSession.send('DOM.disable');
      await browserSession.detach();

      // Save computed styles to file
      await fs.writeJson(stylesPath, {
        computed_styles: computedStyles,
        timestamp: Date.now(),
        sample_size: Object.keys(computedStyles).length
      });

      if (process.env.TESTIVAI_DEBUG === 'true') {
        console.log(`[TestivAI] Captured ${Object.keys(computedStyles).length} element styles`);
      }
    } catch (error) {
      console.warn('[TestivAI] Failed to capture CSS via browser session:', error);
      // Continue without CSS data
    }
  }

  // 3. Extract bounding boxes for requested selectors - skip in local mode
  const selectors = effectiveConfig.selectors ?? ['body'];
  const layout: Record<string, LayoutData> = {};

  if (!isLocalMode) {
    for (const selector of selectors) {
      const element = page.locator(selector).first();
      const boundingBox = await element.boundingBox();
      if (boundingBox) {
        layout[selector] = {
          ...boundingBox,
          top: boundingBox.y,
          left: boundingBox.x,
          right: boundingBox.x + boundingBox.width,
          bottom: boundingBox.y + boundingBox.height,
        };
      }
    }
  }

  // 4. Capture performance metrics using browser session (if enabled) - skip in local mode
  let performanceMetrics: any = undefined;

  const metricsEnabled = effectiveConfig.performanceMetrics?.enabled ?? true; // Default: enabled

  if (metricsEnabled && !isLocalMode) {
    try {
      // Get browser session from Playwright page
      const browserSession = await page.context().newCDPSession(page);
      
      // Enable Performance domain
      await browserSession.send('Performance.enable');
      
      // Get browser performance metrics
      const browserMetrics = await browserSession.send('Performance.getMetrics');
      
      // Convert metrics array to object
      const browserMetricsObj: any = {};
      browserMetrics.metrics.forEach((metric: any) => {
        browserMetricsObj[metric.name] = metric.value;
      });
      
      // Get navigation timing and Web Vitals via page.evaluate
      const timingData = await page.evaluate(() => {
        const timing = window.performance.timing;
        const navigation = window.performance.navigation;
        
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
      });
      
      // Disable Performance domain
      await browserSession.send('Performance.disable');
      await browserSession.detach();
      
      // Structure identical to Witness SDK
      performanceMetrics = {
        cdp: browserMetricsObj,
        timing: timingData,
        timestamp: Date.now()
      };
    } catch (err) {
      console.warn('Failed to capture performance metrics:', err);
    }
  }

  // 5. Structure analysis is now handled on the backend - skip in local mode
  // The SDK just captures the HTML and sends it with the configuration
  // @renamed: domAnalysis → structureAnalysis (IP protection)
  const structureAnalysis = isLocalMode ? undefined : undefined; // Will be populated by backend

  // 6. Save metadata with configuration and performance data
  const metadataPath = path.join(outputDir, `${baseFilename}.json`);
  const metadata: Partial<SnapshotPayload> = {
    snapshotName,
    testName: testInfo.title,
    timestamp,
    url: page.url(),
    viewport: page.viewportSize() || undefined,
  };

  await fs.writeJson(metadataPath, {
    ...metadata,
    files: {
      screenshot: screenshotPath,
      // @renamed: dom → structure, css → styles (IP protection)
      structure: structurePath,
      styles: stylesPath,
    },
    layout,
    // Store the effective configuration for the reporter
    testivaiConfig: effectiveConfig,
    // Store unified performance metrics if captured
    performanceMetrics,
    // Store structure analysis if captured
    // @renamed: domAnalysis → structureAnalysis (IP protection)
    structureAnalysis
  });
}
