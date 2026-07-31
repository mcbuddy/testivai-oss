package ai.testiv.testivai;

import com.google.gson.Gson;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Shard participation for parallel and sharded runs.
 *
 * <p>Playwright can tell its reporter {@code --shard=i/N}; JUnit cannot. So the
 * mechanism is the environment, not a framework API, and every TestivAI adapter
 * honours the same two variables:
 *
 * <pre>
 *   TESTIVAI_CAPTURE_ONLY=1   capture, do not compare or write a report
 *   TESTIVAI_SHARD=3/8        this process is shard 3 of 8
 * </pre>
 *
 * <p>That is what keeps a Java suite a first-class citizen of the same sharded
 * CI flow as Playwright rather than a second-class one.
 */
final class Shard {

  private static final Pattern PATTERN = Pattern.compile("\\s*(\\d+)\\s*(?:/|of)\\s*(\\d+)\\s*", Pattern.CASE_INSENSITIVE);
  private static final Gson GSON = new Gson();

  final int current;
  final int total;

  private Shard(int current, int total) {
    this.current = current;
    this.total = total;
  }

  /** Parse {@code TESTIVAI_SHARD}; null when unset or malformed. */
  static Shard fromEnv() {
    return parse(System.getenv("TESTIVAI_SHARD"));
  }

  static Shard parse(String raw) {
    if (raw == null || raw.isBlank()) return null;
    Matcher m = PATTERN.matcher(raw);
    if (!m.matches()) return null;
    int current = Integer.parseInt(m.group(1));
    int total = Integer.parseInt(m.group(2));
    if (total < 1 || current < 1 || current > total) return null;
    return new Shard(current, total);
  }

  /** Explicit env wins; otherwise being one shard of many implies capture-only. */
  static boolean captureOnly() {
    String raw = System.getenv("TESTIVAI_CAPTURE_ONLY");
    if (raw != null && !raw.isBlank()) {
      return !raw.equals("0") && !raw.equalsIgnoreCase("false");
    }
    Shard s = fromEnv();
    return s != null && s.total > 1;
  }

  /** Write the manifest {@code merge-captures} reads to prove every shard reported. */
  static void writeManifest(Path tempDir, Shard shard, boolean complete) {
    try {
      Files.createDirectories(tempDir);
      List<String> captures = new ArrayList<>();
      try (Stream<Path> entries = Files.list(tempDir)) {
        entries.filter(Files::isDirectory).forEach(p -> captures.add(p.getFileName().toString()));
      }
      Collections.sort(captures);

      String json =
          GSON.toJson(
              Map.of(
                  "shard", Map.of("current", shard.current, "total", shard.total),
                  "captures", captures,
                  "complete", complete,
                  "timestamp", Instant.now().toString()));
      Files.writeString(tempDir.resolve("testivai-shard.json"), json, StandardCharsets.UTF_8);
    } catch (IOException | RuntimeException ignored) {
      // A manifest we cannot write must never fail a test run.
    }
  }
}
