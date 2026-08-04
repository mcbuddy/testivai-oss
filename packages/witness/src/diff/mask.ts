/**
 * TestivAI Diff Engine — Masking DSL
 *
 * Masks exclude page areas from the pixel diff while staying auditable:
 * every masked region is hatched in the diff output and listed in the
 * report — silent masking is not acceptable.
 *
 * Two shapes:
 *  - CSS selector strings ("#cookie-banner"): geometry is captured by the
 *    adapter at capture time (metadata `maskRects`, via
 *    getBoundingClientRect) because the DOM snapshot carries no layout.
 *    Without captured rects the mask degrades to a warning — never a crash.
 *  - Geometric regions: px numbers, 0–1 ratio numbers, "NN%" strings, or a
 *    single-edge shorthand like { top: 24 } (full-width/height strip).
 */

export type MaskSpec = string | Record<string, number | string>;

/** A selector's geometry as captured by the adapter (metadata maskRects). */
export interface CapturedMaskRect {
  selector: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MaskSource {
  type: 'selector' | 'region' | 'edge';
  /** The original spec (selector string or the raw region object). */
  spec: MaskSpec;
  /** Where the mask came from. */
  origin: 'config' | 'call';
}

/** A mask resolved to concrete pixels on a specific image. */
export interface MaskRect {
  x: number;
  y: number;
  width: number;
  height: number;
  source: MaskSource;
}

type Parsed =
  | { type: 'selector'; selector: string }
  | { type: 'region'; x: Dim; y: Dim; width: Dim; height: Dim }
  | { type: 'edge'; edge: 'top' | 'right' | 'bottom' | 'left'; size: Dim };

/** A dimension before resolution: px count or ratio of the image size. */
type Dim = { kind: 'px'; value: number } | { kind: 'ratio'; value: number };

export type ParseResult =
  | { ok: true; mask: Parsed }
  | { ok: false; error: string };

const EDGES = ['top', 'right', 'bottom', 'left'] as const;
const RECT_KEYS = ['x', 'y', 'width', 'height'] as const;

/**
 * Parse one dimension value: number > =1 → px, 0–1 → ratio, "NN%" → ratio.
 * Returns null for anything else.
 */
function parseDim(value: unknown, allowNegative = false): Dim | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (!allowNegative && value < 0) return null;
    if (value > 0 && value < 1) return { kind: 'ratio', value };
    return { kind: 'px', value };
  }
  if (typeof value === 'string') {
    const m = /^(\d+(?:\.\d+)?)%$/.exec(value.trim());
    if (!m) return null;
    const pct = Number(m[1]);
    return { kind: 'ratio', value: pct / 100 };
  }
  return null;
}

/** Validate a single mask spec. Never throws. */
export function parseMaskSpec(spec: unknown): ParseResult {
  if (typeof spec === 'string') {
    if (spec.trim().length === 0) {
      return { ok: false, error: 'mask: selector must be a non-empty string' };
    }
    return { ok: true, mask: { type: 'selector', selector: spec.trim() } };
  }

  if (spec === null || typeof spec !== 'object' || Array.isArray(spec)) {
    return {
      ok: false,
      error: 'mask: expected a CSS selector string or a region object like { x, y, width, height } or { top: 24 }',
    };
  }

  const obj = spec as Record<string, unknown>;
  const presentEdges = EDGES.filter((e) => obj[e] !== undefined);
  const presentRect = RECT_KEYS.filter((k) => obj[k] !== undefined);

  if (presentEdges.length > 0) {
    if (presentRect.length > 0) {
      return { ok: false, error: 'mask: cannot mix edge shorthands with x/y/width/height' };
    }
    if (presentEdges.length > 1) {
      return {
        ok: false,
        error: `mask: use exactly one edge per shorthand (got ${presentEdges.join(', ')}) — define separate masks instead`,
      };
    }
    const edge = presentEdges[0];
    const size = parseDim(obj[edge]);
    if (!size || size.value < 0) {
      return { ok: false, error: `mask: { ${edge}: … } must be a positive number of px, a 0–1 ratio, or "NN%"` };
    }
    return { ok: true, mask: { type: 'edge', edge, size } };
  }

  if (presentRect.length !== RECT_KEYS.length) {
    const missing = RECT_KEYS.filter((k) => obj[k] === undefined);
    return { ok: false, error: `mask: region object is missing ${missing.join(', ')}` };
  }

  const dims: Partial<Record<(typeof RECT_KEYS)[number], Dim>> = {};
  for (const key of RECT_KEYS) {
    // x/y may legitimately be 0; width/height must end up positive after
    // resolution but a 0-width spec is caught by the zero-area drop.
    const dim = parseDim(obj[key]);
    if (!dim) {
      return { ok: false, error: `mask: ${key} must be a number of px, a 0–1 ratio, or "NN%" (got ${JSON.stringify(obj[key])})` };
    }
    if (dim.value < 0) {
      return { ok: false, error: `mask: ${key} cannot be negative` };
    }
    dims[key] = dim;
  }

  return {
    ok: true,
    mask: { type: 'region', x: dims.x!, y: dims.y!, width: dims.width!, height: dims.height! },
  };
}

function resolveDim(dim: Dim, total: number): number {
  return dim.kind === 'ratio' ? Math.round(dim.value * total) : Math.round(dim.value);
}

function clampRect(
  x: number, y: number, width: number, height: number,
  imgWidth: number, imgHeight: number,
): { x: number; y: number; width: number; height: number } | null {
  const x0 = Math.max(0, Math.min(x, imgWidth));
  const y0 = Math.max(0, Math.min(y, imgHeight));
  const x1 = Math.max(0, Math.min(x + width, imgWidth));
  const y1 = Math.max(0, Math.min(y + height, imgHeight));
  if (x1 <= x0 || y1 <= y0) return null; // zero-area after clamping
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

export interface ResolvedMasks {
  rects: MaskRect[];
  /** Human-readable skips (e.g. selector without captured geometry). */
  warnings: string[];
}

/**
 * Resolve mask specs to concrete pixel rects for one image.
 *
 * @param specs      Mask specs from config and/or per-call options
 * @param imgWidth   Image width in px
 * @param imgHeight  Image height in px
 * @param capturedRects  Selector geometry captured by the adapter
 * @param origin     Where these specs came from (for the audit trail)
 */
export function resolveMasks(
  specs: MaskSpec[],
  imgWidth: number,
  imgHeight: number,
  capturedRects?: CapturedMaskRect[],
  origin: 'config' | 'call' = 'config',
): ResolvedMasks {
  const rects: MaskRect[] = [];
  const warnings: string[] = [];

  for (const spec of specs) {
    const parsed = parseMaskSpec(spec);
    if (!parsed.ok) {
      warnings.push(parsed.error);
      continue;
    }
    const mask = parsed.mask;

    if (mask.type === 'selector') {
      const matches = (capturedRects ?? []).filter((r) => r.selector === mask.selector);
      if (matches.length === 0) {
        warnings.push(
          `mask: no captured geometry for selector "${mask.selector}" — ` +
          `the adapter records mask rects at capture time; this capture has none, so the mask was skipped`,
        );
        continue;
      }
      for (const m of matches) {
        const rect = clampRect(m.x, m.y, m.width, m.height, imgWidth, imgHeight);
        if (rect) {
          rects.push({ ...rect, source: { type: 'selector', spec: mask.selector, origin } });
        }
      }
      continue;
    }

    if (mask.type === 'edge') {
      const size = resolveDim(mask.size, mask.edge === 'top' || mask.edge === 'bottom' ? imgHeight : imgWidth);
      const raw =
        mask.edge === 'top' ? { x: 0, y: 0, width: imgWidth, height: size } :
        mask.edge === 'bottom' ? { x: 0, y: imgHeight - size, width: imgWidth, height: size } :
        mask.edge === 'left' ? { x: 0, y: 0, width: size, height: imgHeight } :
        { x: imgWidth - size, y: 0, width: size, height: imgHeight };
      const rect = clampRect(raw.x, raw.y, raw.width, raw.height, imgWidth, imgHeight);
      if (rect) rects.push({ ...rect, source: { type: 'edge', spec: spec as MaskSpec, origin } });
      continue;
    }

    const rect = clampRect(
      resolveDim(mask.x, imgWidth),
      resolveDim(mask.y, imgHeight),
      resolveDim(mask.width, imgWidth),
      resolveDim(mask.height, imgHeight),
      imgWidth, imgHeight,
    );
    if (rect) rects.push({ ...rect, source: { type: 'region', spec: spec as MaskSpec, origin } });
  }

  return { rects, warnings };
}

/**
 * Equalize masked pixels (copy candidate → baseline) so the diff loop sees
 * no difference there. Mutates baseline in place; callers clone first.
 */
export function applyMaskRects(
  baseline: Uint8Array | Uint8ClampedArray,
  candidate: Uint8Array | Uint8ClampedArray,
  width: number,
  _height: number,
  rects: MaskRect[],
): void {
  for (const r of rects) {
    for (let y = r.y; y < r.y + r.height; y++) {
      const rowOffset = y * width * 4;
      for (let x = r.x; x < r.x + r.width; x++) {
        const i = rowOffset + x * 4;
        baseline[i] = candidate[i];
        baseline[i + 1] = candidate[i + 1];
        baseline[i + 2] = candidate[i + 2];
        baseline[i + 3] = candidate[i + 3];
      }
    }
  }
}

/** Hatch stripe period in px. */
const HATCH_PERIOD = 8;
/** Hatch color: mid gray, ~55% alpha — visible on light and dark diffs. */
const HATCH_RGBA: [number, number, number, number] = [128, 128, 128, 140];

/**
 * Draw a diagonal hatch pattern over masked areas of the diff image so
 * masking is always visible in review. Only pixels inside mask rects are
 * touched.
 */
export function hatchMaskRects(
  diff8: Uint8Array | Uint8ClampedArray,
  width: number,
  _height: number,
  rects: MaskRect[],
): void {
  for (const r of rects) {
    for (let y = r.y; y < r.y + r.height; y++) {
      const rowOffset = y * width * 4;
      for (let x = r.x; x < r.x + r.width; x++) {
        const onStripe = (x + y) % HATCH_PERIOD === 0;
        const onBorder =
          x === r.x || x === r.x + r.width - 1 || y === r.y || y === r.y + r.height - 1;
        if (!onStripe && !onBorder) continue;
        const i = rowOffset + x * 4;
        diff8[i] = HATCH_RGBA[0];
        diff8[i + 1] = HATCH_RGBA[1];
        diff8[i + 2] = HATCH_RGBA[2];
        diff8[i + 3] = HATCH_RGBA[3];
      }
    }
  }
}
