#!/usr/bin/env node
import * as fs from 'fs';
import { z, type ZodRawShape } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { resolvePaths, readResults, verdictFor, resolveImage, listBaselines, downscalePng, approveSnapshot, approveAll } from './lib';

const packageJson = require('../package.json');

// Project root: --root <path> flag or cwd (MCP clients set cwd to the workspace).
const rootFlag = process.argv.indexOf('--root');
const projectRoot = rootFlag !== -1 && process.argv[rootFlag + 1] ? process.argv[rootFlag + 1] : process.cwd();

const server = new McpServer({ name: 'testivai', version: packageJson.version });

server.registerTool(
  'get_visual_results',
  {
    title: 'Get visual test results',
    description:
      'Read the latest TestivAI visual regression results (visual-report/results.json). ' +
      'Returns a per-snapshot verdict combining the pixel diff and the DOM signal: ' +
      'DOM-identical diffs are likely render noise; DOM changes are real and need human review. ' +
      'Run the test suite first (e.g. `npx playwright test`) if results are stale or missing.',
    inputSchema: {},
  },
  async () => {
    const paths = resolvePaths(projectRoot);
    const results = readResults(paths);
    if (!results) {
      return {
        content: [
          {
            type: 'text',
            text: `No results found at ${paths.reportDir}/results.json. Run the visual tests first (e.g. npx playwright test).`,
          },
        ],
      };
    }
    const lines = [
      `Run: ${results.timestamp} — ${results.summary.total} snapshots: ${results.summary.passed} passed, ${results.summary.changed} changed, ${results.summary.newSnapshots} new.`,
      '',
      ...results.snapshots.map((s) => `- ${s.name}: ${verdictFor(s)}`),
      '',
      'Baseline approval is a human decision: suggest `/testivai approve <name>` on the PR (or `npx testivai approve` locally); do not approve autonomously.',
    ];
    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
);

// Shared handler for the diff-image tools (registered under two names).
const snapshotDiffHandler = async ({ name }: { name: string }) => {
  const paths = resolvePaths(projectRoot);
  const results = readResults(paths);
  const snapshot = results?.snapshots.find((s) => s.name === name);
  if (!results || !snapshot) {
    return { content: [{ type: 'text', text: `No snapshot named "${name}" in the latest results.` }] };
  }
  const content: Array<{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }> = [
    { type: 'text', text: `${snapshot.name}: ${verdictFor(snapshot)}` },
  ];
  for (const [label, rel] of [
    ['baseline', snapshot.baselinePath],
    ['current', snapshot.currentPath],
    ['diff', snapshot.diffPath],
  ] as const) {
    const abs = rel ? resolveImage(paths, rel) : null;
    if (abs) {
      const raw = fs.readFileSync(abs);
      const downscaled = downscalePng(raw);
      const wasDownscaled =
        downscaled.originalWidth !== downscaled.width ||
        downscaled.originalHeight !== downscaled.height;
      const textLabel = wasDownscaled
        ? `${label} (downscaled from ${downscaled.originalWidth}x${downscaled.originalHeight}):`
        : `${label}:`;
      content.push({ type: 'text', text: textLabel });
      content.push({ type: 'image', data: downscaled.data.toString('base64'), mimeType: 'image/png' });
    }
  }
  return { content };
};

const diffToolMeta = {
  title: 'View snapshot diff images',
  description:
    'Return the baseline, current, and diff images for one changed snapshot so you can see what changed visually. ' +
    'Use get_report / get_visual_results first to find snapshot names.',
  inputSchema: { name: z.string().describe('Snapshot name from the results') },
};

// registerTool is called through an untyped alias: zod@3.25 + TS 6 blow the
// type-depth limit (TS2589) when inferring the schema generics. Runtime
// validation of the input schema is unaffected.
// `get_diff` is the canonical name; `get_snapshot_diff` is kept as an alias.
(server.registerTool as Function)('get_diff', diffToolMeta, snapshotDiffHandler);
(server.registerTool as Function)('get_snapshot_diff', diffToolMeta, snapshotDiffHandler);

// get_report — the raw results.json payload (the public schema) for agents
// that want to parse structured data rather than the human summary.
server.registerTool(
  'get_report',
  {
    title: 'Get the raw visual report (results.json)',
    description:
      'Return the machine-readable results.json payload verbatim (summary + per-snapshot status, diff %, ' +
      'DOM signal, and region→selector attribution). Parse this instead of scraping CLI output.',
    inputSchema: {},
  },
  async () => {
    const results = readResults(resolvePaths(projectRoot));
    if (!results) {
      return { content: [{ type: 'text', text: 'No results found. Run the visual tests first (e.g. npx playwright test).' }] };
    }
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }
);

// approve_snapshot / approve_all — promote current captures to committed
// baselines. Approval accepts a new visual truth, so only call these once a
// reviewer has confirmed the change is intended (not a regression).
(server.registerTool as Function)(
  'approve_snapshot',
  {
    title: 'Approve one snapshot as the new baseline',
    description:
      'Promote .testivai/temp/<name>/ to the committed baseline (same as `testivai approve <name>`). ' +
      'Only approve changes a reviewer has confirmed are intended; then commit .testivai/baselines/.',
    inputSchema: { name: z.string().describe('Snapshot name to approve') },
  },
  async ({ name }: { name: string }) => {
    const result = approveSnapshot(projectRoot, name);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);

server.registerTool(
  'approve_all',
  {
    title: 'Approve all pending snapshots as baselines',
    description:
      'Promote every pending capture under .testivai/temp/ to committed baselines (same as `testivai approve --all`). ' +
      'Only run this after a reviewer has confirmed the changes; then commit .testivai/baselines/.',
    inputSchema: {},
  },
  async () => {
    const result = approveAll(projectRoot);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);

server.registerTool(
  'list_baselines',
  {
    title: 'List committed baselines',
    description: 'List the snapshot baselines committed under .testivai/baselines/.',
    inputSchema: {},
  },
  async () => {
    const names = listBaselines(projectRoot);
    return {
      content: [
        {
          type: 'text',
          text: names.length ? `Baselines (${names.length}):\n${names.map((n) => `- ${n}`).join('\n')}` : 'No baselines yet — the first test run creates them.',
        },
      ],
    };
  }
);

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error('testivai-mcp failed to start:', err);
  process.exit(1);
});
