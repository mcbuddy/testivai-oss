/**
 * Helpers for the ignoreSelectors feature.
 *
 * Three sources, merged with deduplication (first-write-wins via selector key):
 *   1. .testivai/config.json     — global OSS config (`ignoreSelectors` array)
 *   2. testivai.config.ts/js     — power-user project config (`ignoreSelectors`)
 *   3. testivai.witness() call   — per-snapshot override (`ignoreSelectors`)
 *
 * Each entry is a bare CSS selector string (defaults to `mask` mode) or an
 * object `{ selector, mode }` where mode is:
 *   - `mask`     (default) → visibility:hidden — blank the box, keep layout
 *   - `collapse`           → display:none      — remove layout influence
 *
 * These functions are pure (no Playwright dependency) so they can be
 * exercised in plain Jest unit tests without a browser.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  TestivAIConfig,
  TestivAIProjectConfig,
  IgnoreMode,
  IgnoreSelectorInput,
} from '../types';

/** A fully-resolved ignore entry with an explicit mode. */
export interface IgnoreRule {
  selector: string;
  mode: IgnoreMode;
}

/** Normalize one raw entry to a rule, or null when it's unusable. */
function toRule(input: IgnoreSelectorInput | IgnoreRule): IgnoreRule | null {
  if (typeof input === 'string') {
    return input ? { selector: input, mode: 'mask' } : null;
  }
  if (input && typeof input.selector === 'string' && input.selector) {
    return {
      selector: input.selector,
      mode: input.mode === 'collapse' ? 'collapse' : 'mask',
    };
  }
  return null;
}

/**
 * Read raw ignoreSelectors from `.testivai/config.json`.
 * Returns `[]` when the file doesn't exist, is malformed, or the field is not
 * an array. Entries are returned as-authored (strings and/or objects).
 *
 * @param projectRoot  Directory that contains the `.testivai/` folder
 */
export function readWitnessConfigSelectors(projectRoot: string): IgnoreSelectorInput[] {
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
 * Collect and deduplicate ignore rules (with modes) from all three sources.
 * Earlier sources win on duplicate selectors (insertion order preserved).
 *
 * @param projectRoot    Path to the project root (where `.testivai/` lives)
 * @param projectConfig  Loaded `testivai.config.ts` project config
 * @param effectiveConfig  Merged per-snapshot TestivAIConfig
 */
export function collectIgnoreRules(
  projectRoot: string,
  projectConfig: TestivAIProjectConfig,
  effectiveConfig: TestivAIConfig,
): IgnoreRule[] {
  const merged: IgnoreSelectorInput[] = [
    ...readWitnessConfigSelectors(projectRoot),
    ...(projectConfig.ignoreSelectors ?? []),
    ...(effectiveConfig.ignoreSelectors ?? []),
  ];

  const seen = new Set<string>();
  const rules: IgnoreRule[] = [];
  for (const item of merged) {
    const rule = toRule(item);
    if (rule && !seen.has(rule.selector)) {
      seen.add(rule.selector);
      rules.push(rule);
    }
  }
  return rules;
}

/**
 * Collect and deduplicate ignore selector strings from all three sources.
 *
 * Mode-agnostic: returns just the selectors, used where only the "which
 * elements" question matters (DOM/text signal and the element map exclude
 * ignored elements regardless of mask vs collapse).
 */
export function collectIgnoreSelectors(
  projectRoot: string,
  projectConfig: TestivAIProjectConfig,
  effectiveConfig: TestivAIConfig,
): string[] {
  return collectIgnoreRules(projectRoot, projectConfig, effectiveConfig).map(
    (r) => r.selector,
  );
}

/**
 * Build `<style>` content that neutralizes every entry before capture.
 * `mask` → `visibility: hidden !important` (layout preserved);
 * `collapse` → `display: none !important` (layout removed).
 *
 * Accepts bare strings (treated as `mask`) or resolved rules, so both the raw
 * config shape and `collectIgnoreRules()` output work. Returns an empty string
 * for an empty list so callers can guard with `if (css)`.
 */
export function buildIgnoreSelectorsCSS(
  items: Array<IgnoreSelectorInput | IgnoreRule>,
): string {
  const lines: string[] = [];
  for (const item of items) {
    const rule = toRule(item);
    if (!rule) continue;
    const decl =
      rule.mode === 'collapse'
        ? 'display: none !important;'
        : 'visibility: hidden !important;';
    lines.push(`${rule.selector} { ${decl} }`);
  }
  return lines.join('\n');
}
