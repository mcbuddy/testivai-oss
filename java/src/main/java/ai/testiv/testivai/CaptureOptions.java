package ai.testiv.testivai;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/** Per-call options for {@link Witness#witness}. */
public final class CaptureOptions {
  Boolean stabilize;
  List<String> ignoreSelectors = new ArrayList<>();
  String variant;
  boolean skipDom;
  boolean skipElementMap;
  Integer maxElements;
  Path projectRoot;

  /** Override capture stabilization (default: config `stabilize`, true). */
  public CaptureOptions setStabilize(boolean stabilize) {
    this.stabilize = stabilize;
    return this;
  }

  /**
   * CSS selectors hidden from the pixels and excluded from the DOM snapshot;
   * merged with the global `ignoreSelectors` from .testivai/config.json.
   */
  public CaptureOptions setIgnoreSelectors(List<String> selectors) {
    this.ignoreSelectors = new ArrayList<>(selectors);
    return this;
  }

  /**
   * Multi-browser/viewport key, folded into the snapshot name
   * (`name__variant`) so parallel runs never overwrite each other's baselines.
   */
  public CaptureOptions setVariant(String variant) {
    this.variant = variant;
    return this;
  }

  /** Skip the DOM snapshot (disables the noise hint for this snapshot). */
  /**
   * Skip element-map capture. The map powers region-to-selector attribution,
   * shift classification and the computed-style fingerprint; without it the
   * report falls back to the pixel and DOM layers.
   */
  public CaptureOptions setSkipElementMap(boolean skipElementMap) {
    this.skipElementMap = skipElementMap;
    return this;
  }

  /** Cap on elements walked for the map (default 3000). */
  public CaptureOptions setMaxElements(int maxElements) {
    this.maxElements = maxElements;
    return this;
  }

  public CaptureOptions setSkipDom(boolean skipDom) {
    this.skipDom = skipDom;
    return this;
  }

  /** Project root (defaults to the working directory). */
  public CaptureOptions setProjectRoot(Path projectRoot) {
    this.projectRoot = projectRoot;
    return this;
  }
}
