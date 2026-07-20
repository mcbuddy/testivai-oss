/**
 * Element-map capture — the layout + computed-style digest that powers
 * element attribution, shift classification, and the style fingerprint
 * on the comparison side (@testivai/witness).
 *
 * `collectElementMap` is a SELF-CONTAINED function (no imports, no
 * closures) so it can be serialized into the page with
 * `(${collectElementMap.toString()})(document, window, max)` — and unit
 * tested in Node against a duck-typed DOM. Keep it dependency-free.
 */

export interface CollectedElement {
  path: string;
  x: number;
  y: number;
  width: number;
  height: number;
  styleHash: string;
}

/**
 * Walk the document and produce [{path, rect, styleHash}] in document
 * coordinates (DPR-scaled to match full-page screenshot pixels).
 *
 * - `path` is deterministic: tag + first class + :nth-of-type when the
 *   element has same-tag element siblings.
 * - Elements smaller than 4×4 px and invisible elements are skipped.
 * - The walk is depth-first and capped at `maxElements`.
 * - `styleHash` digests a fixed, documented list of computed properties
 *   (FNV-1a 32-bit, hex) — deterministic for identical rendering.
 */
export function collectElementMap(
  doc: Document,
  win: Window & typeof globalThis,
  maxElements: number,
): CollectedElement[] {
  var STYLE_PROPS = [
    'color', 'background-color', 'background-image',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'border-top-style', 'border-bottom-style', 'border-radius',
    'font-family', 'font-size', 'font-weight', 'font-style', 'line-height',
    'text-align', 'text-transform', 'letter-spacing',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'display', 'opacity', 'visibility', 'box-shadow',
  ];

  function fnv1a(str: string): string {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  function segment(el: Element): string {
    var tag = el.tagName.toLowerCase();
    var cls = '';
    if (el.classList && el.classList.length > 0) {
      cls = '.' + el.classList[0];
    }
    var parent = el.parentElement;
    if (!parent) return tag + cls;
    var sameTag = 0;
    var index = 0;
    for (var i = 0; i < parent.children.length; i++) {
      var sib = parent.children[i];
      if (sib.tagName === el.tagName) {
        sameTag++;
        if (sib === el) index = sameTag;
      }
    }
    return sameTag > 1 ? tag + cls + ':nth-of-type(' + index + ')' : tag + cls;
  }

  function pathOf(el: Element, stopAt: Element): string {
    var parts: string[] = [];
    var node: Element | null = el;
    while (node && node !== stopAt.parentElement) {
      parts.unshift(segment(node));
      node = node.parentElement;
    }
    return parts.join(' > ');
  }

  var dpr = win.devicePixelRatio || 1;
  var scrollX = win.scrollX || 0;
  var scrollY = win.scrollY || 0;
  var out: CollectedElement[] = [];
  var body = doc.body;
  if (!body) return out;

  var stack: Element[] = [body];
  while (stack.length > 0 && out.length < maxElements) {
    var el = stack.pop() as Element;
    var rect = el.getBoundingClientRect();
    if (rect.width >= 4 && rect.height >= 4) {
      var styleParts: string[] = [];
      try {
        var cs = win.getComputedStyle(el);
        for (var p = 0; p < STYLE_PROPS.length; p++) {
          styleParts.push(STYLE_PROPS[p] + ':' + cs.getPropertyValue(STYLE_PROPS[p]));
        }
      } catch (e) {
        // styleHash stays a digest of the empty string — still deterministic
      }
      out.push({
        path: pathOf(el, body),
        x: Math.round((rect.x + scrollX) * dpr),
        y: Math.round((rect.y + scrollY) * dpr),
        width: Math.round(rect.width * dpr),
        height: Math.round(rect.height * dpr),
        styleHash: fnv1a(styleParts.join(';')),
      });
    }
    // Push children in reverse so the walk stays document-ordered
    for (var c = el.children.length - 1; c >= 0; c--) {
      stack.push(el.children[c]);
    }
  }
  return out;
}

/** Default element cap — bounds capture time and elements.json size. */
export const DEFAULT_MAX_ELEMENTS = 3000;

/**
 * The page-side expression evaluated by the adapter. Serializes the
 * collector so page code and unit-tested code are the same function.
 */
export function buildElementMapExpression(maxElements: number = DEFAULT_MAX_ELEMENTS): string {
  return `(${collectElementMap.toString()})(document, window, ${maxElements})`;
}
