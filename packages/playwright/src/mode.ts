import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Read `mode` from .testivai/config.json. Returns null when the file is
 * absent, malformed, or has no recognized mode field.
 */
function configMode(projectRoot: string): 'local' | 'cloud' | null {
  try {
    const cfg = fs.readJsonSync(path.join(projectRoot, '.testivai', 'config.json'));
    if (cfg?.mode === 'local') return 'local';
    if (cfg?.mode === 'cloud') return 'cloud';
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve whether the adapter should run in local mode.
 *
 * Local-first is the zero-config default: with no API key, the adapter
 * captures to `.testivai/temp/<name>/` and writes an HTML report — no cloud,
 * no account, nothing scary. Cloud mode activates only when a key is present.
 *
 * Precedence (first match wins):
 *   1. TESTIVAI_MODE env — explicit override ('local' | 'cloud')
 *   2. .testivai/config.json `mode` — project default
 *   3. TESTIVAI_API_KEY presence — key ⇒ cloud, no key ⇒ local
 *
 * This is deliberately derivable from the shell environment and the config
 * file alone, so it resolves identically in the Playwright main process (the
 * reporter) and in worker processes (the `snapshot()` capture) — env vars set
 * at runtime by the reporter never propagate to already-spawned workers.
 */
export function resolveLocalMode(
  opts: { apiKey?: string; projectRoot?: string } = {},
): boolean {
  const envMode = process.env.TESTIVAI_MODE;
  if (envMode === 'local') return true;
  if (envMode === 'cloud') return false;

  const cfg = configMode(opts.projectRoot ?? process.cwd());
  if (cfg) return cfg === 'local';

  const apiKey = opts.apiKey ?? process.env.TESTIVAI_API_KEY;
  return !apiKey;
}
