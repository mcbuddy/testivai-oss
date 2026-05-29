/**
 * Helpers for the ignoreSelectors feature.
 *
 * Three sources, merged with deduplication (last-write-wins dedup via Set):
 *   1. .testivai/config.json     — global OSS config (`ignoreSelectors` array)
 *   2. testivai.config.ts/js     — power-user project config (`ignoreSelectors`)
 *   3. testivai.witness() call   — per-snapshot override (`ignoreSelectors`)
 *
 * These functions are pure (no Playwright dependency) so they can be
 * exercised in plain Jest unit tests without a browser.
 */

import * as fs from 'fs';
import * as path from 'path';
import { TestivAIConfig, TestivAIProjectConfig } from '../types';

/**
 * Read ignoreSelectors from `.testivai/config.json`.
 * Returns `[]` when the file doesn't exist or is malformed.
 *
 * @param projectRoot  Directory that contains the `.testivai/` folder
 */
export function readWitnessConfigSelectors(projectRoot: string): string[] {
  try {
    const configPath = path.join(projectRoot, '.testivai', 'config.json');
    if (!fs.existsSync(configPath)) return [];
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return Array.isArray(raw.ignoreSelectors) ? raw.ignoreSelectors : [];
  } catch {
    return [];
  }
}

/**
 * Collect and deduplicate ignoreSelectors from all three sources.
 *
 * Order of precedence for deduplication: earlier sources win (Set preserves
 * insertion order, so the first occurrence of any selector survives).
 *
 * @param projectRoot    Path to the project root (where `.testivai/` lives)
 * @param projectConfig  Loaded `testivai.config.ts` project config
 * @param effectiveConfig  Merged per-snapshot TestivAIConfig
 */
export function collectIgnoreSelectors(
  projectRoot: string,
  projectConfig: TestivAIProjectConfig,
  effectiveConfig: TestivAIConfig,
): string[] {
  const fromWitnessConfig = readWitnessConfigSelectors(projectRoot);
  const fromProjectConfig: string[] = (projectConfig as any).ignoreSelectors ?? [];
  const fromSnapshot: string[] = effectiveConfig.ignoreSelectors ?? [];
  return [...new Set([...fromWitnessConfig, ...fromProjectConfig, ...fromSnapshot])];
}

/**
 * Build a `<style>` tag content that hides every given selector via
 * `visibility: hidden !important`.
 *
 * Returns an empty string when the selectors list is empty so callers can
 * guard with `if (css)` before calling `page.addStyleTag`.
 */
export function buildIgnoreSelectorsCSS(selectors: string[]): string {
  if (selectors.length === 0) return '';
  return selectors.map(s => `${s} { visibility: hidden !important; }`).join('\n');
}
