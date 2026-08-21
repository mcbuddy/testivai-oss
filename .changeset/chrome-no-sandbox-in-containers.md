---
'@testivai/witness': patch
---

Launch Chrome with `--no-sandbox` when running as root, so `testivai witness <url>` works inside containers.

Chrome refuses to start as root unless its sandbox is disabled, and root is the
default user in Docker images and CI containers — the standalone witness flow
failed there with a launch timeout that looked like a broken Chrome binary.
It now detects the root case (overridable with `TESTIVAI_CHROME_NO_SANDBOX`),
adds `--disable-dev-shm-usage` alongside it for Docker's 64MB `/dev/shm`, and
the timeout error names the sandbox as a possible cause.
