/**
 * Types for the TestivAI Playwright adapter
 */

/**
 * How an ignored selector is neutralized before capture:
 * - `mask`     — `visibility: hidden` (default): the box is blanked but keeps
 *                its layout, so surrounding elements don't shift.
 * - `collapse` — `display: none`: the element is removed from layout entirely,
 *                so variable-height ignored content (e.g. a dynamic footer)
 *                stops shifting everything below it.
 */
export type IgnoreMode = 'mask' | 'collapse';

/**
 * An ignoreSelectors entry: a plain CSS selector string (defaults to `mask`
 * mode), or an object choosing the mode per selector.
 */
export type IgnoreSelectorInput =
  | string
  | { selector: string; mode?: IgnoreMode };

/**
 * Project-level configuration, loaded from `testivai.config.ts` /
 * `testivai.config.js` in the project root. Everything here can also be set
 * in `.testivai/config.json`; this file exists for setups that prefer a
 * typed config module.
 */
export interface TestivAIProjectConfig {
  /**
   * CSS selectors for elements to hide during screenshot capture.
   * Merged with `.testivai/config.json` and per-snapshot values.
   */
  ignoreSelectors?: IgnoreSelectorInput[];
  /** Stabilize captures (disable animations, hide caret, wait for fonts). Default: true. */
  stabilize?: boolean;
}

/**
 * Per-snapshot configuration overrides
 */
export interface TestivAIConfig {
  /** Use browser capture for full-page screenshots (default: true, set to false for scroll-and-stitch) */
  useBrowserCapture?: boolean;
  /**
   * CSS selectors for elements to hide during screenshot capture.
   * Elements are set to `visibility: hidden` before the screenshot is taken and
   * restored immediately after — so dynamic content (version badges, timestamps,
   * ads, live clocks) never contributes to the pixel diff.
   *
   * Can also be set globally in `.testivai/config.json` under `ignoreSelectors`.
   * Per-snapshot values are merged with (not replaced by) the global list.
   *
   * Example: ["[data-testivai-ignore]", ".version-badge", "#live-chat-widget"]
   *
   * Entries may also be objects to choose a per-selector mode, e.g.
   * [{ selector: "#footer", mode: "collapse" }] to remove layout influence.
   * A bare string defaults to "mask" (visibility:hidden, layout preserved).
   */
  ignoreSelectors?: IgnoreSelectorInput[];
  /**
   * Stabilize the page before capture: disable CSS animations/transitions,
   * hide the text caret, and wait for web fonts to finish loading — the top
   * causes of flaky visual diffs. Default: true.
   *
   * Can also be set globally in `.testivai/config.json` under `stabilize`
   * or in `testivai.config.ts`. Per-snapshot values win.
   */
  stabilize?: boolean;
  /**
   * Masks for this snapshot: areas excluded from the pixel diff and
   * hatched in the report (auditable — never silent). Each entry is a
   * CSS selector string (geometry recorded at capture time) or a
   * geometric region — px numbers, 0–1 ratios, "NN%" strings, or a
   * single-edge shorthand like { top: 24 }.
   *
   * Merged with the global `mask` list from `.testivai/config.json`.
   * Unlike `ignoreSelectors` (which hides elements during capture),
   * masks act at comparison time and stay visible in the diff output.
   */
  mask?: Array<string | Record<string, number | string>>;
}
