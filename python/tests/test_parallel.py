"""
Parallel and sharded behaviour for the pytest plugin.

The xdist case is a regression guard: pytest_sessionfinish fires in EVERY
worker, so without the guard `pytest -n 8` launched eight concurrent
comparisons racing on the same visual-report/, each seeing a partial temp dir.
"""

import json
import os
from pathlib import Path

import pytest

from testivai import pytest_plugin as plugin


class FakeConfig:
    """Stands in for pytest's Config. xdist workers carry `workerinput`."""

    def __init__(self, worker: bool = False):
        if worker:
            self.workerinput = {"workerid": "gw3"}


class FakeSession:
    def __init__(self, worker: bool = False):
        self.config = FakeConfig(worker=worker)


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch):
    for var in ("TESTIVAI_SHARD", "TESTIVAI_CAPTURE_ONLY", "TESTIVAI_AUTO_REPORT"):
        monkeypatch.delenv(var, raising=False)


@pytest.fixture
def project(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    temp = tmp_path / ".testivai" / "temp" / "home"
    temp.mkdir(parents=True)
    (temp / "screenshot.png").write_bytes(b"png")
    return tmp_path


def test_shard_env_parsing():
    for raw, expected in [
        ("3/8", {"current": 3, "total": 8}),
        ("1of4", {"current": 1, "total": 4}),
        ("  2 / 5 ", {"current": 2, "total": 5}),
    ]:
        os.environ["TESTIVAI_SHARD"] = raw
        assert plugin._shard_from_env() == expected
    for bad in ("", "abc", "0/8", "9/8", "3/0"):
        os.environ["TESTIVAI_SHARD"] = bad
        assert plugin._shard_from_env() is None
    del os.environ["TESTIVAI_SHARD"]


def test_xdist_worker_does_not_report(project, monkeypatch):
    """The bug: every worker used to run the comparison concurrently."""
    called = []
    monkeypatch.setattr(plugin, "run_report", lambda root: called.append(root))

    plugin.pytest_sessionfinish(FakeSession(worker=True), 0)

    assert called == [], "an xdist worker must not run the comparison"


def test_controller_reports(project, monkeypatch):
    called = []
    monkeypatch.setattr(plugin, "run_report", lambda root: called.append(root))

    plugin.pytest_sessionfinish(FakeSession(worker=False), 0)

    assert len(called) == 1


def test_capture_only_skips_the_comparison(project, monkeypatch):
    called = []
    monkeypatch.setattr(plugin, "run_report", lambda root: called.append(root))
    monkeypatch.setenv("TESTIVAI_CAPTURE_ONLY", "1")

    plugin.pytest_sessionfinish(FakeSession(), 0)

    assert called == []


def test_being_a_shard_implies_capture_only(project, monkeypatch):
    called = []
    monkeypatch.setattr(plugin, "run_report", lambda root: called.append(root))
    monkeypatch.setenv("TESTIVAI_SHARD", "3/8")

    plugin.pytest_sessionfinish(FakeSession(), 0)

    assert called == [], "a shard sees only its slice; it must not compare"


def test_single_shard_still_compares(project, monkeypatch):
    called = []
    monkeypatch.setattr(plugin, "run_report", lambda root: called.append(root))
    monkeypatch.setenv("TESTIVAI_SHARD", "1/1")

    plugin.pytest_sessionfinish(FakeSession(), 0)

    assert len(called) == 1, "1/1 covers the whole suite"


def test_shard_manifest_written_and_marked_complete(project, monkeypatch):
    monkeypatch.setattr(plugin, "run_report", lambda root: None)
    monkeypatch.setenv("TESTIVAI_SHARD", "3/8")

    plugin.pytest_sessionfinish(FakeSession(), 0)

    manifest = Path(project) / ".testivai" / "temp" / "testivai-shard.json"
    assert manifest.exists()
    data = json.loads(manifest.read_text())
    assert data["shard"] == {"current": 3, "total": 8}
    assert data["captures"] == ["home"]
    # pytest has an end-of-run hook, so completion is trackable here
    assert data["complete"] is True


def test_no_manifest_when_not_sharded(project, monkeypatch):
    monkeypatch.setattr(plugin, "run_report", lambda root: None)

    plugin.pytest_sessionfinish(FakeSession(), 0)

    assert not (Path(project) / ".testivai" / "temp" / "testivai-shard.json").exists()


def test_worker_writes_no_manifest(project, monkeypatch):
    """A worker is not a shard — it shares the controller's temp dir."""
    monkeypatch.setenv("TESTIVAI_SHARD", "3/8")

    plugin.pytest_sessionfinish(FakeSession(worker=True), 0)

    assert not (Path(project) / ".testivai" / "temp" / "testivai-shard.json").exists()


class _SettleDriver:
    """Answers the settle probe a fixed number of times before settling."""

    def __init__(self, settle_after=0, broken=False):
        self.calls = 0
        self.settle_after = settle_after
        self.broken = broken

    def execute_script(self, script, *args):
        if "settleProbe" in script:
            self.calls += 1
            if self.broken:
                return None  # driver cannot evaluate the probe
            settled = self.calls > self.settle_after
            return {
                "ready": True,
                "imagesPending": 0 if settled else 1,
                "fontsPending": False,
                "quietFor": 999,
                "settled": settled,
            }
        return None


def test_wait_for_settled_polls_until_settled():
    from testivai._capture import wait_for_settled

    d = _SettleDriver(settle_after=3)
    wait_for_settled(d, quiet_ms=0, timeout=5.0)
    assert d.calls == 4, "should poll until the probe reports settled"


def test_wait_for_settled_gives_up_at_the_timeout():
    from testivai._capture import wait_for_settled
    import time

    d = _SettleDriver(settle_after=10**9)  # never settles
    started = time.time()
    wait_for_settled(d, quiet_ms=0, timeout=0.3)
    assert time.time() - started < 2.0, "must be bounded"


def test_unusable_probe_answer_returns_immediately():
    """A driver that cannot evaluate the probe must not cost the full timeout."""
    from testivai._capture import wait_for_settled
    import time

    d = _SettleDriver(broken=True)
    started = time.time()
    wait_for_settled(d, quiet_ms=0, timeout=5.0)
    assert d.calls == 1
    assert time.time() - started < 1.0
