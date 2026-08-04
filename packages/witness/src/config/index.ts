/**
 * TestivAI Configuration
 */

export {
  loadLocalConfig,
  createDefaultConfig,
  localConfigExists,
  getConfigPath,
  getDefaultConfig,
} from './local-config';

export type { LocalConfig } from './local-config';

export { validateLocalConfig } from './validate-config';
export type { ConfigValidation } from './validate-config';
