package ai.testiv.testivai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.withSettings;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chromium.HasCdp;
import org.openqa.selenium.firefox.HasFullPageScreenshot;

/**
 * Unit tests for the Selenium capture adapter — mocked drivers, no browser.
 * Same approach as WitnessTest (playwright-java).
 */
class SeleniumWitnessTest {

  private static final byte[] PNG = "PNG-fake".getBytes(StandardCharsets.ISO_8859_1);
  private static final String PNG_B64 = Base64.getEncoder().encodeToString(PNG);
  private static final String DOM = "<html><head></head><body><p>Hi</p></body></html>";

  /** Chrome-shaped driver: scripts + CDP + viewport screenshot. */
  interface ChromeLike extends WebDriver, JavascriptExecutor, TakesScreenshot, HasCdp {}

  /** Firefox-shaped driver: scripts + native full-page + viewport. */
  interface FirefoxLike extends WebDriver, JavascriptExecutor, TakesScreenshot, HasFullPageScreenshot {}

  /** Minimal driver: scripts + viewport screenshot only. */
  interface PlainLike extends WebDriver, JavascriptExecutor, TakesScreenshot {}

  private ChromeLike chromeDriver() {
    ChromeLike driver = mock(ChromeLike.class, withSettings().strictness(org.mockito.quality.Strictness.LENIENT));
    when(driver.executeScript(contains("document.fonts"))).thenReturn(true);
    when(driver.executeScript(contains("cloneNode"), any())).thenReturn(DOM);
    when(driver.executeScript(contains("collectElementMap")))
        .thenReturn(List.of(
            Map.of("path", "body", "x", 0L, "y", 0L, "width", 100L, "height", 40L,
                "styleHash", "44959b06"),
            Map.of("path", "body > p", "x", 0L, "y", 8L, "width", 90L, "height", 16L,
                "styleHash", "1a2b3c4d")));
    when(driver.executeCdpCommand(eq("Page.captureScreenshot"), any()))
        .thenReturn(Map.of("data", PNG_B64));
    when(driver.getScreenshotAs(OutputType.BYTES)).thenReturn(PNG);
    return driver;
  }

  @Test
  void chromeFullPageViaCdp(@TempDir Path root) {
    ChromeLike driver = chromeDriver();
    CaptureOptions opts = new CaptureOptions();
    opts.projectRoot = root;

    Path temp = SeleniumWitness.witness(driver, "homepage", opts);

    assertEquals(root.resolve(".testivai/temp/homepage"), temp);
    assertTrue(Files.exists(temp.resolve("screenshot.png")));
    assertTrue(Files.exists(temp.resolve("dom.html")));
    verify(driver).executeCdpCommand(eq("Page.captureScreenshot"), any());
    verify(driver, never()).getScreenshotAs(any());
  }

  @Test
  void cdpFailureFallsBackToViewport(@TempDir Path root) {
    ChromeLike driver = chromeDriver();
    when(driver.executeCdpCommand(anyString(), any())).thenThrow(new RuntimeException("cdp boom"));
    CaptureOptions opts = new CaptureOptions();
    opts.projectRoot = root;

    SeleniumWitness.witness(driver, "x", opts);

    verify(driver).getScreenshotAs(OutputType.BYTES);
    assertTrue(Files.exists(root.resolve(".testivai/temp/x/screenshot.png")));
  }

  @Test
  void firefoxUsesNativeFullPage(@TempDir Path root) {
    FirefoxLike driver = mock(FirefoxLike.class, withSettings().strictness(org.mockito.quality.Strictness.LENIENT));
    when(driver.executeScript(contains("document.fonts"))).thenReturn(true);
    when(driver.executeScript(contains("cloneNode"), any())).thenReturn(DOM);
    when(driver.getFullPageScreenshotAs(OutputType.BYTES)).thenReturn(PNG);
    when(driver.getScreenshotAs(OutputType.BYTES)).thenReturn(PNG);
    CaptureOptions opts = new CaptureOptions();
    opts.projectRoot = root;

    SeleniumWitness.witness(driver, "ff", opts);

    verify(driver).getFullPageScreenshotAs(OutputType.BYTES);
    verify(driver, never()).getScreenshotAs(any());
  }

  @Test
  void plainDriverViewportFallback(@TempDir Path root) {
    PlainLike driver = mock(PlainLike.class, withSettings().strictness(org.mockito.quality.Strictness.LENIENT));
    when(driver.executeScript(contains("document.fonts"))).thenReturn(true);
    when(driver.executeScript(contains("cloneNode"), any())).thenReturn(DOM);
    when(driver.getScreenshotAs(OutputType.BYTES)).thenReturn(PNG);
    CaptureOptions opts = new CaptureOptions();
    opts.projectRoot = root;

    SeleniumWitness.witness(driver, "plain", opts);

    verify(driver).getScreenshotAs(OutputType.BYTES);
  }

  @Test
  void stabilizationCssInjectedAndRemoved(@TempDir Path root) {
    ChromeLike driver = chromeDriver();
    CaptureOptions opts = new CaptureOptions();
    opts.projectRoot = root;

    SeleniumWitness.witness(driver, "stab", opts);

    verify(driver)
        .executeScript(contains("createElement('style')"), eq("__testivai_capture_style__"),
            contains("animation-duration: 0.001s"));
    verify(driver).executeScript(contains("getElementById"), eq("__testivai_capture_style__"));
  }

  @Test
  void stabilizeFalseSkipsCss(@TempDir Path root) {
    ChromeLike driver = chromeDriver();
    CaptureOptions opts = new CaptureOptions();
    opts.projectRoot = root;
    opts.stabilize = false;

    SeleniumWitness.witness(driver, "nostab", opts);

    verify(driver, never()).executeScript(contains("createElement('style')"), any(), any());
  }

  @Test
  void ignoreSelectorsMergedFromConfigAndCall(@TempDir Path root) throws Exception {
    Files.createDirectories(root.resolve(".testivai"));
    Files.writeString(
        root.resolve(".testivai/config.json"),
        "{\"mode\":\"local\",\"ignoreSelectors\":[\".from-config\"]}");

    ChromeLike driver = chromeDriver();
    CaptureOptions opts = new CaptureOptions();
    opts.projectRoot = root;
    opts.ignoreSelectors = List.of(".badge");

    SeleniumWitness.witness(driver, "ignored", opts);

    verify(driver)
        .executeScript(contains("createElement('style')"), any(),
            contains(".from-config { visibility: hidden !important; }"));
    verify(driver).executeScript(contains("cloneNode"), eq(List.of(".from-config", ".badge")));
  }

  @Test
  void variantFoldsIntoName(@TempDir Path root) {
    ChromeLike driver = chromeDriver();
    CaptureOptions opts = new CaptureOptions();
    opts.projectRoot = root;
    opts.variant = "Firefox 128 @2x";

    Path temp = SeleniumWitness.witness(driver, "homepage", opts);

    assertEquals("homepage__firefox_128_2x", temp.getFileName().toString());
  }

  @Test
  void skipDomLeavesNoDomHtml(@TempDir Path root) {
    ChromeLike driver = chromeDriver();
    CaptureOptions opts = new CaptureOptions();
    opts.projectRoot = root;
    opts.skipDom = true;

    Path temp = SeleniumWitness.witness(driver, "nodom", opts);

    assertTrue(Files.exists(temp.resolve("screenshot.png")));
    assertFalse(Files.exists(temp.resolve("dom.html")));
  }

  @Test
  void styleRemovedEvenWhenScreenshotFails(@TempDir Path root) {
    ChromeLike driver = chromeDriver();
    when(driver.executeCdpCommand(anyString(), any())).thenThrow(new RuntimeException("boom"));
    when(driver.getScreenshotAs(OutputType.BYTES)).thenThrow(new RuntimeException("boom"));
    CaptureOptions opts = new CaptureOptions();
    opts.projectRoot = root;

    assertThrows(RuntimeException.class, () -> SeleniumWitness.witness(driver, "explodes", opts));

    verify(driver).executeScript(contains("getElementById"), eq("__testivai_capture_style__"));
  }

  @Test
  void emptyNameRejected(@TempDir Path root) {
    ChromeLike driver = chromeDriver();
    assertThrows(IllegalArgumentException.class, () -> SeleniumWitness.witness(driver, " "));
  }

  @Test
  void writesElementMapJson(@TempDir Path root) throws Exception {
    ChromeLike driver = chromeDriver();
    CaptureOptions opts = new CaptureOptions();
    opts.projectRoot = root;

    Path temp = SeleniumWitness.witness(driver, "with-map", opts);

    Path map = temp.resolve("elements.json");
    assertTrue(Files.exists(map), "elements.json should be written");
    String json = Files.readString(map);
    assertTrue(json.contains("\"path\""), "entries carry a selector path");
    assertTrue(json.contains("styleHash"), "entries carry a style hash");
  }

  @Test
  void skipElementMapSuppressesTheFile(@TempDir Path root) {
    ChromeLike driver = chromeDriver();
    CaptureOptions opts = new CaptureOptions();
    opts.projectRoot = root;
    opts.setSkipElementMap(true);

    Path temp = SeleniumWitness.witness(driver, "no-map", opts);
    assertFalse(Files.exists(temp.resolve("elements.json")));
  }

  @Test
  void elementMapFailureNeverBreaksCapture(@TempDir Path root) {
    ChromeLike driver = chromeDriver();
    when(driver.executeScript(contains("collectElementMap")))
        .thenThrow(new RuntimeException("CSP blocked"));
    CaptureOptions opts = new CaptureOptions();
    opts.projectRoot = root;

    Path temp = SeleniumWitness.witness(driver, "map-fails", opts);

    assertTrue(Files.exists(temp.resolve("screenshot.png")));
    assertFalse(Files.exists(temp.resolve("elements.json")));
  }

  /**
   * The generated asset must be real, runnable JavaScript that produces the
   * shape the comparison side expects. Anything else means the generator or
   * the checked-in resource has drifted.
   */
  @Test
  void generatedCollectorIsValidJavaScript() {
    String expr = ElementMap.expression(3000, List.of(".live"));
    assertTrue(expr.startsWith("return (function collectElementMap"),
        "expression should wrap the canonical collector");
    assertTrue(expr.endsWith(")(document, window, 3000, [\".live\"]);"),
        "expression should pass document/window/max/ignoreSelectors");
    assertFalse(expr.contains("AUTO-GENERATED"),
        "the banner comment should be stripped before injection");
  }
}
