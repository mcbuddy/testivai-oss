declare module 'chrome-remote-interface' {
  export interface Client {
    on(event: string, listener: (...args: any[]) => void): void;
    once(event: string, listener: (...args: any[]) => void): void;
    send(method: string, params?: any): Promise<any>;
    close(): Promise<void>;
    Target: {
      getTargets(): Promise<{ targetInfos: any[] }>;
      attachToTarget(params: { targetId: string; flatten?: boolean }): Promise<any>;
      createTarget(params: { url?: string }): Promise<{ targetId: string }>;
      closeTarget(params: { targetId: string }): Promise<void>;
    };
    Page: {
      captureScreenshot(params?: { format?: string; fromSurface?: boolean; captureBeyondViewport?: boolean }): Promise<{ data: string }>;
      addScriptToEvaluateOnNewDocument(params: { source: string }): Promise<any>;
      reload(params?: any): Promise<void>;
      frameNavigated(callback: (params: any) => void): void;
      loadEventFired(callback: () => void): void;
    };
    Runtime: {
      addBinding(params: { name: string }): Promise<void>;
      evaluate(params: { expression: string; returnByValue?: boolean }): Promise<{ result: { value: any } }>;
      bindingCalled(callback: (params: { name: string; payload: string }) => void): void;
      consoleAPICalled(callback: (params: any) => void): void;
      exceptionThrown(callback: (params: { exceptionDetails: any }) => void): void;
    };
    DOM: {
      getDocument(): Promise<{ root: { nodeId: number } }>;
      getOuterHTML(params: { nodeId: number }): Promise<{ outerHTML: string }>;
    };
    Network: {
      requestWillBeSent(callback: (params: any) => void): void;
      responseReceived(callback: (params: any) => void): void;
    };
  }

  export namespace CDP {
    export interface Client extends chrome_remote_interface.Client {}
  }

  export interface CdpOptions {
    target?: string;
    port?: number;
    host?: string;
    local?: boolean;
  }

  export default function CDP(options?: CdpOptions | string): Promise<Client>;
}
