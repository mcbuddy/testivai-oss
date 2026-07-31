package ai.testiv.testivai;

import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chromium.HasCdp;
import org.openqa.selenium.firefox.HasFullPageScreenshot;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Local-first visual regression capture for Selenium WebDriver.
 *
 * <p>Same semantics and on-disk contract as {@link Witness} (playwright-java)
 * and the JS/Python adapters: stabilization CSS completes animations at their
 * final state; {@code ignoreSelectors} are hidden from pixels AND excluded
 * from the DOM snapshot; {@code variant} keys parallel browsers into distinct
 * baselines; captures land in {@code .testivai/temp/<name>/}.
 *
 * <p>Full-page screenshots per browser: Chromium via CDP
 * ({@code Page.captureScreenshot} with captureBeyondViewport — the same
 * mechanism Playwright uses), Firefox via its native full-page API, anything
 * else falls back to a viewport screenshot.
 *
 * <p>Selenium and Playwright live in separate classes so either dependency
 * can be absent from the classpath — only the class you touch gets loaded.
 *
 * <pre>{@code
 * WebDriver driver = new ChromeDriver();
 * driver.get("http://localhost:3000");
 * SeleniumWitness.witness(driver, "homepage");
 * }</pre>
 */
public final class SeleniumWitness {

  private static final String STYLE_ID = "__testivai_capture_style__";

  private static final String INJECT_STYLE_JS =
      "var s = document.createElement('style');"
          + " s.id = arguments[0]; s.textContent = arguments[1];"
          + " document.head.appendChild(s);";

  private static final String REMOVE_STYLE_JS =
      "var s = document.getElementById(arguments[0]); if (s) s.remove();";

  private static final String FONTS_READY_JS =
      "return document.fonts ? document.fonts.status !== 'loading' : true;";

  private static final String DOM_SNAPSHOT_JS =
      "var selectors = arguments[0] || [];"
          + " var clone = document.documentElement.cloneNode(true);"
          + " for (var i = 0; i < selectors.length; i++) {"
          + "   try { clone.querySelectorAll(selectors[i]).forEach(function (el) { el.remove(); }); } catch (e) {}"
          + " }"
          + " return clone.outerHTML;";

  private SeleniumWitness() {}

  /** Capture with defaults. */
  public static Path witness(WebDriver driver, String name) {
    return witness(driver, name, new CaptureOptions());
  }

  /** Capture a visual snapshot; returns the temp directory written. */
  public static Path witness(WebDriver driver, String name, CaptureOptions options) {
    if (name == null || name.isBlank()) {
      throw new IllegalArgumentException("testivai: snapshot name is required");
    }
    Path root = options.projectRoot != null ? options.projectRoot : Path.of("").toAbsolutePath();
    Witness.LocalConfig config = Witness.LocalConfig.load(root);

    boolean stabilize = options.stabilize != null ? options.stabilize : config.stabilize;
    LinkedHashSet<String> selectors = new LinkedHashSet<>(config.ignoreSelectors);
    selectors.addAll(options.ignoreSelectors);

    String effectiveName =
        options.variant != null
            ? name + "__" + options.variant.replaceAll("[^a-zA-Z0-9_-]+", "_").toLowerCase(Locale.ROOT)
            : name;

    List<String> cssParts = new ArrayList<>();
    if (stabilize) cssParts.add(Witness.STABILIZE_CSS);
    if (!selectors.isEmpty()) {
      StringBuilder sb = new StringBuilder();
      for (String sel : selectors) sb.append(sel).append(" { visibility: hidden !important; }\n");
      cssParts.add(sb.toString());
    }

    JavascriptExecutor js = driver instanceof JavascriptExecutor ? (JavascriptExecutor) driver : null;

    boolean styleInjected = false;
    if (!cssParts.isEmpty() && js != null) {
      try {
        js.executeScript(INJECT_STYLE_JS, STYLE_ID, String.join("\n", cssParts));
        styleInjected = true;
      } catch (RuntimeException ignored) {
        // locked-down page; capture proceeds
      }
      if (stabilize) {
        waitForFonts(js);
        // Then wait for the page itself to stop changing — images finished,
        // DOM quiet. The load question the DOM/style layer cannot answer.
        Settle.waitFor(js, Settle.DEFAULT_QUIET_MS, Settle.DEFAULT_TIMEOUT_MS);
      }
    }

    Path tempDir = root.resolve(".testivai").resolve("temp").resolve(effectiveName);
    try {
      Files.createDirectories(tempDir);
      try {
        byte[] png = captureScreenshot(driver);
        Files.write(tempDir.resolve("screenshot.png"), png);
      } finally {
        if (styleInjected) {
          try {
            js.executeScript(REMOVE_STYLE_JS, STYLE_ID);
          } catch (RuntimeException ignored) {
            // best-effort cleanup
          }
        }
        if (stabilize) Settle.stop(js);
      }

      if (!options.skipDom && js != null) {
        try {
          Object dom = js.executeScript(DOM_SNAPSHOT_JS, new ArrayList<>(selectors));
          if (dom instanceof String s && !s.isEmpty()) {
            Files.writeString(tempDir.resolve("dom.html"), s, StandardCharsets.UTF_8);
          }
        } catch (RuntimeException ignored) {
          // missing dom.html only suppresses the noise hint
        }
      }

      // Element map — best-effort, same contract as the DOM snapshot. The
      // injected collector is the identical function every other adapter
      // injects (see ElementMap), so maps stay comparable across languages
      // sharing one baseline directory.
      if (!options.skipElementMap && js != null) {
        try {
          int max = options.maxElements != null
              ? options.maxElements
              : ElementMap.DEFAULT_MAX_ELEMENTS;
          Object map = js.executeScript(
              ElementMap.expression(max, new ArrayList<>(selectors)));
          if (map instanceof List<?> list && !list.isEmpty()) {
            Files.writeString(
                tempDir.resolve("elements.json"),
                ElementMap.toJson(list),
                StandardCharsets.UTF_8);
          }
        } catch (RuntimeException ignored) {
          // without the map the report keeps the pixel and DOM layers
        }
      }
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
    return tempDir;
  }

  /** Full-page where the browser supports it, viewport otherwise. */
  private static byte[] captureScreenshot(WebDriver driver) {
    // Chromium: CDP captureBeyondViewport — full page without resizing the
    // window (resizing breaks 100vh layouts, so we never do it).
    if (driver instanceof HasCdp cdp) {
      try {
        Map<String, Object> result =
            cdp.executeCdpCommand(
                "Page.captureScreenshot",
                Map.of("captureBeyondViewport", true, "format", "png"));
        Object data = result != null ? result.get("data") : null;
        if (data instanceof String s && !s.isEmpty()) {
          return Base64.getDecoder().decode(s);
        }
      } catch (RuntimeException ignored) {
        // fall through to the viewport screenshot
      }
    }

    // Firefox exposes full-page natively.
    if (driver instanceof HasFullPageScreenshot firefox) {
      try {
        return firefox.getFullPageScreenshotAs(OutputType.BYTES);
      } catch (RuntimeException ignored) {
        // fall through
      }
    }

    // Fallback: viewport-only (Safari and friends).
    if (driver instanceof TakesScreenshot ts) {
      return ts.getScreenshotAs(OutputType.BYTES);
    }
    throw new IllegalArgumentException(
        "testivai: driver does not support screenshots (TakesScreenshot not implemented)");
  }

  private static void waitForFonts(JavascriptExecutor js) {
    long deadline = System.nanoTime() + 10_000_000_000L; // 10s bounded
    while (System.nanoTime() < deadline) {
      try {
        Object ready = js.executeScript(FONTS_READY_JS);
        if (Boolean.TRUE.equals(ready)) return;
      } catch (RuntimeException e) {
        return;
      }
      try {
        Thread.sleep(100);
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        return;
      }
    }
  }
}
