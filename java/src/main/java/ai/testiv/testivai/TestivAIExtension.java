package ai.testiv.testivai;

import org.junit.jupiter.api.extension.BeforeAllCallback;
import org.junit.jupiter.api.extension.ExtensionContext;

/**
 * JUnit 5 extension that runs {@code testivai report} exactly once, after the
 * whole test run — mirroring the Playwright reporter / pytest plugin flow.
 *
 * <pre>{@code
 * @ExtendWith(TestivAIExtension.class)
 * class HomepageTest {
 *   @Test void homepage() {
 *     page.navigate("http://localhost:3000");
 *     Witness.witness(page, "homepage");
 *   }
 * }
 * }</pre>
 *
 * Disable with {@code TESTIVAI_AUTO_REPORT=0}.
 */
public final class TestivAIExtension implements BeforeAllCallback, ExtensionContext.Store.CloseableResource {

  private static final ExtensionContext.Namespace NS =
      ExtensionContext.Namespace.create(TestivAIExtension.class);

  @Override
  public void beforeAll(ExtensionContext context) {
    // Register once on the root context; close() fires when the run ends.
    context.getRoot().getStore(NS).getOrComputeIfAbsent("report-hook", k -> this);
  }

  @Override
  public void close() {
    java.nio.file.Path temp = java.nio.file.Path.of(".testivai", "temp");

    // Shard participation, same env contract as every other adapter. JUnit has
    // an end-of-run hook, so completion is trackable here.
    Shard info = Shard.fromEnv();
    if (info != null) {
      Shard.writeManifest(temp, info, true);
    }

    if ("0".equals(System.getenv("TESTIVAI_AUTO_REPORT"))) return;

    // A shard ran only part of the suite: comparing here would report every
    // snapshot the other shards own as missing. Capture, merge, compare once.
    if (Shard.captureOnly()) {
      System.out.println(
          "[testivai] capture-only — comparison skipped. Collect .testivai/temp/ from each "
              + "node, then: npx testivai merge-captures <dirs...> && npx testivai report");
      return;
    }

    if (java.nio.file.Files.isDirectory(temp)) {
      Runner.runReport();
    }
  }
}
