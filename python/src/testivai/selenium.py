"""
Capture implementation for Selenium WebDriver (Python bindings).

Same semantics as the playwright-python adapter (`testivai.witness`) and the
JS/TS adapters — one on-disk contract, one report, one approval flow:
  1. stabilization CSS: animations/transitions complete instantly at their
     FINAL state, caret hidden, smooth scroll off; wait for web fonts
  2. ignoreSelectors: hidden from pixels (visibility:hidden) AND excluded
     from the DOM snapshot (one consistent semantic)
  3. variant keying: `<name>__<variant>` so parallel browsers/viewports
     never overwrite each other's baselines
  4. on-disk contract: .testivai/temp/<name>/{screenshot.png, dom.html}

Full-page screenshots per browser:
  - Chromium (Chrome/Edge): CDP `Page.captureScreenshot` with
    captureBeyondViewport — same mechanism Playwright uses
  - Firefox: the bindings' native `get_full_page_screenshot_as_png()`
  - anything else: viewport screenshot (documented fallback)

    from testivai.selenium import witness

    def test_homepage(driver):
        driver.get("http://localhost:3000")
        witness(driver, "homepage")

The compare/report half stays in @testivai/witness — run `testivai report`
(the pytest plugin's session hook does it automatically).
"""

from __future__ import annotations

import base64
import json
import time
from pathlib import Path
from typing import Any, Optional, Sequence

from ._capture import (
    STABILIZE_CSS,
    _DEFAULT_MAX_ELEMENTS,
    _element_map_expression,
    build_ignore_css,
    load_local_config,
    sanitize_variant,
)

_STYLE_ID = "__testivai_capture_style__"

_INJECT_STYLE_JS = (
    "var s = document.createElement('style');"
    "s.id = arguments[0]; s.textContent = arguments[1];"
    "document.head.appendChild(s);"
)

_REMOVE_STYLE_JS = (
    "var s = document.getElementById(arguments[0]); if (s) s.remove();"
)

_FONTS_READY_JS = "return document.fonts ? document.fonts.status !== 'loading' : true;"

# Selenium's execute_script passes args via `arguments`, not a function param.
_DOM_SNAPSHOT_JS = """
var selectors = arguments[0] || [];
var clone = document.documentElement.cloneNode(true);
for (var i = 0; i < selectors.length; i++) {
  try {
    clone.querySelectorAll(selectors[i]).forEach(function (el) { el.remove(); });
  } catch (e) {}
}
return clone.outerHTML;
"""

_CHROMIUM_NAMES = {"chrome", "chromium", "msedge", "microsoftedge", "edge"}


def witness(
    driver: Any,
    name: str,
    *,
    ignore_selectors: Optional[Sequence[str]] = None,
    stabilize: Optional[bool] = None,
    variant: Optional[str] = None,
    skip_dom: bool = False,
    skip_element_map: bool = False,
    max_elements: Optional[int] = None,
    project_root: Optional[Path] = None,
) -> Path:
    """
    Capture a visual snapshot from a Selenium WebDriver.

    Writes `.testivai/temp/<name>/screenshot.png` (+ `dom.html`), then
    `testivai report` (or the pytest plugin's session hook) compares against
    committed baselines.

    Args:
        driver: selenium.webdriver.* instance (duck-typed: execute_script
            plus a screenshot method are all that's required).
        name: Snapshot name; becomes the directory under .testivai/temp/.
        ignore_selectors: Per-call CSS selectors hidden from pixels and
            excluded from the DOM snapshot. Merged with the global
            `ignoreSelectors` from .testivai/config.json.
        stabilize: Override the stabilization default (config `stabilize`,
            default True).
        variant: Multi-browser/viewport key, folded into the name as
            `<name>__<variant>` so parallel runs never collide.
        skip_element_map: Skip the element map. The map powers
            region->selector attribution, shift classification and the
            computed-style fingerprint; without it the report falls back to
            the pixel and DOM layers.
        max_elements: Cap on elements walked for the map (default 3000).
        skip_dom: Skip the DOM snapshot (disables the noise hint for this
            snapshot; pixel diff still works).
        project_root: Defaults to the current working directory.

    Returns:
        The temp directory the capture was written to.
    """
    if not name or not isinstance(name, str):
        raise ValueError(
            "testivai.selenium.witness: snapshot name is required and must be a non-empty string"
        )

    root = Path(project_root) if project_root else Path.cwd()
    config = load_local_config(root)

    effective_stabilize = config["stabilize"] if stabilize is None else stabilize
    merged_selectors = list(
        dict.fromkeys([*config.get("ignoreSelectors", []), *(ignore_selectors or [])])
    )

    if variant:
        name = f"{name}__{sanitize_variant(variant)}"

    # 1. Prepare the page: one style tag covering stabilization + ignores
    css_parts = []
    if effective_stabilize:
        css_parts.append(STABILIZE_CSS)
    if merged_selectors:
        css_parts.append(build_ignore_css(merged_selectors))

    style_injected = False
    if css_parts:
        try:
            driver.execute_script(_INJECT_STYLE_JS, _STYLE_ID, "\n".join(css_parts))
            style_injected = True
        except Exception:
            style_injected = False  # locked-down page; capture proceeds
        if effective_stabilize:
            _wait_for_fonts(driver)

    temp_dir = root / ".testivai" / "temp" / name
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        # 2. Full-page screenshot, best mechanism the browser offers
        png = _capture_screenshot(driver)
        (temp_dir / "screenshot.png").write_bytes(png)
    finally:
        if style_injected:
            try:
                driver.execute_script(_REMOVE_STYLE_JS, _STYLE_ID)
            except Exception:
                pass  # best-effort cleanup

    # 3. DOM snapshot with ignored elements removed (best-effort — a flaky
    #    page never breaks the screenshot path; missing dom.html just
    #    suppresses the noise hint)
    if not skip_dom:
        try:
            dom = driver.execute_script(_DOM_SNAPSHOT_JS, list(merged_selectors))
            if isinstance(dom, str) and dom:
                (temp_dir / "dom.html").write_text(dom, encoding="utf-8")
        except Exception:
            pass

    # 4. Element map (best-effort, same contract as the DOM snapshot).
    #    Powers region->selector attribution, shift classification and the
    #    style fingerprint. The injected collector is the SAME function every
    #    other adapter injects -- see element_map.js, which is generated from
    #    the TypeScript source so the languages cannot drift apart.
    if not skip_element_map:
        try:
            expr = _element_map_expression(
                max_elements if max_elements is not None else _DEFAULT_MAX_ELEMENTS,
                list(merged_selectors),
            )
            element_map = driver.execute_script(expr)
            if isinstance(element_map, list) and element_map:
                (temp_dir / "elements.json").write_text(
                    json.dumps(element_map), encoding="utf-8"
                )
        except Exception:
            pass

    return temp_dir


def _browser_name(driver: Any) -> str:
    try:
        caps = getattr(driver, "capabilities", None) or {}
        return str(caps.get("browserName", "")).lower()
    except Exception:
        return ""


def _capture_screenshot(driver: Any) -> bytes:
    """Full-page where the browser supports it, viewport otherwise."""
    browser = _browser_name(driver)

    # Chromium: CDP captureBeyondViewport — the same full-page mechanism
    # Playwright uses under the hood.
    if browser in _CHROMIUM_NAMES and hasattr(driver, "execute_cdp_cmd"):
        try:
            result = driver.execute_cdp_cmd(
                "Page.captureScreenshot",
                {"captureBeyondViewport": True, "format": "png"},
            )
            data = (result or {}).get("data")
            if data:
                return base64.b64decode(data)
        except Exception:
            pass  # fall through to the viewport screenshot

    # Firefox exposes full-page natively in the Python bindings.
    if hasattr(driver, "get_full_page_screenshot_as_png"):
        try:
            return driver.get_full_page_screenshot_as_png()
        except Exception:
            pass

    # Fallback: viewport-only (Safari and friends).
    return driver.get_screenshot_as_png()


def _wait_for_fonts(driver: Any, timeout_seconds: float = 10.0) -> None:
    """Bounded wait for web fonts — a fallback-font capture diffs 30%+."""
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        try:
            if driver.execute_script(_FONTS_READY_JS):
                return
        except Exception:
            return
        time.sleep(0.1)
