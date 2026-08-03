import { snapshot } from './snapshot';

// `witness` is the canonical capture call — it aligns with the package
// family (@testivai/witness*) and the other adapters (browser.witness,
// python's witness). The forms below are equivalent; `snapshot` and
// `testivai.witness` are kept as compatible aliases for existing callers:
//   import { witness } from '@testivai/witness-playwright';
//   await witness(page, testInfo, 'homepage');
export { snapshot, snapshot as witness };

export const testivai = {
  witness: snapshot,
};

// Re-export types for convenience
export type { TestivAIConfig, TestivAIProjectConfig, IgnoreMode, IgnoreSelectorInput } from './types';
