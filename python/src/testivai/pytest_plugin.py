"""
pytest plugin — registered automatically via the `pytest11` entry point.

Provides:
  - `testivai_witness` fixture: capture helper that defaults the snapshot
    name to the current test's name (sanitized).
  - session-finish hook: when temp captures exist, runs `testivai report`
    so the run ends with baselines compared and the report written.
    Disable with TESTIVAI_AUTO_REPORT=0.
"""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

import pytest

from ._capture import witness
from .runner import run_report


@pytest.fixture
def testivai_witness(request):
    """
    Usage with pytest-playwright:

        def test_homepage(page, testivai_witness):
            page.goto("http://localhost:3000")
            testivai_witness(page, "homepage")

    The name argument is optional — it defaults to the test name.
    """

    def _witness(page, name: str | None = None, **kwargs):
        snapshot_name = name or re.sub(r"[^a-z0-9_-]+", "_", request.node.name, flags=re.IGNORECASE).lower()
        return witness(page, snapshot_name, **kwargs)

    return _witness


def _shard_from_env():
    """
    Parse TESTIVAI_SHARD ("3/8" or "3of8") — the same contract every other
    adapter honours, so a pytest suite joins the sharded CI flow identically.
    """
    raw = os.environ.get("TESTIVAI_SHARD", "")
    m = re.match(r"\s*(\d+)\s*(?:/|of)\s*(\d+)\s*$", raw, re.IGNORECASE)
    if not m:
        return None
    current, total = int(m.group(1)), int(m.group(2))
    if total < 1 or current < 1 or current > total:
        return None
    return {"current": current, "total": total}


def _capture_only() -> bool:
    raw = os.environ.get("TESTIVAI_CAPTURE_ONLY", "")
    if raw:
        return raw not in ("0", "false", "False", "FALSE")
    shard = _shard_from_env()
    return bool(shard and shard["total"] > 1)


def _write_shard_manifest(temp_dir: Path, shard, *, complete: bool) -> None:
    try:
        temp_dir.mkdir(parents=True, exist_ok=True)
        captures = sorted(p.name for p in temp_dir.iterdir() if p.is_dir())
        (temp_dir / "testivai-shard.json").write_text(
            json.dumps(
                {
                    "shard": shard,
                    "captures": captures,
                    "complete": complete,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
                indent=2,
            ),
            encoding="utf-8",
        )
    except OSError:
        # Never fail a test run over a manifest.
        pass


def pytest_sessionfinish(session, exitstatus):  # noqa: ARG001 - pytest hook signature
    # xdist runs this hook in EVERY worker. Without this guard `pytest -n 8`
    # launches eight concurrent comparisons racing on the same visual-report/,
    # each seeing a partial temp dir. Only the controller reports.
    if hasattr(session.config, "workerinput"):
        return

    root = Path.cwd()
    temp_dir = root / ".testivai" / "temp"

    shard = _shard_from_env()
    if shard:
        _write_shard_manifest(temp_dir, shard, complete=True)

    if os.environ.get("TESTIVAI_AUTO_REPORT", "1") == "0":
        return
    # A shard only ran part of the suite: comparing here would report every
    # snapshot the other shards own as missing. Capture, merge, compare once.
    if _capture_only():
        print(
            "\n[testivai] capture-only — comparison skipped. "
            "Collect .testivai/temp/ from each node, then: "
            "npx testivai merge-captures <dirs...> && npx testivai report"
        )
        return
    if not temp_dir.is_dir() or not any(temp_dir.iterdir()):
        return
    try:
        run_report(root)
    except RuntimeError as err:  # CLI not found — report how to finish manually
        print(f"\n[testivai] {err}")
        print("[testivai] Captures are in .testivai/temp/ — run `npx testivai report` to compare.")
