package ai.testiv.testivai;

import org.openqa.selenium.JavascriptExecutor;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Page-settled probe: "has this page stopped changing?"
 *
 * <p>{@code settle.js} on the classpath is GENERATED from
 * {@code packages/witness/src/capture/settle.ts}, so every language polls the
 * identical predicate.
 *
 * <p>Deliberately NOT network idle. Playwright's own documentation marks that
 * DISCOURAGED for testing, and it is the wrong signal for a visual snapshot
 * anyway — a page with analytics beacons never goes quiet, while a network-idle
 * page can still be animating. What matters is whether the rendered page
 * stopped changing.
 */
final class Settle {

  static final int DEFAULT_QUIET_MS = 150;
  static final long DEFAULT_TIMEOUT_MS = 5_000L;

  private static final String RESOURCE = "/ai/testiv/testivai/settle.js";
  private static final String STOP_JS =
      "try { var s = window.__testivaiSettleState;"
          + " if (s && s.observer && s.observer.disconnect) s.observer.disconnect(); } catch (e) {}"
          + " try { delete window.__testivaiSettleState; } catch (e) {}";

  private static volatile String source;

  private Settle() {}

  static String source() {
    String local = source;
    if (local != null) return local;
    try (InputStream in = Settle.class.getResourceAsStream(RESOURCE)) {
      if (in == null) {
        throw new IllegalStateException(
            "settle.js is missing from the jar. Regenerate with "
                + "scripts/generate-element-map-asset.js and rebuild.");
      }
      String raw = new String(in.readAllBytes(), StandardCharsets.UTF_8);
      int start = raw.indexOf("function settleProbe");
      if (start < 0) {
        throw new IllegalStateException("settle.js is malformed: settleProbe not found.");
      }
      local = raw.substring(start).trim();
      source = local;
      return local;
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  static String expression(int quietMs) {
    return "return (" + source() + ")(document, window, " + quietMs + ");";
  }

  /**
   * Poll until the page settles or the deadline passes.
   *
   * <p>Always bounded: a page that never settles yields a capture, not a hang.
   * A driver that cannot evaluate the probe returns something unusable, in
   * which case we proceed at once rather than paying the whole timeout on every
   * capture.
   */
  static void waitFor(JavascriptExecutor js, int quietMs, long timeoutMs) {
    if (js == null) return;
    String expr = expression(quietMs);
    long deadline = System.currentTimeMillis() + timeoutMs;
    while (true) {
      Object raw;
      try {
        raw = js.executeScript(expr);
      } catch (RuntimeException e) {
        return; // probe unavailable — never block the capture
      }
      if (!(raw instanceof Map<?, ?> state)) return;
      Object settled = state.get("settled");
      if (!(settled instanceof Boolean flag)) return;
      if (flag || System.currentTimeMillis() >= deadline) return;
      try {
        Thread.sleep(50);
      } catch (InterruptedException ie) {
        Thread.currentThread().interrupt();
        return;
      }
    }
  }

  /** Detach the observer so it does not linger on the page under test. */
  static void stop(JavascriptExecutor js) {
    if (js == null) return;
    try {
      js.executeScript(STOP_JS);
    } catch (RuntimeException ignored) {
      // best-effort cleanup
    }
  }
}
