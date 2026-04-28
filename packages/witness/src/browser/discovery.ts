import { logger } from '../utils/logger';
import { BrowserConnectionInfo } from '../types';
import chalk from 'chalk';

/**
 * Default browser debugging ports to try
 */
const DEFAULT_PORTS = [9222, 9223, 9224, 9229];

/**
 * Auto-discover browser debugging endpoint
 */
export class BrowserDiscovery {
  /**
   * Discover browser endpoint on available ports
   */
  static async discover(port?: number): Promise<BrowserConnectionInfo> {
    // If port is specified, try only that port
    if (port) {
      logger.debug(`Trying specified port: ${port}`);
      const info = await this.tryPort(port);
      if (info) {
        return info;
      }
      throw new Error(`Browser debugging endpoint not found on port ${port}`);
    }

    // Check environment variable first
    const envPort = process.env.TESTIVAI_BROWSER_PORT || process.env.TESTIVAI_CDP_PORT;
    if (envPort) {
      const portNum = parseInt(envPort, 10);
      if (!isNaN(portNum)) {
        logger.debug(`Trying port from environment: ${portNum}`);
        const info = await this.tryPort(portNum);
        if (info) {
          return info;
        }
      }
    }

    // Try default ports
    for (const defaultPort of DEFAULT_PORTS) {
      logger.debug(`Trying default port: ${defaultPort}`);
      const info = await this.tryPort(defaultPort);
      if (info) {
        return info;
      }
    }

    // No port found
    throw new BrowserDiscoveryError();
  }

  /**
   * Try to connect to a specific port
   */
  private static async tryPort(port: number): Promise<BrowserConnectionInfo | null> {
    try {
      // First, try the HTTP endpoint to get connection info
      const response = await fetch(`http://localhost:${port}/json/version`);
      if (!response.ok) {
        return null;
      }

      const versionInfo = await response.json();
      
      // Then get the list of tabs/pages
      const tabsResponse = await fetch(`http://localhost:${port}/json`);
      if (!tabsResponse.ok) {
        return null;
      }

      const tabs = await tabsResponse.json() as any[];
      
      // Find a suitable page (not an extension or background page)
      const suitableTab = tabs.find((tab: any) => 
        tab.type === 'page' && 
        !tab.url.startsWith('chrome-extension://') &&
        !tab.url.startsWith('chrome://')
      );

      const versionInfoAny = versionInfo as any;

      return {
        webSocketDebuggerUrl: suitableTab?.webSocketDebuggerUrl || versionInfoAny.webSocketDebuggerUrl,
        devtoolsFrontendUrl: suitableTab?.devtoolsFrontendUrl || versionInfoAny.devtoolsFrontendUrl,
        id: suitableTab?.id || versionInfoAny.id,
        title: suitableTab?.title,
        url: suitableTab?.url,
        browserVersion: versionInfoAny['Browser'],
        protocolVersion: versionInfoAny['Protocol-Version'],
        userAgent: versionInfoAny['User-Agent'],
        v8Version: versionInfoAny['V8-Version'],
        webKitVersion: versionInfoAny['WebKit-Version'],
      };
    } catch (error) {
      logger.debug(`Port ${port} not available: ${error}`);
      return null;
    }
  }

  /**
   * Check if a port is available
   */
  static async isPortAvailable(port: number): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${port}/json/version`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get launch instructions for Chrome
   */
  static getLaunchInstructions(port: number = 9222): string[] {
    const instructions = [
      '',
      chalk.yellow('Chrome not found with remote debugging enabled.'),
      chalk.yellow('Launch Chrome with the following flag:'),
      '',
      chalk.cyan(`  --remote-debugging-port=${port}`),
      '',
      chalk.yellow('Examples:'),
      '',
      // macOS
      chalk.gray('# macOS (Chrome):'),
      chalk.cyan(`  /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=${port}`),
      '',
      // Windows
      chalk.gray('# Windows (Chrome):'),
      chalk.cyan(`  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=${port}`),
      '',
      // Linux
      chalk.gray('# Linux (Chrome):'),
      chalk.cyan(`  google-chrome --remote-debugging-port=${port}`),
      '',
      // Chrome Canary/Dev
      chalk.gray('# Or with Chrome Canary/Dev:'),
      chalk.cyan(`  google-chrome-unstable --remote-debugging-port=${port}`),
      '',
      chalk.yellow('Then run your test command again.'),
      '',
    ];

    return instructions;
  }
}

/**
 * Custom error for browser discovery failures
 */
export class BrowserDiscoveryError extends Error {
  constructor() {
    super('Browser debugging endpoint not found');
    this.name = 'BrowserDiscoveryError';
  }

  /**
   * Get user-friendly error message with instructions
   */
  getInstructions(): string[] {
    return BrowserDiscovery.getLaunchInstructions();
  }
}
