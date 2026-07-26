---
sidebar_position: 6
title: Stable Baselines
---

# Stable Baselines

Flaky visual tests waste everyone's time. A screenshot that fails because a
third-party ad loaded a different image, or because a font hadn't finished
rendering, is noise — not a regression. This guide covers the built-in tools
that keep your baselines clean and your diffs meaningful, all configurable
from `.testivai/config.json`.

---

## Animation & transition freezing

The SDK **automatically** freezes animations, transitions, and the blinking
caret before every capture. No setup required.

Under the hood, the adapter injects a stabilizing `<style>` block that pauses
CSS animations/transitions and hides the caret, then waits for in-flight web
fonts to finish loading before the shutter fires.

This is controlled by the `stabilize` option — on by default:

```json
{
  "stabilize": true
}
```

Set it to `false` only when you explicitly want to capture mid-animation
states (e.g. a loading spinner snapshot).

---

## `ignoreSelectors` — hide dynamic elements

Some page regions change on every run and are irrelevant to your visual
baseline: timestamps, live-chat widgets, rotating ad banners, "last updated"
badges. `ignoreSelectors` lets you blank those elements before the capture
so they never contribute to the diff.

### Two modes

Every entry in `ignoreSelectors` supports one of two modes, controlling
*how* the element is neutralized:

| Mode | CSS | Effect |
|------|-----|--------|
| `mask` (default) | `visibility: hidden !important` | Blanks the element but **keeps its layout** — the box still occupies space |
| `collapse` | `display: none !important` | **Removes layout influence** — everything below shifts up |

### When to use each

- **`mask`** — for image/avatar/ad content inside a stable-width container.
  The box stays put so the rest of the layout doesn't shift. Ideal for
  `<img>` tags, `<svg>` icons, and inline badges whose container size is
  predictable.
- **`collapse`** — for variable-height dynamic content like a footer whose
  height changes between runs, or an injected alert bar that appears
  sometimes but not always. If you don't remove its layout influence,
  everything below it shifts and the diff lights up.

### Config shapes

All three forms are valid and can be mixed in the same array:

**Bare strings** (default to `mask`):

```json
{
  "ignoreSelectors": ["#live-chat", ".timestamp", "[data-testid='ad-banner']"]
}
```

**Object with explicit mode:**

```json
{
  "ignoreSelectors": [
    { "selector": "#footer", "mode": "collapse" },
    { "selector": ".ad-container", "mode": "mask" }
  ]
}
```

**Mixed array:**

```json
{
  "ignoreSelectors": [
    "#live-chat",
    { "selector": "#footer", "mode": "collapse" },
    ".version-badge",
    { "selector": ".alert-bar", "mode": "collapse" }
  ]
}
```

Selectors are deduplicated across sources (global config, project config,
per-snapshot calls) — the first occurrence wins.

### Where to set them

`ignoreSelectors` can be defined in three places, merged first-write-wins:

1. **`.testivai/config.json`** — global for the repo (recommended for shared
   dynamic chrome)
2. **`testivai.config.ts`** — per-project overrides
3. **Per-snapshot call** — one-off exclusions for a specific `testivai.witness()`

---

## Quick-reference recipe table

| Problem | Fix | Why |
|---------|-----|-----|
| Dynamic text (timestamps, emails, counters, "ago" strings) | `ignoreSelectors` with `mask` | Blanks the text while preserving the surrounding layout |
| Data-dependent table/list heights that vary across runs | `ignoreSelectors` with `collapse` | Removes the element from flow so the rest of the page stays aligned |
| Image/avatar/ad content changing inside a stable container | `ignoreSelectors` with `mask` | Hides the variable content, keeps the container box |
| Cross-machine anti-aliasing or font-rendering differences | Tune `threshold` or enable `noiseAutoPass` | The DOM noise hint already flags these ("pixels differ but DOM unchanged"); let tolerance auto-pass them |

:::tip DOM noise hint
When the pixel diff is non-zero but the DOM is structurally identical, the
report labels the snapshot with a **noise hint**. This usually means font
rendering, sub-pixel anti-aliasing, or GPU-level differences — not a real
visual regression. Use `noiseAutoPass` to let these auto-pass up to a
`noiseMaxDiffPercent` ceiling.
:::

---

## Global config (`.testivai/config.json`)

The `.testivai/config.json` file at your project root is the single source of
truth for local-mode settings. All fields are optional and fall back to safe
defaults.

### Required field

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | `"local"` \| `"cloud"` | `"local"` | Operating mode. Set to `"local"` for offline pixel-diff workflows |

### Diff tolerance

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `threshold` | `number` (0–1) | `0.1` | Per-pixel tolerance. Pixels differing by less than this fraction (0.1 = 10%) are considered identical |
| `maxDiffPercent` | `number` (0–100) | `0` | Snapshots whose total diff percentage is at or below this value report as **passed**. Default 0 = only pixel-perfect passes |
| `maxDiffPixels` | `number` | unset | Absolute variant: pass when changed-pixel count is at or below this. When both are set, satisfying **either** passes |
| `noiseAutoPass` | `boolean` | `false` | Auto-pass diffs whose DOM is structurally identical (the noise hint), up to `noiseMaxDiffPercent` |
| `noiseMaxDiffPercent` | `number` (0–100) | `1` | Upper diff-% bound for `noiseAutoPass`. DOM-identical diffs larger than this still show as changed |
| `diffRegions` | `object` | `{ minSize: 10, mergeDistance: 12 }` | Diff clustering: `minSize` = noise floor in pixels, `mergeDistance` = px gap for merging nearby diff regions |

### Capture behavior

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `stabilize` | `boolean` | `true` | Freeze CSS animations/transitions, hide the caret, and wait for web fonts before every capture |
| `ignoreSelectors` | `(string \| { selector, mode })[]` | `[]` | Elements to hide during capture. Bare strings default to `mask` mode |
| `mask` | `(string \| object)[]` | `[]` | Page areas excluded from the pixel diff and hatched in the report. Supports CSS selectors and geometric regions |

### Output & workflow

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `reportDir` | `string` | `"visual-report"` | Directory for the self-contained HTML diff report |
| `baselinesDir` | `string` | `".testivai/baselines"` | Directory for committed baseline screenshots |
| `autoOpen` | `boolean` | `true` | Automatically open the HTML report in your browser after a run |
| `failOnDiff` | `boolean` | `false` | When `true`, exit with a non-zero code if any diffs are detected (useful in CI) |
| `failOnMissing` | `boolean` | `true` | Exit `3` from `testivai report` when a baseline received no capture this run — silent coverage loss. Set `false` (or pass `--allow-missing`) for filtered runs |
| `shareUploadCommand` | `string` | — | Storage-agnostic upload hook for `report --share`: shell command with `{file}` placeholder; last stdout line is the shared URL (`aws s3 cp …`, `gsutil`, `rclone`, `curl`) |
| `volatileAttributes` | `string[]` | `[]` | Attribute names whose *values* the DOM diff ignores (presence still counts) — for per-run URLs in `src`/`srcset` that otherwise poison the noise hint. `blob:` URLs are always normalized |
| `baselinesDir` | `string` | `.testivai/baselines` | Where baselines live. Supports a `{platform}` token (`darwin`/`linux`/`win32`) for per-OS baselines |

### Complete example

```json
{
  "mode": "local",
  "threshold": 0.1,
  "reportDir": "visual-report",
  "autoOpen": true,
  "failOnDiff": false,
  "stabilize": true,
  "maxDiffPercent": 0,
  "noiseAutoPass": false,
  "noiseMaxDiffPercent": 1,
  "ignoreSelectors": [
    "#live-chat",
    ".timestamp",
    { "selector": "#dynamic-footer", "mode": "collapse" }
  ],
  "mask": [
    "[data-testid='user-avatar']"
  ],
  "diffRegions": {
    "minSize": 10,
    "mergeDistance": 12
  }
}
```

This is the same file that `npx testivai init` scaffolds. Delete any field you
don't need — every key shown above falls back to its default.


## Cross-platform baselines

Font rasterization differs between macOS, Linux, and Windows — a baseline captured on a Mac laptop will flag on a Linux CI runner forever. Two good setups:

**1. One gating platform (simplest).** Let CI (Linux) own the baselines: capture and approve them from CI via the [GitHub Action](/github-action)'s `/testivai approve` flow, and treat local runs as advisory.

**2. Per-platform baselines.** Give each OS its own baseline set with the `{platform}` token:

```json
{
  "baselinesDir": ".testivai/baselines-{platform}"
}
```

Mac devs gate against `baselines-darwin/`, CI gates against `baselines-linux/` — both committed, no cross-OS noise. Remember each platform's baselines must be approved from a run on that platform.

## Volatile attributes

If your app rewrites `src`/`srcset`/`href` per run (CDN hashes, signed URLs), the DOM diff sees `attributeChanges: 1` and withholds the render-noise hint even for pure anti-aliasing diffs. Declare those attributes volatile:

```json
{
  "volatileAttributes": ["src", "srcset"]
}
```

The attribute's *presence* still counts (removing an image is a real change); only its value churn is ignored. `blob:` object URLs are always normalized — they are per-session by construction — while `data:` URIs stay significant because they encode content.
