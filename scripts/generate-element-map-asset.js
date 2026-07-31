#!/usr/bin/env node
/**
 * Generates the canonical element-map collector as a plain-JS asset for the
 * adapters that cannot import TypeScript: the Python package and the Java
 * library.
 *
 * WHY THIS EXISTS
 * ---------------
 * The collector is injected into the page and its output (`elements.json`)
 * is compared across runs — and, because every adapter shares one
 * `.testivai/baselines/` directory, potentially across LANGUAGES. A Python
 * lane and a Java lane writing subtly different maps for the same page would
 * produce phantom diffs that look like real regressions. Hand-maintained
 * copies drift silently; this generator makes drift impossible to commit
 * unnoticed, because CI regenerates and fails on any diff.
 *
 * SOURCE OF TRUTH: packages/witness/src/capture/element-map.ts
 *
 * Usage:
 *   pnpm build && node scripts/generate-element-map-asset.js
 *   node scripts/generate-element-map-asset.js --check   (CI: no writes, exit 1 on drift)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'packages/witness/dist/capture/element-map.js');

if (!fs.existsSync(DIST)) {
  console.error(
    'error: built collector not found at packages/witness/dist/capture/element-map.js\n' +
      '       run `pnpm --filter @testivai/witness build` first.',
  );
  process.exit(1);
}

const { collectElementMap, DEFAULT_MAX_ELEMENTS } = require(DIST);

const SETTLE_DIST = path.join(ROOT, 'packages/witness/dist/capture/settle.js');
const { settleProbe, DEFAULT_QUIET_MS } = fs.existsSync(SETTLE_DIST) ? require(SETTLE_DIST) : {};

if (typeof collectElementMap !== 'function') {
  console.error('error: collectElementMap is not a function — build output looks wrong.');
  process.exit(1);
}

const BANNER = `/**
 * AUTO-GENERATED — DO NOT EDIT.
 *
 * Canonical element-map collector, emitted from
 *   packages/witness/src/capture/element-map.ts
 * by
 *   scripts/generate-element-map-asset.js
 *
 * Every TestivAI adapter injects this exact function so that element maps
 * are identical across languages sharing one baseline directory. Edit the
 * TypeScript source and re-run the generator; CI fails if this file is
 * stale.
 *
 * Default element cap: ${DEFAULT_MAX_ELEMENTS}
 *
 * Call form (each adapter wraps it the same way):
 *   return (<this function>)(document, window, <maxElements>, <ignoreSelectors>);
 */
`;

const asset = BANNER + collectElementMap.toString() + '\n';

const SETTLE_BANNER = `/**
 * AUTO-GENERATED — DO NOT EDIT.
 *
 * Page-settled probe, emitted from
 *   packages/witness/src/capture/settle.ts
 * by
 *   scripts/generate-element-map-asset.js
 *
 * Polled by each adapter from its host language until \`settled\` is true or a
 * timeout elapses. Deliberately not network idle — Playwright's own docs mark
 * that DISCOURAGED for testing, and it is the wrong signal for a visual
 * snapshot anyway.
 *
 * Default DOM-quiet threshold: ${DEFAULT_QUIET_MS}ms
 *
 * Call form:
 *   return (<this function>)(document, window, <quietMs>);
 */
`;
const settleAsset = settleProbe ? SETTLE_BANNER + settleProbe.toString() + '\n' : null;

/** Where the asset must land for each language's packaging to pick it up. */
const SETTLE_TARGETS = [
  path.join(ROOT, 'python/src/testivai/settle.js'),
  path.join(ROOT, 'java/src/main/resources/ai/testiv/testivai/settle.js'),
  path.join(ROOT, 'ruby/lib/testivai/settle.js'),
];

const TARGETS = [
  // Python: shipped as package data (see pyproject.toml [tool.setuptools.package-data])
  path.join(ROOT, 'python/src/testivai/element_map.js'),
  // Java: shipped as a classpath resource, read with getResourceAsStream
  path.join(ROOT, 'java/src/main/resources/ai/testiv/testivai/element-map.js'),
  // Ruby: shipped inside the gem's lib/ and read relative to __dir__
  path.join(ROOT, 'ruby/lib/testivai/element_map.js'),
];

const check = process.argv.includes('--check');
let drifted = false;

const ALL = settleAsset
  ? [...TARGETS.map((t) => [t, asset]), ...SETTLE_TARGETS.map((t) => [t, settleAsset])]
  : TARGETS.map((t) => [t, asset]);

for (const [target, contents] of ALL) {
  const rel = path.relative(ROOT, target);
  // Read-or-null rather than exists-then-read: no window between the check
  // and the use, and a missing file is exactly the "not generated yet" case.
  let existing = null;
  try {
    existing = fs.readFileSync(target, 'utf-8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  if (existing === contents) {
    console.log(`  ok      ${rel}`);
    continue;
  }

  if (check) {
    drifted = true;
    console.error(`  STALE   ${rel}`);
    continue;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
  console.log(`  ${existing === null ? 'created' : 'updated'} ${rel}`);
}

if (drifted) {
  console.error(
    '\nThe generated element-map assets are out of date.\n' +
      'Run:  pnpm build && node scripts/generate-element-map-asset.js\n' +
      'and commit the result.',
  );
  process.exit(1);
}
