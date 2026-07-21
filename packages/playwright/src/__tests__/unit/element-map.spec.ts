/**
 * Element-map collector — unit tests against a duck-typed DOM.
 * The exact function under test is what gets serialized into the page.
 */

import { collectElementMap, buildElementMapExpression } from '../../capture/element-map';

interface FakeEl {
  tagName: string;
  classList: string[];
  children: FakeEl[];
  parentElement: FakeEl | null;
  rect: { x: number; y: number; width: number; height: number };
  styles: Record<string, string>;
  getBoundingClientRect(): { x: number; y: number; width: number; height: number };
}

function makeEl(
  tag: string,
  rect: { x: number; y: number; width: number; height: number },
  opts: { classes?: string[]; styles?: Record<string, string> } = {},
): FakeEl {
  const el: FakeEl = {
    tagName: tag.toUpperCase(),
    classList: opts.classes ?? [],
    children: [],
    parentElement: null,
    rect,
    styles: opts.styles ?? {},
    getBoundingClientRect() {
      return this.rect;
    },
  };
  return el;
}

function append(parent: FakeEl, ...children: FakeEl[]) {
  for (const c of children) {
    c.parentElement = parent;
    parent.children.push(c);
  }
}

function fakeWindow(dpr = 1) {
  return {
    devicePixelRatio: dpr,
    scrollX: 0,
    scrollY: 0,
    getComputedStyle(el: FakeEl) {
      return {
        getPropertyValue(prop: string) {
          return el.styles[prop] ?? '';
        },
      };
    },
  } as unknown as Window & typeof globalThis;
}

function collect(body: FakeEl, dpr = 1, max = 3000) {
  const doc = { body } as unknown as Document;
  return collectElementMap(doc, fakeWindow(dpr), max);
}

describe('collectElementMap', () => {
  it('builds deterministic paths with classes and nth-of-type only among same-tag siblings', () => {
    const body = makeEl('body', { x: 0, y: 0, width: 800, height: 600 });
    const main = makeEl('main', { x: 0, y: 0, width: 800, height: 600 });
    const card1 = makeEl('div', { x: 0, y: 0, width: 100, height: 50 }, { classes: ['card'] });
    const card2 = makeEl('div', { x: 0, y: 60, width: 100, height: 50 }, { classes: ['card'] });
    const aside = makeEl('aside', { x: 200, y: 0, width: 100, height: 100 });
    append(body, main);
    append(main, card1, card2, aside);

    const map = collect(body);
    const paths = map.map((e) => e.path);
    expect(paths).toEqual([
      'body',
      'body > main',
      'body > main > div.card:nth-of-type(1)',
      'body > main > div.card:nth-of-type(2)',
      'body > main > aside', // only one aside — no nth-of-type
    ]);
  });

  it('skips tiny and zero-size elements', () => {
    const body = makeEl('body', { x: 0, y: 0, width: 800, height: 600 });
    const speck = makeEl('span', { x: 0, y: 0, width: 2, height: 2 });
    const hidden = makeEl('div', { x: 0, y: 0, width: 0, height: 0 });
    const real = makeEl('div', { x: 0, y: 0, width: 50, height: 50 });
    append(body, speck, hidden, real);

    const map = collect(body);
    // nth-of-type counts ALL same-tag siblings (CSS semantics) — the skipped
    // tiny div still occupies position 1, so the real one is :nth-of-type(2)
    expect(map.map((e) => e.path)).toEqual(['body', 'body > div:nth-of-type(2)']);
  });

  it('styleHash is stable for identical styles and differs when a property changes', () => {
    const mk = (color: string) => {
      const body = makeEl('body', { x: 0, y: 0, width: 800, height: 600 });
      const btn = makeEl('button', { x: 0, y: 0, width: 100, height: 40 }, { styles: { color } });
      append(body, btn);
      return collect(body).find((e) => e.path === 'body > button')!;
    };
    expect(mk('rgb(0, 0, 0)').styleHash).toBe(mk('rgb(0, 0, 0)').styleHash);
    expect(mk('rgb(0, 0, 0)').styleHash).not.toBe(mk('rgb(255, 0, 0)').styleHash);
  });

  it('scales rects by devicePixelRatio', () => {
    const body = makeEl('body', { x: 0, y: 0, width: 800, height: 600 });
    const box = makeEl('div', { x: 10, y: 20, width: 50, height: 25 });
    append(body, box);

    const map = collect(body, 2);
    const entry = map.find((e) => e.path === 'body > div')!;
    expect(entry).toMatchObject({ x: 20, y: 40, width: 100, height: 50 });
  });

  it('caps the walk at maxElements', () => {
    const body = makeEl('body', { x: 0, y: 0, width: 800, height: 600 });
    for (let i = 0; i < 50; i++) {
      append(body, makeEl('div', { x: 0, y: i * 10, width: 100, height: 8 + 4 }));
    }
    expect(collect(body, 1, 10)).toHaveLength(10);
  });

  it('serializes to a self-contained page expression', () => {
    const expr = buildElementMapExpression(1234);
    expect(expr).toContain('(document, window, 1234, [])');
    expect(expr).not.toContain('require(');
    expect(expr).not.toContain('exports');
    // Must be valid standalone JS
    expect(() => new Function(`return ${expr.replace('(document, window, 1234, [])', '')}`)).not.toThrow();
  });
});

describe('collectElementMap — exclusions (the ignoreSelectors consistency rule)', () => {
  // ignored = excluded from pixels AND the DOM snapshot AND the element map.
  // Found by dogfooding: an injected badge covered by ignoreSelectors tripped
  // the style fingerprint because its randomized styles were still mapped.
  function makeMatchable(
    tag: string,
    rect: { x: number; y: number; width: number; height: number },
    opts: { classes?: string[]; styles?: Record<string, string> } = {},
  ): FakeEl & { matches(sel: string): boolean } {
    const el = makeEl(tag, rect, opts) as FakeEl & { matches(sel: string): boolean };
    el.matches = (sel: string) => {
      if (sel.startsWith('.')) return el.classList.includes(sel.slice(1));
      throw new Error('unsupported selector in fake');
    };
    return el;
  }

  it('skips elements matching ignoreSelectors (and their subtrees)', () => {
    const body = makeMatchable('body', { x: 0, y: 0, width: 800, height: 600 });
    const badge = makeMatchable('div', { x: 0, y: 0, width: 100, height: 30 }, { classes: ['version-badge'] });
    const inner = makeMatchable('span', { x: 0, y: 0, width: 80, height: 20 });
    const real = makeMatchable('div', { x: 0, y: 100, width: 100, height: 50 }, { classes: ['card'] });
    append(body, badge, real);
    append(badge, inner);

    const doc = { body } as unknown as Document;
    const map = collectElementMap(doc, fakeWindow(), 3000, ['.version-badge']);
    const paths = map.map((e) => e.path);
    expect(paths.some((p) => p.includes('version-badge'))).toBe(false);
    expect(paths.some((p) => p.includes('span'))).toBe(false); // subtree gone too
    expect(paths.some((p) => p.includes('div.card'))).toBe(true);
  });

  it('skips visibility:hidden elements (invisible pixels cannot explain a diff)', () => {
    const body = makeMatchable('body', { x: 0, y: 0, width: 800, height: 600 });
    const hidden = makeMatchable('div', { x: 0, y: 0, width: 100, height: 30 }, { styles: { visibility: 'hidden' } });
    const shown = makeMatchable('div', { x: 0, y: 100, width: 100, height: 50 }, { styles: { visibility: 'visible' } });
    append(body, hidden, shown);

    const doc = { body } as unknown as Document;
    const map = collectElementMap(doc, fakeWindow(), 3000, []);
    expect(map.filter((e) => e.path.startsWith('body > div'))).toHaveLength(1);
  });

  it('an invalid ignore selector never breaks the walk', () => {
    const body = makeMatchable('body', { x: 0, y: 0, width: 800, height: 600 });
    append(body, makeMatchable('div', { x: 0, y: 0, width: 50, height: 50 }));
    const doc = { body } as unknown as Document;
    expect(() => collectElementMap(doc, fakeWindow(), 3000, ['::invalid(('])).not.toThrow();
  });
});
