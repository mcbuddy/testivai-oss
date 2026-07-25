/**
 * Unit tests for the ignoreSelectors helper functions.
 *
 * These functions are pure (no Playwright dependency) and can be tested
 * with a temporary file system + plain Jest — no browser needed.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  readWitnessConfigSelectors,
  collectIgnoreSelectors,
  collectIgnoreRules,
  buildIgnoreSelectorsCSS,
} from '../../config/ignore-selectors';
import { TestivAIProjectConfig } from '../../types';

// ────────────────────────────────────────────────────────────
// Fixtures
// ────────────────────────────────────────────────────────────

const MINIMAL_PROJECT_CONFIG: TestivAIProjectConfig = {
  layout:  { sensitivity: 2, tolerance: 1 },
  ai:      { sensitivity: 2, confidence: 0.7 },
};

function makeProjectConfig(extra?: Record<string, unknown>): TestivAIProjectConfig {
  return { ...MINIMAL_PROJECT_CONFIG, ...extra } as TestivAIProjectConfig;
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testivai-igs-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeWitnessConfig(obj: Record<string, unknown>): void {
  const dir = path.join(tmpDir, '.testivai');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(obj));
}

// ────────────────────────────────────────────────────────────
// readWitnessConfigSelectors
// ────────────────────────────────────────────────────────────

describe('readWitnessConfigSelectors', () => {
  it('returns [] when .testivai/config.json does not exist', () => {
    expect(readWitnessConfigSelectors(tmpDir)).toEqual([]);
  });

  it('returns [] when ignoreSelectors is absent from config', () => {
    writeWitnessConfig({ mode: 'local', threshold: 0.1 });
    expect(readWitnessConfigSelectors(tmpDir)).toEqual([]);
  });

  it('returns [] when ignoreSelectors is not an array', () => {
    writeWitnessConfig({ ignoreSelectors: '.badge' });
    expect(readWitnessConfigSelectors(tmpDir)).toEqual([]);
  });

  it('returns the array when ignoreSelectors is present', () => {
    writeWitnessConfig({ ignoreSelectors: ['.version-badge', '#live-chat'] });
    expect(readWitnessConfigSelectors(tmpDir)).toEqual(['.version-badge', '#live-chat']);
  });

  it('returns [] when config.json is malformed JSON', () => {
    const dir = path.join(tmpDir, '.testivai');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'config.json'), '{ not: valid json }');
    expect(readWitnessConfigSelectors(tmpDir)).toEqual([]);
  });

  it('returns [] when ignoreSelectors is an empty array', () => {
    writeWitnessConfig({ ignoreSelectors: [] });
    expect(readWitnessConfigSelectors(tmpDir)).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────
// collectIgnoreSelectors
// ────────────────────────────────────────────────────────────

describe('collectIgnoreSelectors', () => {
  it('returns [] when all sources are empty', () => {
    const result = collectIgnoreSelectors(tmpDir, MINIMAL_PROJECT_CONFIG, {});
    expect(result).toEqual([]);
  });

  it('picks up selectors from .testivai/config.json only', () => {
    writeWitnessConfig({ ignoreSelectors: ['.badge'] });
    const result = collectIgnoreSelectors(tmpDir, MINIMAL_PROJECT_CONFIG, {});
    expect(result).toEqual(['.badge']);
  });

  it('picks up selectors from project config only', () => {
    const projectConfig = makeProjectConfig({ ignoreSelectors: ['.ads'] });
    const result = collectIgnoreSelectors(tmpDir, projectConfig, {});
    expect(result).toEqual(['.ads']);
  });

  it('picks up selectors from per-snapshot config only', () => {
    const result = collectIgnoreSelectors(tmpDir, MINIMAL_PROJECT_CONFIG, {
      ignoreSelectors: ['#live-chat'],
    });
    expect(result).toEqual(['#live-chat']);
  });

  it('merges selectors from all three sources', () => {
    writeWitnessConfig({ ignoreSelectors: ['.from-witness'] });
    const projectConfig = makeProjectConfig({ ignoreSelectors: ['.from-project'] });
    const result = collectIgnoreSelectors(tmpDir, projectConfig, {
      ignoreSelectors: ['.from-snapshot'],
    });
    expect(result).toEqual(['.from-witness', '.from-project', '.from-snapshot']);
  });

  it('deduplicates selectors that appear in multiple sources', () => {
    writeWitnessConfig({ ignoreSelectors: ['.badge', '.shared'] });
    const projectConfig = makeProjectConfig({ ignoreSelectors: ['.shared', '.ads'] });
    const result = collectIgnoreSelectors(tmpDir, projectConfig, {
      ignoreSelectors: ['.ads'],
    });
    // .shared appears in source-1 and source-2 → keep first occurrence only
    // .ads appears in source-2 and source-3   → keep first occurrence only
    expect(result).toEqual(['.badge', '.shared', '.ads']);
  });

  it('preserves order: witness-config → project-config → per-snapshot', () => {
    writeWitnessConfig({ ignoreSelectors: ['a'] });
    const projectConfig = makeProjectConfig({ ignoreSelectors: ['b'] });
    const result = collectIgnoreSelectors(tmpDir, projectConfig, {
      ignoreSelectors: ['c'],
    });
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('handles undefined ignoreSelectors in per-snapshot config gracefully', () => {
    writeWitnessConfig({ ignoreSelectors: ['.x'] });
    const result = collectIgnoreSelectors(tmpDir, MINIMAL_PROJECT_CONFIG, {
      ignoreSelectors: undefined,
    });
    expect(result).toEqual(['.x']);
  });
});

// ────────────────────────────────────────────────────────────
// buildIgnoreSelectorsCSS
// ────────────────────────────────────────────────────────────

describe('buildIgnoreSelectorsCSS', () => {
  it('returns empty string for an empty array', () => {
    expect(buildIgnoreSelectorsCSS([])).toBe('');
  });

  it('generates visibility:hidden rule for a single selector', () => {
    const css = buildIgnoreSelectorsCSS(['.badge']);
    expect(css).toBe('.badge { visibility: hidden !important; }');
  });

  it('generates one rule per selector separated by newline', () => {
    const css = buildIgnoreSelectorsCSS(['.badge', '#chat', '[data-ignore]']);
    expect(css).toBe(
      '.badge { visibility: hidden !important; }\n' +
      '#chat { visibility: hidden !important; }\n' +
      '[data-ignore] { visibility: hidden !important; }',
    );
  });

  it('uses visibility:hidden (not display:none) so layout is preserved', () => {
    const css = buildIgnoreSelectorsCSS(['.foo']);
    expect(css).toContain('visibility: hidden');
    expect(css).not.toContain('display: none');
  });

  it('includes !important to override existing styles', () => {
    const css = buildIgnoreSelectorsCSS(['.foo']);
    expect(css).toContain('!important');
  });

  it('handles complex selectors: attribute, pseudo-class, descendant', () => {
    const selectors = ['[data-testivai-ignore]', 'header .badge:first-child', 'div > span'];
    const css = buildIgnoreSelectorsCSS(selectors);
    expect(css).toContain('[data-testivai-ignore] { visibility: hidden !important; }');
    expect(css).toContain('header .badge:first-child { visibility: hidden !important; }');
    expect(css).toContain('div > span { visibility: hidden !important; }');
  });
});

// ────────────────────────────────────────────────────────────
// Per-selector modes: mask (default) vs collapse
// ────────────────────────────────────────────────────────────

describe('ignore modes (mask / collapse)', () => {
  it('a bare string defaults to mask (visibility:hidden)', () => {
    const css = buildIgnoreSelectorsCSS(['.badge']);
    expect(css).toBe('.badge { visibility: hidden !important; }');
  });

  it('an object with mode:collapse emits display:none', () => {
    const css = buildIgnoreSelectorsCSS([{ selector: '#footer', mode: 'collapse' }]);
    expect(css).toBe('#footer { display: none !important; }');
  });

  it('an object with mode:mask emits visibility:hidden', () => {
    const css = buildIgnoreSelectorsCSS([{ selector: '#footer', mode: 'mask' }]);
    expect(css).toBe('#footer { visibility: hidden !important; }');
  });

  it('an object without a mode defaults to mask', () => {
    const css = buildIgnoreSelectorsCSS([{ selector: '#footer' }]);
    expect(css).toBe('#footer { visibility: hidden !important; }');
  });

  it('mixes strings and objects in one list', () => {
    const css = buildIgnoreSelectorsCSS(['.badge', { selector: '#footer', mode: 'collapse' }]);
    expect(css).toBe(
      '.badge { visibility: hidden !important; }\n' +
        '#footer { display: none !important; }',
    );
  });

  it('collectIgnoreRules resolves modes and defaults strings to mask', () => {
    writeWitnessConfig({ ignoreSelectors: ['.badge', { selector: '#footer', mode: 'collapse' }] });
    const rules = collectIgnoreRules(tmpDir, MINIMAL_PROJECT_CONFIG, {});
    expect(rules).toEqual([
      { selector: '.badge', mode: 'mask' },
      { selector: '#footer', mode: 'collapse' },
    ]);
  });

  it('collectIgnoreSelectors still returns just selector strings for object entries', () => {
    writeWitnessConfig({ ignoreSelectors: [{ selector: '#footer', mode: 'collapse' }, '.badge'] });
    expect(collectIgnoreSelectors(tmpDir, MINIMAL_PROJECT_CONFIG, {})).toEqual(['#footer', '.badge']);
  });

  it('dedupes by selector across mixed string/object sources (first mode wins)', () => {
    writeWitnessConfig({ ignoreSelectors: [{ selector: '#footer', mode: 'collapse' }] });
    const rules = collectIgnoreRules(tmpDir, MINIMAL_PROJECT_CONFIG, {
      ignoreSelectors: ['#footer'],
    });
    expect(rules).toEqual([{ selector: '#footer', mode: 'collapse' }]);
  });
});

describe('mergeTestConfig mask passthrough', () => {
  // Regression guard: per-call capture options must survive the merge —
  // ignoreSelectors/stabilize were silently dropped once (fixed in 1.3.1);
  // mask must never repeat that bug.
  const { mergeTestConfig } = require('../../config/loader');

  it('per-call mask survives the merge', () => {
    const merged = mergeTestConfig({}, { mask: ['#banner', { top: 24 }] });
    expect(merged.mask).toEqual(['#banner', { top: 24 }]);
  });

  it('absent mask stays undefined (back-compat)', () => {
    const merged = mergeTestConfig({}, { ignoreSelectors: ['.x'] });
    expect(merged.mask).toBeUndefined();
  });
});
