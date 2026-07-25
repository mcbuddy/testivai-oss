import { snapshot } from './snapshot';
import { getCiRunId } from './ci';

// Named export — the form the README and examples use:
//   import { snapshot } from '@testivai/witness-playwright';
// `testivai.witness` is kept as an equivalent alias for existing callers.
export { snapshot };

export const testivai = {
  witness: snapshot,
  ci: getCiRunId,
};

// Re-export types for convenience
// @renamed: DOMAnalysisConfig → StructureAnalysisConfig, DOMAnalysis → StructureAnalysis (IP protection)
export type { TestivAIConfig, TestivAIProjectConfig, StructureAnalysisConfig, StructureAnalysis } from './types';

// Structure analyzer is now handled on the backend
// The types are kept for backwards compatibility
