# Security Policy

## Supported Versions

Security fixes are applied to the latest minor version of each currently published package. Older versions are not patched; please upgrade.

| Package | Registry | Supported |
|---|---|---|
| `@testivai/witness` | npm | latest minor |
| `@testivai/witness-playwright` | npm | latest minor |
| `@testivai/witness-selenium` | npm | latest minor |
| `@testivai/witness-webdriverio` | npm | latest minor |
| `@testivai/mcp` | npm | latest minor |
| `testivai` | PyPI | latest minor |
| `testivai` | RubyGems | latest minor |
| TestivAI GitHub Action | this repo | latest `v1` major tag |

The Java adapter under [`java/`](./java) is experimental and is **not
published to any registry** — it is built from source with `mvn install`.
Reports against it are welcome and will be fixed in-tree, but there is no
released artifact to patch.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security reports.**

Please email **hello@testiv.ai** with:

- A description of the issue
- Steps to reproduce, or a proof-of-concept
- Affected package(s) and version(s)
- Any known mitigations or workarounds

You should receive an acknowledgement within **3 business days**. We aim to provide an initial assessment and disclosure timeline within **10 business days** of acknowledgement.

If you have not heard back within 7 calendar days, please follow up — your message may have been missed.

## Disclosure Policy

We follow a coordinated disclosure model:

1. We confirm and triage the report.
2. We develop and test a fix.
3. We publish a patched release and a security advisory via GitHub Security Advisories.
4. We credit the reporter (unless they prefer to remain anonymous).

Public disclosure of the vulnerability happens **after** a patched release is available, unless the issue is already public or actively exploited.

## Scope

In scope:

- Code in this repository
- The published packages listed above, on npm, PyPI and RubyGems
- The TestivAI GitHub Action

Out of scope:

- The testiv.ai website (static marketing/docs pages — no user data is processed there)
- Issues in third-party dependencies (please report upstream first)
- Social engineering or physical attacks

## Safe Harbor

We will not pursue legal action against researchers who:

- Make a good-faith effort to comply with this policy
- Avoid privacy violations, data destruction, and service disruption
- Give us reasonable time to respond before any public disclosure

Thank you for helping keep TestivAI users safe.
