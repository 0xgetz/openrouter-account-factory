<div align="center">

# OpenRouter Account Factory

**Create and verify OpenRouter accounts end-to-end — signup, email verification, onboarding and API-key provisioning — from a single command.**

[![CI](https://github.com/0xgetz/openrouter-account-factory/actions/workflows/ci.yml/badge.svg)](https://github.com/0xgetz/openrouter-account-factory/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](package.json)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blueviolet.svg)](#contributing)
[![GitHub stars](https://img.shields.io/github/stars/0xgetz/openrouter-account-factory?style=social)](https://github.com/0xgetz/openrouter-account-factory/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/0xgetz/openrouter-account-factory?style=social)](https://github.com/0xgetz/openrouter-account-factory/network/members)
[![GitHub issues](https://img.shields.io/github/issues/0xgetz/openrouter-account-factory)](https://github.com/0xgetz/openrouter-account-factory/issues)
[![Last commit](https://img.shields.io/github/last-commit/0xgetz/openrouter-account-factory)](https://github.com/0xgetz/openrouter-account-factory/commits/main)
[![Platform](https://img.shields.io/badge/platform-linux%20%7C%20macos%20%7C%20windows-lightgrey)](#requirements)

[English](README.md) · [Bahasa Indonesia](docs/README.id.md) · [Español](docs/README.es.md) · [中文](docs/README.zh.md) · [日本語](docs/README.ja.md)

</div>

---

## Overview

`openrouter-account-factory` is a zero-dependency Node.js CLI that fully automates OpenRouter
account creation using [Zenvex](https://zenvex.dev) temporary email addresses. It drives a real
Chrome/Chromium browser over the **Chrome DevTools Protocol (CDP)** and completes every step a
human would:

1. **Sign up** — fills the OpenRouter registration form.
2. **Verify** — reads the verification link from the temporary inbox and opens it.
3. **Onboard** — walks through the post-signup survey.
4. **Provision** — creates a fresh, unlimited, non-expiring API key and copies it.

Verified end-to-end: a `--count 10` run completed **10/10** accounts successfully.

> [!IMPORTANT]
> This tool automates account creation and is intended for **legitimate testing, QA, research and
> educational purposes only**. You are responsible for complying with OpenRouter's Terms of Service
> and all applicable laws. Use at your own risk.

## Features

- ⚡ **Zero dependencies** — uses the built-in global `WebSocket` (Node ≥ 20).
- 🌐 **Works anywhere** — any CDP endpoint: Browser Use Cloud, Docker Chrome, local Chrome.
- 📧 **Temp-mail verification** — automatic inbox polling and link extraction.
- 🛡️ **Anti-bot aware** — waits out Cloudflare `protect-check` interstitials.
- 🔑 **Key provisioning** — creates a named `Main Key` (no expiry, no limit) and captures it.
- 🧩 **Scriptable** — clean JSONL output, `--count N`, configurable names/domains/passwords.
- 🔁 **Resilient** — retries on stale CDP targets and collapses extra tabs automatically.

## Requirements

| Requirement | Details |
|---|---|
| **Node.js** | `>= 20` (built-in `WebSocket`; no npm install needed) |
| **Browser** | Any Chrome/Chromium exposing a CDP WebSocket endpoint |
| **OS** | Linux, macOS or Windows |

## Installation

```bash
git clone https://github.com/0xgetz/openrouter-account-factory.git
cd openrouter-account-factory
# no npm install required — zero dependencies
```

## Usage

Point the CLI at a CDP endpoint and run it:

```bash
BU_CDP_WS="wss://<your-browser>/devtools/browser/<id>" \
  node src/index.mjs --count 10 --password 'YourPassword!1' --out ./openrouter_accounts.jsonl
```

### CLI options

| Flag | Default | Description |
|------|---------|-------------|
| `--count N` | `1` | Number of accounts to create |
| `--password P` | random | Password applied to every account |
| `--first NAME` | `Budi` | First name used at signup |
| `--last NAME` | `Santoso` | Last name used at signup |
| `--domain D` | `souss.dev` | Zenvex receiving domain |
| `--out PATH` | `./openrouter_accounts.jsonl` | Results file (one JSON object per line) |
| `--cdp URL` | `$BU_CDP_WS` / `$BU_CDP_URL` | CDP WebSocket endpoint |
| `--help`, `-h` | — | Show help |
| `--version`, `-v` | — | Show version |

### Connecting a browser

**Option A — Browser Use Cloud**

```bash
export BU_CDP_WS="wss://<session>.cdp.browser-use.com/devtools/browser/<id>"
node src/index.mjs --count 5
```

**Option B — local Chrome**

```bash
# Linux
google-chrome --remote-debugging-port=9222 --user-data-dir=./.chrome-profile
# then
node src/index.mjs --cdp "$(curl -s http://127.0.0.1:9222/json/version | jq -r .webSocketDebuggerUrl)" --count 1
```

## Output

Results are appended to the `--out` file as JSONL:

```json
{"email":"orm60kb1mg5r@souss.dev","key":"sk-or-v1-bf95...1c6f","ok":true,"created":"2026-09-29T04:11:08.371Z"}
```

An example human-readable page is included in `docs/sample-output.html`.

## How it works

```
 ┌──────────────┐   set address    ┌──────────────┐
 │   Zenvex     │ ───────────────▶ │  Temp inbox  │
 └──────┬───────┘                  └──────┬───────┘
        │ email                           │ verification link
        ▼                                 ▲
 ┌──────────────────────────────────────────────────┐
 │                OpenRouter sign-up                 │
 │  form ─▶ verify email ─▶ onboarding ─▶ Main Key   │
 └──────────────────────────────────────────────────┘
                    ▲ CDP
             ┌──────┴───────┐
             │ Chrome (CDP) │
             └──────────────┘
```

1. A random address is generated on the Zenvex `souss.dev` domain and its inbox opened.
2. The OpenRouter sign-up form is filled and submitted.
3. The Cloudflare `protect-check` interstitial is awaited.
4. The verification email is opened and its link followed, which logs the account in.
5. The onboarding survey is completed.
6. A fresh `Main Key` (no expiration, no limit) is created and read from the clipboard.

## Project structure

```
openrouter-account-factory/
├── src/
│   └── index.mjs                 # the entire CLI + CDP client (zero deps)
├── docs/
│   ├── README.id.md              # Bahasa Indonesia
│   ├── README.es.md              # Español
│   ├── README.zh.md              # 中文
│   ├── README.ja.md              # 日本語
│   ├── ARCHITECTURE.md
│   └── sample-output.html
├── .github/
│   ├── workflows/ci.yml
│   └── ISSUE_TEMPLATE/
├── package.json
├── LICENSE
└── README.md
```

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Temporary email services are not supported` | The domain is blocklisted. Use `--domain souss.dev`. |
| Stuck on `Verifying your request` | Cloudflare `protect-check`. The script waits up to ~2 min; keep the browser alive. |
| `Session with given id not found` | Stale CDP target. The script re-attaches automatically; if persistent, restart the browser. |
| `no verification link` | The inbox preview didn't load. The script selects the row and presses Enter; check network. |
| `zenvex address mismatch` | Zenvex kept the previous session address. The script re-submits; ensure only one tab is used. |

## Roadmap

- [ ] Pluggable email providers (Mail.tm, 1secmail, custom IMAP)
- [ ] `--json` structured stdout mode
- [ ] Docker image with bundled Chrome
- [ ] Playwright adapter as an alternative to raw CDP
- [ ] Rate-limit and concurrency controls

## Contributing

Contributions are welcome! Please read the issue templates and open a PR:

1. Fork the repo
2. Create a branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push and open a Pull Request

Please keep commits conventional and run `npm run check` before submitting.

## License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

## Disclaimer

This project is provided for educational and legitimate testing purposes. The authors are not
responsible for misuse or for any violation of third-party terms of service. OpenRouter, Zenvex,
Chrome and Node.js are trademarks of their respective owners.

<div align="center">

Made with ❤️ by [0xgetz](https://github.com/0xgetz)

⭐ **Star this repo if you find it useful!**

</div>
