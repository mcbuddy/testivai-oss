/**
 * @jest-environment node
 * 
 * Tests for the renamed Structure Analyzer module.
 * @renamed Was `domAnalyzer.spec.js` — renamed to match the new public API (IP protection)
 * 
 * Terminology mapping:
 *   analyzeDOM()          → analyzeStructure()
 *   compareDOMAnalysis()  → compareStructureAnalysis()
 *   DOMAnalysis           → StructureAnalysis
 *   DOMChange             → StructureChange
 *   DOMAnalysisConfig     → StructureAnalysisConfig
 */

describe('Structure Analyzer', () => {
  // Mock the page.evaluate method for testing
  const mockPage = {
    evaluate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('analyzeStructure() should generate structure fingerprint and analysis', async () => {
    // Mock the page.evaluate to return structure analysis
    mockPage.evaluate.mockResolvedValue({
      fingerprint: 'dGVzdCBmaW5nZXJwcmludA==', // base64 encoded
      structure: {
        totalElements: 10,
        elementTypes: { html: 1, body: 1, div: 3, p: 2, button: 1 },
        maxDepth: 3,
        interactiveElements: {
          buttons: 1,
          inputs: 0,
          links: 0,
          forms: 0,
        },
      },
      semantic: {
        headings: { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 },
        landmarks: {
          hasHeader: false,
          hasNav: false,
          hasMain: false,
          hasFooter: false,
          hasAside: false,
        },
        lists: { ordered: 0, unordered: 0 },
        tables: 0,
        images: 0,
      },
    });

    const { analyzeStructure } = require('../../src/structureAnalyzer');
    const result = await analyzeStructure(mockPage, {
      enableFingerprint: true,
      enableStructure: true,
      enableSemantic: true,
    });

    expect(result.fingerprint).toBe('dGVzdCBmaW5nZXJwcmludA==');
    expect(result.structure.totalElements).toBe(10);
    expect(result.semantic.headings.h1).toBe(0);
  });

  test('compareStructureAnalysis() should detect changes between baseline and current', () => {
    const { compareStructureAnalysis } = require('../../src/structureAnalyzer');
    
    const baseline = {
      fingerprint: 'abc123',
      structure: {
        totalElements: 10,
        elementTypes: { div: 3, p: 2 },
      },
      semantic: {
        headings: { h1: 1, h2: 2 },
        landmarks: { hasHeader: true, hasNav: false },
      },
    };

    const current = {
      fingerprint: 'def456',
      structure: {
        totalElements: 12,
        elementTypes: { div: 3, p: 2, span: 2 },
      },
      semantic: {
        headings: { h1: 1, h2: 2 },
        landmarks: { hasHeader: true, hasNav: true },
      },
    };

    const changes = compareStructureAnalysis(baseline, current);

    expect(changes.length).toBeGreaterThanOrEqual(3);
    expect(changes[0].type).toBe('fingerprint');
    expect(changes[0].severity).toBe('high');
    expect(changes.some(c => c.type === 'structure')).toBe(true);
    expect(changes.some(c => c.type === 'semantic')).toBe(true);
  });

  test('analyzeStructure() should handle empty configuration', async () => {
    mockPage.evaluate.mockResolvedValue({
      fingerprint: 'base64hash',
    });

    const { analyzeStructure } = require('../../src/structureAnalyzer');
    const result = await analyzeStructure(mockPage);

    expect(result.fingerprint).toBe('base64hash');
    expect(mockPage.evaluate).toHaveBeenCalled();
  });

  test('compareStructureAnalysis() should return empty array when analyses are identical', () => {
    const { compareStructureAnalysis } = require('../../src/structureAnalyzer');
    
    const analysis = {
      fingerprint: 'same_hash',
      structure: {
        totalElements: 5,
        elementTypes: { div: 3, p: 2 },
      },
      semantic: {
        headings: { h1: 1 },
        landmarks: { hasHeader: true, hasNav: false },
      },
    };

    const changes = compareStructureAnalysis(analysis, analysis);
    expect(changes.length).toBe(0);
  });

  test('compareStructureAnalysis() should detect fingerprint-only changes', () => {
    const { compareStructureAnalysis } = require('../../src/structureAnalyzer');
    
    const baseline = { fingerprint: 'hash_a' };
    const current = { fingerprint: 'hash_b' };

    const changes = compareStructureAnalysis(baseline, current);
    expect(changes.length).toBe(1);
    expect(changes[0].type).toBe('fingerprint');
    expect(changes[0].severity).toBe('high');
    expect(changes[0].description).toBe('Page structure has changed');
  });

  test('compareStructureAnalysis() should detect removed element types', () => {
    const { compareStructureAnalysis } = require('../../src/structureAnalyzer');
    
    const baseline = {
      structure: {
        totalElements: 10,
        elementTypes: { div: 3, p: 2, span: 1 },
      },
    };
    const current = {
      structure: {
        totalElements: 9,
        elementTypes: { div: 3, p: 2 },
      },
    };

    const changes = compareStructureAnalysis(baseline, current);
    expect(changes.some(c => c.description.includes('Removed element types: span'))).toBe(true);
  });

  test('compareStructureAnalysis() should detect added element types', () => {
    const { compareStructureAnalysis } = require('../../src/structureAnalyzer');
    
    const baseline = {
      structure: {
        totalElements: 5,
        elementTypes: { div: 3 },
      },
    };
    const current = {
      structure: {
        totalElements: 7,
        elementTypes: { div: 3, button: 2 },
      },
    };

    const changes = compareStructureAnalysis(baseline, current);
    expect(changes.some(c => c.description.includes('Added element types: button'))).toBe(true);
  });

  test('compareStructureAnalysis() should detect landmark changes', () => {
    const { compareStructureAnalysis } = require('../../src/structureAnalyzer');
    
    const baseline = {
      semantic: {
        headings: {},
        landmarks: { hasHeader: false, hasNav: false },
      },
    };
    const current = {
      semantic: {
        headings: {},
        landmarks: { hasHeader: true, hasNav: false },
      },
    };

    const changes = compareStructureAnalysis(baseline, current);
    expect(changes.some(c => c.type === 'semantic' && c.description.includes('hasHeader'))).toBe(true);
  });

  test('structureAnalyzer exports are available (old domAnalyzer deleted)', () => {
    const mod = require('../../src/structureAnalyzer');
    expect(typeof mod.analyzeStructure).toBe('function');
    expect(typeof mod.compareStructureAnalysis).toBe('function');
  });
});
