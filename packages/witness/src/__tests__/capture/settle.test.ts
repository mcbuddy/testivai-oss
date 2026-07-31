/**
 * Page-settled probe.
 *
 * Tested against a duck-typed DOM, and — importantly — by evaluating the
 * SERIALISED expression, since that string is what actually ships to the
 * browser and to the Python/Java/Ruby adapters.
 */

import {
  settleProbe,
  buildSettleProbeExpression,
  SETTLE_STOP_EXPRESSION,
  SETTLE_STATE_KEY,
  DEFAULT_QUIET_MS,
} from '../../capture/settle';

type Doc = Parameters<typeof settleProbe>[0];
type Win = Parameters<typeof settleProbe>[1];

function fakeDom(over: Partial<{ ready: string; images: boolean[]; fonts: string }> = {}) {
  const doc = {
    readyState: over.ready ?? 'complete',
    documentElement: {},
    images: (over.images ?? [true]).map((complete) => ({ complete })),
    fonts: { status: over.fonts ?? 'loaded' },
  } as unknown as Doc;

  let mutate: (() => void) | null = null;
  const win = {
    MutationObserver: function (cb: () => void) {
      mutate = cb;
      return { observe: () => {}, disconnect: () => {} };
    },
  } as unknown as Win;

  return { doc, win, fire: () => mutate?.() };
}

describe('settleProbe', () => {
  it('reports what is still pending', () => {
    const { doc, win } = fakeDom({ ready: 'loading', images: [false, true, false], fonts: 'loading' });

    const s = settleProbe(doc, win, DEFAULT_QUIET_MS);

    expect(s.ready).toBe(false);
    expect(s.imagesPending).toBe(2);
    expect(s.fontsPending).toBe(true);
    expect(s.settled).toBe(false);
  });

  it('is not settled while an image is still loading', () => {
    const { doc, win } = fakeDom({ images: [true, false] });
    expect(settleProbe(doc, win, 0).settled).toBe(false);
  });

  // `complete` is true for a failed image, so a broken URL must not hang us.
  it('treats a failed image as finished', () => {
    const { doc, win } = fakeDom({ images: [true] });
    expect(settleProbe(doc, win, 0).imagesPending).toBe(0);
  });

  it('settles once everything is done and the DOM is quiet', () => {
    const { doc, win } = fakeDom();
    settleProbe(doc, win, 0); // installs the observer
    expect(settleProbe(doc, win, 0).settled).toBe(true);
  });

  it('un-settles when the DOM mutates', () => {
    const { doc, win, fire } = fakeDom();
    settleProbe(doc, win, 0);
    expect(settleProbe(doc, win, 0).settled).toBe(true);

    fire();

    const after = settleProbe(doc, win, 50);
    expect(after.quietFor).toBeLessThan(50);
    expect(after.settled).toBe(false);
  });

  it('reuses one observer across polls', () => {
    let constructed = 0;
    const doc = fakeDom().doc;
    const win = {
      MutationObserver: function (cb: () => void) {
        constructed++;
        return { observe: () => {}, disconnect: () => {} };
      },
    } as unknown as Win;

    settleProbe(doc, win, 0);
    settleProbe(doc, win, 0);
    settleProbe(doc, win, 0);

    expect(constructed).toBe(1);
  });

  it('degrades to quiet when MutationObserver is unavailable', () => {
    const { doc } = fakeDom();
    const win = {} as unknown as Win; // no MutationObserver

    const s = settleProbe(doc, win, 0);

    expect(s.settled).toBe(true);
  });

  it('survives a document that throws on access', () => {
    const doc = {
      readyState: 'complete',
      documentElement: {},
      get images(): never {
        throw new Error('hostile');
      },
      fonts: { status: 'loaded' },
    } as unknown as Doc;

    expect(() => settleProbe(doc, fakeDom().win, 0)).not.toThrow();
  });

  describe('serialised expression — what actually ships', () => {
    it('evaluates in a bare JS context', () => {
      const expr = buildSettleProbeExpression(0);
      const fn = new Function('document', 'window', `return ${expr}`);
      const { doc, win } = fakeDom({ images: [false] });

      const s = fn(doc, win);

      expect(s.imagesPending).toBe(1);
      expect(s.settled).toBe(false);
    });

    it('embeds the quiet threshold', () => {
      expect(buildSettleProbeExpression(250)).toContain('250');
    });

    it('has a stop expression that disconnects and clears the global', () => {
      let disconnected = false;
      const win: Record<string, unknown> = {
        [SETTLE_STATE_KEY]: { last: 0, observer: { disconnect: () => (disconnected = true) } },
      };
      new Function('window', SETTLE_STOP_EXPRESSION.replace('(window)', '(window)'))(win);

      expect(disconnected).toBe(true);
      expect(win[SETTLE_STATE_KEY]).toBeUndefined();
    });
  });
});
