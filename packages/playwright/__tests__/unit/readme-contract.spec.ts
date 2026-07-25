import * as fs from 'fs';
import * as path from 'path';

/**
 * Guards against README ↔ code drift: every `import { ... } from
 * '@testivai/witness-playwright'` shown in the README must resolve to a real
 * export of the BUILT package. This is the class of bug where the docs said
 * `import { snapshot }` while the build only exposed `testivai.witness`.
 *
 * Requires `dist/` to be built first (CI builds before test).
 */
const README = path.join(__dirname, '../../README.md');
const DIST_INDEX = path.join(__dirname, '../../dist/index.js');

function namedImportsFromReadme(source: string): Set<string> {
  const names = new Set<string>();
  const importRe =
    /import\s+\{([^}]+)\}\s+from\s+['"]@testivai\/witness-playwright['"]/g;
  for (const match of source.matchAll(importRe)) {
    match[1]
      .split(',')
      .map((s) => s.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean)
      .forEach((n) => names.add(n));
  }
  return names;
}

describe('README import samples match package exports', () => {
  const readme = fs.readFileSync(README, 'utf-8');
  const names = namedImportsFromReadme(readme);

  it('README documents at least one named import (sanity)', () => {
    expect(names.size).toBeGreaterThan(0);
  });

  it('every README named import exists on the built package', () => {
    if (!fs.existsSync(DIST_INDEX)) {
      throw new Error(
        `${DIST_INDEX} not found — run \`pnpm build\` before the README contract test.`,
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require(DIST_INDEX);
    const missing = [...names].filter((n) => !(n in pkg));
    expect(missing).toEqual([]);
  });
});
