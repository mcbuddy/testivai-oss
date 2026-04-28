/**
 * @jest-environment node
 * 
 * Tests to verify that all renamed types are correctly exported
 * and that the public API no longer exposes internal 5-layer terminology.
 * 
 * Terminology mapping verified:
 *   DOMData              → StructureData
 *   DOMAnalysis          → StructureAnalysis
 *   DOMAnalysisConfig    → StructureAnalysisConfig
 *   DOMChange            → StructureChange
 *   CSSData              → StylesData
 *   SnapshotPayload.dom  → SnapshotPayload.structure
 *   SnapshotPayload.css  → SnapshotPayload.styles
 *   TestivAIConfig.dom   → TestivAIConfig.structure
 */

import type {
  StructureData,
  StructureAnalysis,
  StructureAnalysisConfig,
  StructureChange,
  StylesData,
  SnapshotPayload,
  TestivAIConfig,
  TestivAIProjectConfig,
  LayoutData,
} from '../../src/types';

describe('Renamed SDK Types', () => {
  describe('StructureData (was DOMData)', () => {
    test('should have html field', () => {
      const data: StructureData = { html: '<div>test</div>' };
      expect(data.html).toBe('<div>test</div>');
    });

    test('should accept optional styles field', () => {
      const data: StructureData = { html: '<div/>', styles: { color: 'red' } };
      expect(data.styles).toEqual({ color: 'red' });
    });
  });

  describe('StylesData (was CSSData)', () => {
    test('should have computed_styles field', () => {
      const data: StylesData = {
        computed_styles: {
          'div.container': { color: 'rgb(0,0,0)', 'font-size': '16px' },
        },
      };
      expect(Object.keys(data.computed_styles)).toHaveLength(1);
    });
  });

  describe('StructureAnalysis (was DOMAnalysis)', () => {
    test('should accept fingerprint', () => {
      const analysis: StructureAnalysis = { fingerprint: 'abc123' };
      expect(analysis.fingerprint).toBe('abc123');
    });

    test('should accept structure info', () => {
      const analysis: StructureAnalysis = {
        structure: {
          totalElements: 10,
          elementTypes: { div: 5 },
          maxDepth: 3,
          interactiveElements: { buttons: 1, inputs: 0, links: 2, forms: 0 },
        },
      };
      expect(analysis.structure!.totalElements).toBe(10);
    });

    test('should accept semantic info', () => {
      const analysis: StructureAnalysis = {
        semantic: {
          headings: { h1: 1 },
          landmarks: {
            hasHeader: true,
            hasNav: false,
            hasMain: true,
            hasFooter: false,
            hasAside: false,
          },
          lists: { ordered: 0, unordered: 1 },
          tables: 0,
          images: 2,
        },
      };
      expect(analysis.semantic!.landmarks.hasHeader).toBe(true);
    });
  });

  describe('StructureAnalysisConfig (was DOMAnalysisConfig)', () => {
    test('should accept all config fields', () => {
      const config: StructureAnalysisConfig = {
        enableFingerprint: true,
        enableStructure: true,
        enableSemantic: false,
        ignoreAttributes: ['data-testid'],
        ignoreElements: ['script'],
        ignoreContentPatterns: [/\d+/],
      };
      expect(config.enableFingerprint).toBe(true);
      expect(config.ignoreAttributes).toEqual(['data-testid']);
    });
  });

  describe('StructureChange (was DOMChange)', () => {
    test('should have correct shape', () => {
      const change: StructureChange = {
        type: 'fingerprint',
        severity: 'high',
        description: 'Page structure has changed',
        details: { baseline: 'a', current: 'b' },
      };
      expect(change.type).toBe('fingerprint');
      expect(change.severity).toBe('high');
    });

    test('should accept all change types', () => {
      const types: StructureChange['type'][] = ['fingerprint', 'structure', 'semantic', 'component'];
      types.forEach(type => {
        const change: StructureChange = { type, severity: 'low', description: 'test' };
        expect(change.type).toBe(type);
      });
    });
  });

  describe('SnapshotPayload field renames', () => {
    test('should use "structure" field (was "dom")', () => {
      const payload: Partial<SnapshotPayload> = {
        structure: { html: '<div/>' },
        snapshotName: 'test',
        testName: 'test',
        timestamp: Date.now(),
      };
      expect(payload.structure!.html).toBe('<div/>');
    });

    test('should use "styles" field (was "css")', () => {
      const payload: Partial<SnapshotPayload> = {
        styles: { computed_styles: { 'div': { color: 'red' } } },
      };
      expect(payload.styles!.computed_styles['div'].color).toBe('red');
    });

    test('should use "structureAnalysis" field (was "domAnalysis")', () => {
      const payload: Partial<SnapshotPayload> = {
        structureAnalysis: { fingerprint: 'test_hash' },
      };
      expect(payload.structureAnalysis!.fingerprint).toBe('test_hash');
    });
  });

  describe('TestivAIConfig field renames', () => {
    test('should use "structure" field (was "dom")', () => {
      const config: TestivAIConfig = {
        structure: {
          enableFingerprint: true,
          enableStructure: false,
        },
        layout: { sensitivity: 2 },
      };
      expect(config.structure!.enableFingerprint).toBe(true);
    });
  });

  describe('TestivAIProjectConfig field renames', () => {
    test('should use "structure" field (was "dom")', () => {
      const config: TestivAIProjectConfig = {
        layout: { sensitivity: 2, tolerance: 1 },
        ai: { sensitivity: 2, confidence: 0.7 },
        structure: {
          enableFingerprint: true,
        },
      };
      expect(config.structure!.enableFingerprint).toBe(true);
    });
  });
});
