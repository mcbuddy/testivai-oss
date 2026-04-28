import CDP, { Client } from 'chrome-remote-interface';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { BrowserConnectionInfo } from '../types';

/**
 * Browser protocol client wrapper
 */
export class BrowserClient extends EventEmitter {
  private client: Client | null = null;
  private connectionInfo: BrowserConnectionInfo | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 500;

  /**
   * Connect to browser via remote debugging
   */
  async connect(port?: number): Promise<void> {
    try {
      // Import here to avoid issues if chrome-remote-interface is not available
      const { BrowserDiscovery } = await import('./discovery');
      
      // Discover browser endpoint
      this.connectionInfo = await BrowserDiscovery.discover(port);
      
      // Connect to the WebSocket
      this.client = await CDP({
        target: this.connectionInfo.webSocketDebuggerUrl,
      });

      // Set up event handlers
      if (this.client) {
        this.client.on('disconnect', () => {
          this.isConnected = false;
          this.emit('disconnect');
          logger.debug('Browser client disconnected');
        });

        this.client.on('event', (method: string, params: any) => {
          this.emit('event', method, params);
        });
      }

      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      logger.connected(port || 9222);
      this.emit('connect', this.client);
      
    } catch (error) {
      logger.error(`Failed to connect to browser: ${error}`);
      
      // Try to reconnect if we haven't exceeded max attempts
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        logger.debug(`Reconnecting attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
        
        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
        return this.connect(port);
      }
      
      throw error;
    }
  }

  /**
   * Disconnect from browser
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        this.client = null;
        this.isConnected = false;
        this.connectionInfo = null;
        logger.disconnected();
        this.emit('disconnect');
      } catch (error) {
        logger.error(`Error disconnecting from browser: ${error}`);
      }
    }
  }

  /**
   * Check if connected
   */
  isClientConnected(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Get the raw protocol client
   */
  getClient(): Client | null {
    return this.client;
  }

  /**
   * Get connection info
   */
  getConnectionInfo(): BrowserConnectionInfo | null {
    return this.connectionInfo;
  }

  /**
   * Enable a domain
   */
  async enableDomain(domain: string): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to browser');
    }

    try {
      await this.client.send(`${domain}.enable`);
      logger.debug(`Enabled domain: ${domain}`);
    } catch (error) {
      logger.error(`Failed to enable domain ${domain}: ${error}`);
      throw error;
    }
  }

  /**
   * Send a command to browser
   */
  async send<T = any>(method: string, params?: any): Promise<T> {
    if (!this.client) {
      throw new Error('Not connected to browser');
    }

    try {
      const result = await this.client.send(method, params);
      logger.debug(`Browser command: ${method}`, params);
      return result;
    } catch (error) {
      logger.error(`Browser command failed: ${method}`, error);
      throw error;
    }
  }

  /**
   * Get available targets (tabs/pages)
   */
  async getTargets(): Promise<any[]> {
    if (!this.client) {
      throw new Error('Not connected to browser');
    }

    try {
      const { Target } = this.client;
      const targets = await Target.getTargets();
      return targets.targetInfos;
    } catch (error) {
      logger.error('Failed to get targets:', error);
      throw error;
    }
  }

  /**
   * Attach to a specific target
   */
  async attachToTarget(targetId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to browser');
    }

    try {
      const { Target } = this.client;
      await Target.attachToTarget({ targetId, flatten: true });
      logger.debug(`Attached to target: ${targetId}`);
    } catch (error) {
      logger.error(`Failed to attach to target ${targetId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new tab
   */
  async createTarget(url: string = 'about:blank'): Promise<string> {
    if (!this.client) {
      throw new Error('Not connected to browser');
    }

    try {
      const { Target } = this.client;
      const result = await Target.createTarget({ url });
      logger.debug(`Created new target: ${result.targetId}`);
      return result.targetId;
    } catch (error) {
      logger.error('Failed to create target:', error);
      throw error;
    }
  }

  /**
   * Close a target
   */
  async closeTarget(targetId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to browser');
    }

    try {
      const { Target } = this.client;
      await Target.closeTarget({ targetId });
      logger.debug(`Closed target: ${targetId}`);
    } catch (error) {
      logger.error(`Failed to close target ${targetId}:`, error);
      throw error;
    }
  }

  /**
   * Set up event listeners for specific domains
   */
  setupEventListeners(): void {
    if (!this.client) {
      return;
    }

    // Page events
    if (this.client.Page) {
      this.client.Page.frameNavigated((params: any) => {
        this.emit('frameNavigated', params);
        logger.debug('Frame navigated:', params.frame.id);
      });

      this.client.Page.loadEventFired(() => {
        this.emit('loadEventFired');
        logger.debug('Load event fired');
      });
    }

    // Runtime events
    if (this.client.Runtime) {
      this.client.Runtime.bindingCalled((params: any) => {
        this.emit('bindingCalled', params);
        logger.bindingCalled(params.name, params.payload);
      });

      this.client.Runtime.consoleAPICalled((params: any) => {
        this.emit('consoleAPICalled', params);
      });

      this.client.Runtime.exceptionThrown((params: any) => {
        this.emit('exceptionThrown', params);
        logger.error('Runtime exception:', params.exceptionDetails);
      });
    }

    // Network events
    if (this.client.Network) {
      this.client.Network.requestWillBeSent((params: any) => {
        this.emit('requestWillBeSent', params);
      });

      this.client.Network.responseReceived((params: any) => {
        this.emit('responseReceived', params);
      });
    }
  }
}
