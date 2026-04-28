# Cutover Runbook: `testivai-monorepo` → `testivai-oss`

This document is the operational runbook for **retiring the SDK source from `testivai-monorepo`** and switching it to consume the published OSS packages from `testivai-oss`.

> `testivai-monorepo` is **not** being renamed — it keeps its name and all non-SDK code (apps, infra, etc.). Only the SDK source folders move out.

## Prerequisites

- [ ] CI green in `testivai-oss` (build + unit tests + pack dry-run + smoke E2E)
- [ ] Manual Phase 8B verification: `cd testivai-demo-app && npm run test:oss` passes locally against linked OSS packages
- [ ] npm publish credentials available to the maintainer(s)
- [ ] GitHub repo `testivai/testivai-oss` created and `main` pushed
- [ ] All monorepo consumers inventoried (see "Consumers" below)

## Phase 9.1 — Publish under `next`

From `testivai-oss`:

```bash
# Ensure clean build
pnpm clean && pnpm install --frozen-lockfile && pnpm build && pnpm test && pnpm pack:dry

# Publish under `next` tag (order matters: common → witness → playwright)
pnpm --filter @testivai/common publish --tag next --access public
pnpm --filter @testivai/witness publish --tag next --access public
pnpm --filter @testivai/witness-playwright publish --tag next --access public
```

Record the published versions.

## Phase 9.2 — Switch monorepo consumers to `next`

In `testivai-monorepo`, find every package.json that depends on:
- `@testivai/common`
- `@testivai/witness`
- `@testivai/witness-playwright`
- `file:` or `workspace:` links to the SDK source

Replace with the published `next` version. Then:

```bash
pnpm install
pnpm -r run build
pnpm -r run test
```

### Consumers to update (as of extraction)

- `apps/*` (any app importing the SDKs)
- `testivai-demo-app` (external repo, but uses published packages)
- Any internal tooling that `require`s from `sdks/*` directly

## Phase 9.3 — Remove SDK source from `testivai-monorepo`

Once the `next` versions are validated:

```bash
cd testivai-monorepo
git rm -r sdks/witness sdks/js/playwright sdks/common sdks/testivai-action
# Update pnpm-workspace.yaml to drop those paths if listed
# Update any root scripts that referenced them
git commit -m "chore: remove SDK source; now consumed from testivai-oss"
```

## Phase 9.4 — Update monorepo CI

- Drop jobs that build/test/publish the SDK packages
- Drop pack-validation steps for the SDKs
- Keep the rest of the monorepo CI unchanged

## Phase 9.5 — Update monorepo docs

- Point contributors to `testivai-oss` for SDK changes
- Update the monorepo README to describe the new source-of-truth boundary
- The public `docs-site` can continue sourcing from its existing docs, or be updated to reflect the `testivai-oss/docs/` subset

## Phase 9.6 — Promote `next` → `latest`

After 24–72 hours of `next` stability:

```bash
npm dist-tag add @testivai/common@<v> latest
npm dist-tag add @testivai/witness@<v> latest
npm dist-tag add @testivai/witness-playwright@<v> latest
```

Update consumer package.jsons to use the stable version without the `next` tag.

## Rollback

If `next` reveals a critical issue:
1. Keep the monorepo SDK source in place (don't run Phase 9.3)
2. Fix in `testivai-oss`, publish a new `next`
3. Only proceed with Phase 9.3 once validated

Once Phase 9.3 has been executed and pushed, rollback requires restoring from git history; this is why we publish under `next` first.

## Definition of Done

- [ ] `testivai-oss` packages published under `latest`
- [ ] `testivai-monorepo` builds and tests green against published packages
- [ ] SDK source folders removed from `testivai-monorepo`
- [ ] `testivai-demo-app` `test:oss` lane passing against published packages
- [ ] Public announcement made (README, changelog, marketing site)
