/**
 * Headless Chrome launcher for standalone witness mode.
 *
 * `testivai witness <url>` must work with zero setup, so when no debuggable
 * Chrome is already running we launch our own headless instance and clean it
 * up afterwards. Resolution order for the executable:
 *
 *   1. TESTIVAI_CHROME_PATH env var (also how CI points at a Playwright/
 *      puppeteer-downloaded Chromium)
 *   2. Well-known platform install paths
 *   3. Names on PATH (google-chrome, chromium, ...)
 */

import { spawn, type ChildProcess, execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as http from 'http';
import { logger } from '../utils/logger';

const MAC_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
];
const LINUX_NAMES = ['google-chrome', 'google-chrome-stable', 'chromium-browser', 'chromium'];
const WIN_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

export function findChrome(): string | null {
  const fromEnv = process.env.TESTIVAI_CHROME_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  const candidates =
    process.platform === 'darwin' ? MAC_PATHS : process.platform === 'win32' ? WIN_PATHS : [];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  if (process.platform !== 'win32') {
    for (const name of LINUX_NAMES) {
      try {
        const found = execFileSync('which', [name], { encoding: 'utf-8' }).trim();
        if (found) return found;
      } catch {
        // not on PATH — try the next name
      }
    }
  }
  return null;
}

export interface LaunchedChrome {
  port: number;
  kill: () => void;
}

/** Wait until the DevTools endpoint answers, up to timeoutMs. */
async function waitForDevtools(port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await new Promise<boolean>((resolve) => {
      const req = http.get({ host: '127.0.0.1', port, path: '/json/version', timeout: 1000 }, (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

/**
 * Launch a throwaway headless Chrome with remote debugging enabled.
 * Uses a temp profile so the user's browser state is never touched.
 */
export async function launchChrome(executable: string, port: number): Promise<LaunchedChrome> {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-chrome-'));

  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-networking',
    '--hide-scrollbars',
    'about:blank',
  ];

  logger.debug(`Launching Chrome: ${executable}`);
  const child: ChildProcess = spawn(executable, args, { stdio: 'ignore' });

  const kill = (): void => {
    try {
      child.kill('SIGKILL');
    } catch {
      // already gone
    }
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // best-effort temp cleanup
    }
  };

  const ready = await waitForDevtools(port, 12_000);
  if (!ready) {
    kill();
    throw new Error(
      `Chrome did not open its debugging endpoint on port ${port} within 12s. ` +
        `Set TESTIVAI_CHROME_PATH to a working Chrome/Chromium binary if the auto-detected one is broken.`,
    );
  }

  return { port, kill };
}
