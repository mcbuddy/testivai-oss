import type { BrowserClient } from './client';
import { logger, createLogger } from '../utils/logger';

/**
 * Client-side script injected into the browser
 * This creates a simple function that triggers browser capture via CDP binding
 */
const CLIENT_SCRIPT = `
(function() {
  // Create the witness function
  window.testivaiWitness = function(name) {
    // Use the CDP binding
    if (typeof testivaiCapture === 'function') {
      return testivaiCapture(JSON.stringify({ name: name }));
    }
    // Fallback: store for polling
    window.__testivaiSnapshotName = name;
    window.__testivaiCaptureRequested = Date.now();
    return Promise.resolve();
  };
})();
`;

/**
 * ACK script to resolve the Promise
 */
const ACK_SCRIPT = `
(function() {
  if (window.__testivaiResolve) {
    window.__testivaiResolve();
    window.__testivaiResolve = null;
  }
})();
`;

/**
 * Browser binding management
 */
export class BrowserBinding {
  private snapshots: any[] = [];
  private isBindingRegistered = false;
  private pollInterval?: NodeJS.Timeout;
  private logger: any;

  constructor(private client: BrowserClient, options: { debug?: boolean } = {}) {
    // Create a logger with debug options
    this.logger = createLogger({ debug: options.debug || false });
    this.setupEventListeners();
  }

  /**
   * Set up the Runtime bindings
   */
  async setupBindings(): Promise<void> {
    try {
      // Enable Runtime domain
      await this.client.enableDomain('Runtime');
      await this.client.send('Runtime.enable');

      // Add CDP binding for capture
      await this.client.send('Runtime.addBinding', {
        name: 'testivaiCapture'
      });

      // Listen for binding calls
      this.client.on('Runtime.bindingCalled', (event: any) => {
        if (event.name === 'testivaiCapture') {
          const payload = JSON.parse(event.payload);
          this.logger.debug('Capture requested via binding:', payload.name);
          this.handleWitnessCall(payload.name);
        }
      });

      // Inject the client-side script
      await this.injectClientScript();

      this.isBindingRegistered = true;
      logger.success('Browser bindings registered successfully');
    } catch (error) {
      logger.error('Failed to setup browser bindings:', error);
      throw error;
    }
  }

  /**
   * Inject the client-side script into all pages
   */
  private async injectClientScript(): Promise<void> {
    try {
      // Enable Page domain
      await this.client.enableDomain('Page');

      // Add script to evaluate on new documents
      await this.client.send('Page.addScriptToEvaluateOnNewDocument', {
        source: CLIENT_SCRIPT,
      });

      // Get all targets (pages/frames) and inject script
      try {
        // Access the underlying chrome-remote-interface client
        const criClient = (this.client as any).client;
        
        if (criClient?.Target) {
          // Get all targets
          const targets = await criClient.Target.getTargets();
          
          for (const targetInfo of targets.targetInfos) {
            if (targetInfo.type === 'page') {
              try {
                // Attach to the target
                const target = await criClient.Target.attachToTarget({
                  targetId: targetInfo.targetId,
                  flatten: true
                });
                
                // Get the session
                const session = criClient.session(target.sessionId);
                
                // Enable Runtime for this session
                await session.Runtime.enable();
                
                // Evaluate the script in this context
                await session.Runtime.evaluate({
                  expression: CLIENT_SCRIPT,
                });
                
                logger.debug(`Client script injected into target: ${targetInfo.url}`);
                
                // Detach from target
                await criClient.Target.detachFromTarget({
                  sessionId: target.sessionId
                });
              } catch (error) {
                logger.debug(`Failed to inject script into target ${targetInfo.targetId}:`, error);
              }
            }
          }
        } else {
          // Fallback: try global evaluation
          await this.client.send('Runtime.evaluate', {
            expression: CLIENT_SCRIPT,
          });
          logger.debug('Client script evaluated globally');
        }
      } catch (error) {
        logger.debug('Failed to enumerate targets:', error);
        
        // Fallback: try global evaluation
        try {
          await this.client.send('Runtime.evaluate', {
            expression: CLIENT_SCRIPT,
          });
          logger.debug('Client script evaluated globally');
        } catch (fallbackError) {
          logger.debug('Failed to evaluate script globally:', fallbackError);
        }
      }

      logger.debug('Client script injection complete');
    } catch (error) {
      logger.error('Failed to inject client script:', error);
      throw error;
    }
  }

  /**
   * Set up polling for capture requests
   */
  private setupEventListeners(): void {
    let isConnected = true;
    let criClient: any = null;
    
    // Get the underlying chrome-remote-interface client
    try {
      criClient = (this.client as any).client;
    } catch (error) {
      logger.debug('Could not access underlying client:', error);
    }
    
    // Poll for capture requests
    const pollInterval = setInterval(async () => {
      if (!isConnected) {
        clearInterval(pollInterval);
        return;
      }
      
      try {
        let result: any;
        
        // Try to evaluate in page context if we have access to targets
        if (criClient?.Target) {
          try {
            // Get targets to find the main page
            const targets = await criClient.Target.getTargets();
            const pageTarget = targets.targetInfos.find((t: any) => t.type === 'page' && t.url !== 'about:blank');
            
            if (pageTarget) {
              // Attach to target
              const target = await criClient.Target.attachToTarget({
                targetId: pageTarget.targetId,
                flatten: true
              });
              
              // Get session
              const session = criClient.session(target.sessionId);
              
              // Enable Runtime
              await session.Runtime.enable();
              
              // Evaluate in page context
              result = await session.Runtime.evaluate({
                expression: 'window.__testivaiCaptureRequested',
              });
              
              if (result.result.value) {
                // Get snapshot name
                const nameResult = await session.Runtime.evaluate({
                  expression: 'window.__testivaiSnapshotName',
                });
                
                const snapshotName = nameResult.result.value || 'snapshot';
                this.logger.debug('Capture requested for:', snapshotName);
                
                // Clear the request flag
                await session.Runtime.evaluate({
                  expression: 'window.__testivaiCaptureRequested = null; window.__testivaiSnapshotName = null;',
                });
                
                // Handle the capture
                await this.handleWitnessCall(snapshotName);
              }
              
              // Detach
              await criClient.Target.detachFromTarget({
                sessionId: target.sessionId
              });
            }
          } catch (_targetError) {
            // Fallback to default context
            result = await this.client.send('Runtime.evaluate', {
              expression: 'window.__testivaiCaptureRequested',
            });
            
            if (result.result.value) {
              const nameResult = await this.client.send('Runtime.evaluate', {
                expression: 'window.__testivaiSnapshotName',
              });
              
              const snapshotName = nameResult.result.value || 'snapshot';
              this.logger.debug('Capture requested for:', snapshotName);
              
              await this.client.send('Runtime.evaluate', {
                expression: 'window.__testivaiCaptureRequested = null; window.__testivaiSnapshotName = null;',
              });
              
              await this.handleWitnessCall(snapshotName);
            }
          }
        } else {
          // Fallback to default context
          result = await this.client.send('Runtime.evaluate', {
            expression: 'window.__testivaiCaptureRequested',
          });
          
          if (result.result.value) {
            const nameResult = await this.client.send('Runtime.evaluate', {
              expression: 'window.__testivaiSnapshotName',
            });
            
            const snapshotName = nameResult.result.value || 'snapshot';
            this.logger.debug('Capture requested for:', snapshotName);
            
            await this.client.send('Runtime.evaluate', {
              expression: 'window.__testivaiCaptureRequested = null; window.__testivaiSnapshotName = null;',
            });
            
            await this.handleWitnessCall(snapshotName);
          }
        }
      } catch (error: any) {
        if (error.message?.includes('WebSocket is not open')) {
          logger.debug('WebSocket closed, stopping polling');
          isConnected = false;
          clearInterval(pollInterval);
        }
      }
    }, 100); // Poll every 100ms
    
    // Store interval for cleanup
    this.pollInterval = pollInterval;

    // Listen for disconnect event
    this.client.on('disconnect', () => {
      logger.debug('Browser disconnected, stopping polling');
      isConnected = false;
      clearInterval(pollInterval);
    });

    // Listen for frame navigation to re-inject script
    this.client.on('frameNavigated', async () => {
      if (this.isBindingRegistered && isConnected) {
        logger.debug('Frame navigated, re-injecting client script');
        await this.injectClientScript();
      }
    });
  }

  /**
   * Handle a witness binding call
   */
  private async handleWitnessCall(snapshotName: string): Promise<void> {
    try {
      const name = snapshotName || 'snapshot';
      this.logger.debug(`Capturing snapshot: ${name}`);

      // Enable Page domain if not already enabled
      await this.client.enableDomain('Page');

      // Get current URL
      const urlResult = await this.client.send('Runtime.evaluate', {
        expression: 'window.location.href',
      });
      const currentUrl = urlResult.result.value || 'about:blank';

      // Get viewport size
      const viewportResult = await this.client.send('Runtime.evaluate', {
        expression: '{width: window.innerWidth, height: window.innerHeight}',
      });
      const viewport = viewportResult.result.value || { width: 1920, height: 1080 };

      // Capture screenshot using Page.captureScreenshot. The screenshot is
      // all the pixel diff needs; DOM/style evidence comes from the adapters.
      const screenshotResult = await this.client.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
      });

      // Create snapshot object
      const snapshot = {
        name,
        screenshot: screenshotResult.data,
        timestamp: new Date().toISOString(),
        url: currentUrl,
        viewport,
      };
      
      // Add to snapshots array
      this.snapshots.push(snapshot);
      this.logger.debug(`Captured snapshot: ${name}`);

      // Send ACK to resolve the Promise
      await this.sendAck();

      this.logger.debug(`Captured and ACK'd: ${name}`);
    } catch (error) {
      this.logger.error(`Failed to handle witness call for ${snapshotName}:`, error);
      
      // Still send ACK to avoid hanging the test
      await this.sendAck();
    }
  }

  /**
   * Send ACK to resolve the Promise
   */
  private async sendAck(): Promise<void> {
    try {
      await this.client.send('Runtime.evaluate', {
        expression: ACK_SCRIPT,
      });
      logger.debug('Sent ACK');
    } catch (error) {
      logger.error('Failed to send ACK:', error);
    }
  }

  /**
   * Get all captured snapshots
   */
  getSnapshots(): any[] {
    return this.snapshots;
  }

  /**
   * Clear all captured snapshots
   */
  clearSnapshots(): void {
    this.snapshots = [];
    logger.debug('Cleared snapshots');
  }

  /**
   * Check if bindings are registered
   */
  isRegistered(): boolean {
    return this.isBindingRegistered;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
  }
}
