import { BrowserClient } from '../browser/client';
import { BrowserConnectionInfo } from '../types';

// Mock chrome-remote-interface
jest.mock('chrome-remote-interface', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock the discovery module
jest.mock('../browser/discovery', () => ({
  BrowserDiscovery: {
    discover: jest.fn(),
  },
}));

import CDP from 'chrome-remote-interface';
import { BrowserDiscovery } from '../browser/discovery';

describe('BrowserClient', () => {
  let client: BrowserClient;
  let mockBrowserClient: any;

  beforeEach(() => {
    client = new BrowserClient();
    
    // Create mock browser client
    mockBrowserClient = {
      on: jest.fn(),
      close: jest.fn(),
      send: jest.fn(),
    };

    // Mock CDP constructor
    (CDP as jest.MockedFunction<typeof CDP>).mockResolvedValue(mockBrowserClient);

    // Mock discovery
    const mockConnectionInfo: BrowserConnectionInfo = {
      webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/123',
      devtoolsFrontendUrl: 'http://localhost:9222/devtools/inspector.html',
      id: '123',
      browserVersion: '90.0.4430.212',
    };
    (BrowserDiscovery.discover as jest.Mock).mockResolvedValue(mockConnectionInfo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to browser successfully', async () => {
      await client.connect(9222);

      expect(BrowserDiscovery.discover).toHaveBeenCalledWith(9222);
      expect(CDP).toHaveBeenCalledWith({
        target: 'ws://localhost:9222/devtools/page/123',
      });
      expect(mockBrowserClient.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockBrowserClient.on).toHaveBeenCalledWith('event', expect.any(Function));
    });

    it('should retry connection on failure', async () => {
      // First two attempts fail
      (BrowserDiscovery.discover as jest.Mock)
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({
          webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/123',
          devtoolsFrontendUrl: 'http://localhost:9222/devtools/inspector.html',
          id: '123',
        });

      await client.connect(9222);

      expect(BrowserDiscovery.discover).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      (BrowserDiscovery.discover as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      await expect(client.connect(9222)).rejects.toThrow('Connection failed');
      expect(BrowserDiscovery.discover).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });
  });

  describe('disconnect', () => {
    it('should disconnect from browser', async () => {
      await client.connect(9222);
      await client.disconnect();

      expect(mockBrowserClient.close).toHaveBeenCalled();
      expect(client.isClientConnected()).toBe(false);
    });

    it('should handle disconnect when not connected', async () => {
      await client.disconnect();

      // Should not throw
      expect(mockBrowserClient.close).not.toHaveBeenCalled();
    });
  });

  describe('send', () => {
    beforeEach(async () => {
      await client.connect(9222);
    });

    it('should send command successfully', async () => {
      mockBrowserClient.send.mockResolvedValue({ result: 'success' });

      const result = await client.send('Test.method', { param: 'value' });

      expect(mockBrowserClient.send).toHaveBeenCalledWith('Test.method', { param: 'value' });
      expect(result).toEqual({ result: 'success' });
    });

    it('should throw error when not connected', async () => {
      await client.disconnect();

      await expect(client.send('Test.method')).rejects.toThrow('Not connected to browser');
    });

    it('should propagate browser errors', async () => {
      mockBrowserClient.send.mockRejectedValue(new Error('Browser error'));

      await expect(client.send('Test.method')).rejects.toThrow('Browser error');
    });
  });

  describe('enableDomain', () => {
    beforeEach(async () => {
      await client.connect(9222);
    });

    it('should enable domain', async () => {
      await client.enableDomain('Page');

      expect(mockBrowserClient.send).toHaveBeenCalledWith('Page.enable');
    });
  });

  describe('event handling', () => {
    beforeEach(async () => {
      await client.connect(9222);
    });

    it('should emit disconnect event', () => {
      const disconnectSpy = jest.fn();
      client.on('disconnect', disconnectSpy);

      // Simulate disconnect
      const disconnectCallback = mockBrowserClient.on.mock.calls.find(
        (call: any[]) => call[0] === 'disconnect'
      )?.[1];
      if (disconnectCallback) {
        disconnectCallback();
      }

      expect(disconnectSpy).toHaveBeenCalled();
      expect(client.isClientConnected()).toBe(false);
    });

    it('should emit browser events', () => {
      const eventSpy = jest.fn();
      client.on('event', eventSpy);

      // Simulate browser event
      const eventCallback = mockBrowserClient.on.mock.calls.find(
        (call: any[]) => call[0] === 'event'
      )?.[1];
      if (eventCallback) {
        eventCallback('Page.loadEventFired', {});
      }

      expect(eventSpy).toHaveBeenCalledWith('Page.loadEventFired', {});
    });
  });
});
