/**
 * Capture stabilization — neutralize the top causes of flaky visual diffs
 * before a screenshot is taken:
 *
 *   1. CSS animations & transitions (elements caught mid-motion)
 *   2. The blinking text caret
 *   3. Web fonts still loading (fallback font rendered in the capture)
 *   4. Smooth scrolling still settling
 *
 * Resolution order for the on/off switch (first defined wins):
 *   1. per-snapshot  testivai.witness(..., { stabilize })
 *   2. project       testivai.config.ts → stabilize
 *   3. global        .testivai/config.json → stabilize
 *   4. default       true
 */

import {
  buildSettleProbeExpression,
  SETTLE_STOP_EXPRESSION,
  DEFAULT_QUIET_MS,
  DEFAULT_SETTLE_TIMEOUT_MS,
} from '@testivai/witness';
import * as fs from 'fs';
import * as path from 'path';
import type { Page } from '@playwright/test';
import { TestivAIConfig, TestivAIProjectConfig } from '../types';

/**
 * CSS injected for the duration of the capture. Near-zero durations (not
 * `none`) let every animation/transition COMPLETE instantly at its final
 * state — pages whose content starts hidden and reveals via entry
 * animations or class transitions render fully. (`animation: none` would
 * freeze them at the hidden initial state.)
 */
export const STABILIZE_CSS = `*, *::before, *::after {
  animation-duration: 0.001s !important;
  animation-delay: 0s !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.001s !important;
  transition-delay: 0s !important;
  caret-color: transparent !important;
  scroll-behavior: auto !important;
}`;

/** Read the global `stabilize` flag from `.testivai/config.json`, if set. */
export function readWitnessConfigStabilize(projectRoot: string): boolean | undefined {
  try {
    const configPath = path.join(projectRoot, '.testivai', 'config.json');
    if (!fs.existsSync(configPath)) return undefined;
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return typeof raw.stabilize === 'boolean' ? raw.stabilize : undefined;
  } catch {
    return undefined;
  }
}

/** Resolve the effective stabilize flag across all three config sources. */
export function resolveStabilize(
  projectRoot: string,
  projectConfig: TestivAIProjectConfig,
  testConfig?: TestivAIConfig,
): boolean {
  if (typeof testConfig?.stabilize === 'boolean') return testConfig.stabilize;
  if (typeof projectConfig.stabilize === 'boolean') return projectConfig.stabilize;
  const fromWitnessConfig = readWitnessConfigStabilize(projectRoot);
  if (typeof fromWitnessConfig === 'boolean') return fromWitnessConfig;
  return true;
}

/**
 * Wait for web fonts to finish loading, bounded at 3s so a hanging font
 * request can never stall the capture. Best-effort: errors are swallowed —
 * a missing FontFaceSet API just means no wait.
 */
export async function waitForFonts(page: Page): Promise<void> {
  try {
    await page.evaluate(() =>
      Promise.race([
        (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready,
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]),
    );
  } catch {
    // Page navigated or evaluate failed — capture proceeds unstabilized fonts
  }
}

/**
 * Wait until the page has stopped changing: document complete, images
 * finished, fonts loaded, and no DOM mutations for `quietMs`.
 *
 * Deliberately NOT `networkidle` — Playwright's own docs mark that DISCOURAGED
 * for testing, and it is the wrong signal for a visual snapshot: a page with
 * analytics beacons never goes quiet, while a network-idle page can still be
 * animating. What matters is whether the rendered page settled.
 *
 * Always bounded; a page that never settles yields a capture, not a hang.
 */
export async function waitForSettled(
  page: { evaluate: (expr: string) => Promise<unknown> },
  quietMs: number = DEFAULT_QUIET_MS,
  timeoutMs: number = DEFAULT_SETTLE_TIMEOUT_MS,
): Promise<void> {
  const expr = buildSettleProbeExpression(quietMs);
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    let state: { settled?: boolean } | undefined;
    try {
      state = (await page.evaluate(expr)) as { settled?: boolean };
    } catch {
      return; // probe unavailable — never block the capture
    }
    // An unusable answer means we cannot probe; polling to the timeout would
    // add the full wait to every capture.
    if (!state || typeof state.settled !== 'boolean') return;
    if (state.settled) return;
    if (Date.now() >= deadline) {
      if (process.env.TESTIVAI_DEBUG === 'true') {
        console.log(`[TestivAI] page did not settle within ${timeoutMs}ms — capturing anyway`);
      }
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/** Detach the settle observer so it does not linger on the page under test. */
export async function stopSettleObserver(page: {
  evaluate: (expr: string) => Promise<unknown>;
}): Promise<void> {
  try {
    await page.evaluate(SETTLE_STOP_EXPRESSION);
  } catch {
    // best-effort cleanup
  }
}
