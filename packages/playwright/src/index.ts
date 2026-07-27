import { snapshot } from './snapshot';
import { getCiRunId } from './ci';

// `witness` is the canonical capture call — it aligns with the package
// family (@testivai/witness*) and the other adapters (browser.witness,
// python's witness). The forms below are equivalent; `snapshot` and
// `testivai.witness` are kept as compatible aliases for existing callers:
//   import { witness } from '@testivai/witness-playwright';
//   await witness(page, testInfo, 'homepage');
export { snapshot, snapshot as witness };

export const testivai = {
  witness: snapshot,
  ci: getCiRunId,
};

// Re-export types for convenience
// @renamed: DOMAnalysisConfig → StructureAnalysisConfig, DOMAnalysis → StructureAnalysis (IP protection)
export type { TestivAIConfig, TestivAIProjectConfig, StructureAnalysisConfig, StructureAnalysis } from './types';

// Structure analyzer is now handled on the backend
// The types are kept for backwards compatibility
