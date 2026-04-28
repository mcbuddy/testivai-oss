import { snapshot } from './snapshot';
import { getCiRunId } from './ci';

export const testivai = {
  witness: snapshot,
  ci: getCiRunId,
};

// Re-export types for convenience
// @renamed: DOMAnalysisConfig → StructureAnalysisConfig, DOMAnalysis → StructureAnalysis (IP protection)
export type { TestivAIConfig, TestivAIProjectConfig, StructureAnalysisConfig, StructureAnalysis } from './types';

// Structure analyzer is now handled on the backend
// The types are kept for backwards compatibility
