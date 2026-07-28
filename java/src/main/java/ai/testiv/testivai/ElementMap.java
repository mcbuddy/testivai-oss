package ai.testiv.testivai;

import com.google.gson.Gson;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Loads the canonical element-map collector and builds the expression that
 * every TestivAI adapter injects into the page.
 *
 * <p>{@code element-map.js} on the classpath is GENERATED from
 * {@code packages/witness/src/capture/element-map.ts} by
 * {@code scripts/generate-element-map-asset.js}, and CI fails when it is
 * stale. Sharing one collector across TypeScript, Python and Java is not
 * tidiness: all of these adapters write into a single
 * {@code .testivai/baselines/} directory, so two languages emitting subtly
 * different maps for the same page would show up as phantom regressions.
 *
 * <p>The map powers region&rarr;selector attribution, shift classification and
 * the computed-style fingerprint on the comparison side.
 */
final class ElementMap {

  /** Matches DEFAULT_MAX_ELEMENTS in the TypeScript source. */
  static final int DEFAULT_MAX_ELEMENTS = 3000;

  private static final String RESOURCE = "/ai/testiv/testivai/element-map.js";
  private static final Gson GSON = new Gson();

  /** Cached collector source, without the generated banner comment. */
  private static volatile String source;

  private ElementMap() {}

  /**
   * The collector function source. The generated file opens with a
   * "do not edit" banner that helps a reader but is pure weight on the wire,
   * so it is sliced off — this string is shipped to the browser on every
   * capture.
   */
  static String source() {
    String local = source;
    if (local != null) {
      return local;
    }
    try (InputStream in = ElementMap.class.getResourceAsStream(RESOURCE)) {
      if (in == null) {
        throw new IllegalStateException(
            "element-map.js is missing from the jar. Regenerate it with "
                + "scripts/generate-element-map-asset.js and rebuild.");
      }
      String raw = new String(in.readAllBytes(), StandardCharsets.UTF_8);
      int start = raw.indexOf("function collectElementMap");
      if (start < 0) {
        throw new IllegalStateException(
            "element-map.js is malformed: collectElementMap not found. "
                + "Regenerate it with scripts/generate-element-map-asset.js");
      }
      local = raw.substring(start).trim();
      source = local;
      return local;
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  /**
   * Wraps the collector exactly as {@code buildElementMapExpression} does on
   * the TypeScript side. WebDriver needs the explicit {@code return}.
   */
  static String expression(int maxElements, List<String> ignoreSelectors) {
    return "return ("
        + source()
        + ")(document, window, "
        + maxElements
        + ", "
        + GSON.toJson(ignoreSelectors)
        + ");";
  }

  /** Serialize whatever WebDriver handed back as JSON for {@code elements.json}. */
  static String toJson(Object raw) {
    return GSON.toJson(raw);
  }
}
