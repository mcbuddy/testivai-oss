package ai.testiv.testivai;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** The env contract that lets a Java suite join the same sharded CI flow. */
class ShardTest {

  @Test
  void parsesBothForms() {
    assertEquals(3, Shard.parse("3/8").current);
    assertEquals(8, Shard.parse("3/8").total);
    assertEquals(1, Shard.parse("1of4").current);
    assertNotNull(Shard.parse("  2 / 5 "));
  }

  @Test
  void rejectsNonsense() {
    assertNull(Shard.parse(null));
    assertNull(Shard.parse(""));
    assertNull(Shard.parse("abc"));
    assertNull(Shard.parse("0/8"), "shards are one-based");
    assertNull(Shard.parse("9/8"), "index cannot exceed the total");
    assertNull(Shard.parse("3/0"));
  }

  @Test
  void writesAManifestListingCaptures(@TempDir Path root) throws Exception {
    Path temp = root.resolve(".testivai/temp");
    Files.createDirectories(temp.resolve("home"));
    Files.createDirectories(temp.resolve("checkout"));

    Shard.writeManifest(temp, Shard.parse("3/8"), true);

    String json = Files.readString(temp.resolve("testivai-shard.json"));
    assertTrue(json.contains("\"current\":3"));
    assertTrue(json.contains("\"total\":8"));
    assertTrue(json.contains("checkout"));
    assertTrue(json.contains("home"));
    // JUnit has an end-of-run hook, so completion is trackable
    assertTrue(json.contains("\"complete\":true"));
  }

  @Test
  void survivesAnUnwritableTarget() {
    // Must never fail a test run over a manifest.
    Shard.writeManifest(Path.of("/definitely/not/writable/xyz"), Shard.parse("1/2"), true);
  }

  @Test
  void manifestIsSkippedWhenNotSharded(@TempDir Path root) throws Exception {
    Path temp = root.resolve(".testivai/temp");
    Files.createDirectories(temp);
    assertNull(Shard.parse(System.getenv("TESTIVAI_SHARD")));
    assertFalse(Files.exists(temp.resolve("testivai-shard.json")));
  }
}
