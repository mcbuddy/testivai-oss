/**
 * AUTO-GENERATED — DO NOT EDIT.
 *
 * Page-settled probe, emitted from
 *   packages/witness/src/capture/settle.ts
 * by
 *   scripts/generate-element-map-asset.js
 *
 * Polled by each adapter from its host language until `settled` is true or a
 * timeout elapses. Deliberately not network idle — Playwright's own docs mark
 * that DISCOURAGED for testing, and it is the wrong signal for a visual
 * snapshot anyway.
 *
 * Default DOM-quiet threshold: 150ms
 *
 * Call form:
 *   return (<this function>)(document, window, <quietMs>);
 */
function settleProbe(doc, win, quietMs) {
    var KEY = '__testivaiSettleState';
    var state = win[KEY];
    if (!state) {
        state = { last: Date.now() };
        try {
            if (typeof win.MutationObserver === 'function') {
                var observer = new win.MutationObserver(function () {
                    win[KEY].last = Date.now();
                });
                observer.observe(doc.documentElement, {
                    subtree: true,
                    childList: true,
                    attributes: true,
                    characterData: true,
                });
                state.observer = observer;
            }
        }
        catch (e) {
            // No MutationObserver (or a hostile document): quietness degrades to
            // "always quiet" rather than blocking the capture.
        }
        win[KEY] = state;
    }
    var imagesPending = 0;
    try {
        for (var i = 0; i < doc.images.length; i++) {
            if (!doc.images[i].complete)
                imagesPending++;
        }
    }
    catch (e) {
        imagesPending = 0;
    }
    var fontsPending = false;
    try {
        fontsPending = !!(doc.fonts && doc.fonts.status && doc.fonts.status !== 'loaded');
    }
    catch (e) {
        fontsPending = false;
    }
    var ready = doc.readyState === 'complete';
    var quietFor = Date.now() - state.last;
    return {
        ready: ready,
        imagesPending: imagesPending,
        fontsPending: fontsPending,
        quietFor: quietFor,
        settled: ready && imagesPending === 0 && !fontsPending && quietFor >= quietMs,
    };
}
