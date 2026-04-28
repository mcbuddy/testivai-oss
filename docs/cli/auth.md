---
sidebar_position: 2
title: testivai auth
---

# testivai auth

Store your API key for use by the TestivAI CLI.

## Usage

```bash
npx testivai auth <api-key>
```

Get your API key from the [TestivAI Dashboard](https://dashboard.testiv.ai).

## Example

```bash
npx testivai auth tvai_abc123xyz
```

The key is stored locally and used for all subsequent `testivai run` commands.

## Environment Variable (Recommended)

All TestivAI SDKs read the API key from the **`TESTIVAI_API_KEY` shell environment variable**. This is the primary and recommended way to configure authentication:

```bash
# Set for current session
export TESTIVAI_API_KEY=tvai_abc123xyz

# Set permanently (add to your shell profile)
echo 'export TESTIVAI_API_KEY=tvai_abc123xyz' >> ~/.zshrc  # macOS
echo 'export TESTIVAI_API_KEY=tvai_abc123xyz' >> ~/.bashrc # Linux
```

## Supported Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `TESTIVAI_API_KEY` | **Yes** | — | Your project API key |
| `TESTIVAI_API_URL` | No | `https://core-api.testiv.ai` | Custom API endpoint |
| `TESTIVAI_DEBUG` | No | `false` | Enable verbose debug logging |

:::warning Shell environment variables only
TestivAI SDKs read **only from shell environment variables** (`process.env`). The SDKs do **not** use `dotenv` or load `.env` files. Always use `export` in your terminal or set variables in your CI provider's secrets.
:::
