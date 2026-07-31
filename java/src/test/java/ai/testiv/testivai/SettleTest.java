package ai.testiv.testivai;

import org.junit.jupiter.api.Test;
import org.openqa.selenium.JavascriptExecutor;

import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

class SettleTest {

  /** Answers the probe a fixed number of times before reporting settled. */
  private static JavascriptExecutor driver(AtomicInteger calls, int settleAfter, Object override) {
    return (JavascriptExecutor)
        java.lang.reflect.Proxy.newProxyInstance(
            SettleTest.class.getClassLoader(),
            new Class<?>[] {JavascriptExecutor.class},
            (proxy, method, args) -> {
              if (!method.getName().equals("executeScript")) return null;
              String script = (String) args[0];
              if (!script.contains("settleProbe")) return null;
              int n = calls.incrementAndGet();
              if (override != null) return override;
              return Map.of("ready", true, "imagesPending", 0, "settled", n > settleAfter);
            });
  }

  @Test
  void expressionWrapsTheGeneratedProbe() {
    String expr = Settle.expression(150);
    assertTrue(expr.startsWith("return (function settleProbe"));
    assertTrue(expr.endsWith(")(document, window, 150);"));
    assertTrue(!expr.contains("AUTO-GENERATED"), "banner should be stripped before injection");
  }

  @Test
  void pollsUntilSettled() {
    AtomicInteger calls = new AtomicInteger();
    Settle.waitFor(driver(calls, 3, null), 0, 5_000);
    assertEquals(4, calls.get());
  }

  @Test
  void isBoundedWhenThePageNeverSettles() {
    AtomicInteger calls = new AtomicInteger();
    long started = System.currentTimeMillis();
    Settle.waitFor(driver(calls, Integer.MAX_VALUE, null), 0, 250);
    assertTrue(System.currentTimeMillis() - started < 3_000, "must give up");
  }

  /** A driver that cannot evaluate the probe must not cost the whole timeout. */
  @Test
  void unusableAnswerReturnsImmediately() {
    AtomicInteger calls = new AtomicInteger();
    long started = System.currentTimeMillis();
    Settle.waitFor(driver(calls, 0, "not a map"), 0, 5_000);
    assertEquals(1, calls.get());
    assertTrue(System.currentTimeMillis() - started < 1_000);
  }

  @Test
  void stopIsBestEffort() {
    assertDoesNotThrow(() -> Settle.stop(null));
  }
}
