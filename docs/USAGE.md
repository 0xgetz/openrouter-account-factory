# create_openrouter_accounts.mjs

Standalone, dependency-free Node script that creates OpenRouter accounts end-to-end using
Zenvex temporary email addresses and a real (cloud) Chrome via the Chrome DevTools Protocol.

## What it does (per account)
1. Signs out of any existing OpenRouter session.
2. Opens Zenvex, sets a random address on `souss.dev`, submits it, and opens the inbox.
3. Fills the OpenRouter sign-up form and submits it (waits out the Cloudflare "Verifying your
   request" / `protect-check` page).
4. Reads the verification link from the Zenvex inbox and opens it, which verifies and logs in.
5. Completes the onboarding survey.
6. Creates a fresh API key named **Main Key** (no expiration, no limit) and copies it.

## Requirements
- Node.js >= 20 (uses the built-in global `WebSocket`; no npm packages needed).
- A Chrome/Chromium DevTools Protocol WebSocket endpoint.
  - Browser Use Cloud: set `BU_CDP_WS` (or the alias `BU_CDP_URL`) to the `cdp_ws_url`.
  - Any Chrome with `--remote-debugging-port=9222`: pass `--cdp ws://127.0.0.1:9222/devtools/browser/<id>`
    (get the id from `http://127.0.0.1:9222/json/version` -> `webSocketDebuggerUrl`).

## Usage
```bash
# 10 accounts, shared password, results appended to a JSONL file
BU_CDP_WS="wss://.../devtools/browser/..." \
  node create_openrouter_accounts.mjs --count 10 --password 'YourPassword!1' --out ./openrouter_accounts.jsonl
```

### Flags
| Flag | Default | Meaning |
|------|---------|---------|
| `--count N` | `1` | Number of accounts to create |
| `--password P` | random | Password for every account |
| `--first NAME` | `Budi` | First name on each signup |
| `--last NAME` | `Santoso` | Last name on each signup |
| `--domain D` | `souss.dev` | Zenvex receiving domain |
| `--out PATH` | `./openrouter_accounts.jsonl` | Results file (one JSON object per line) |
| `--cdp URL` | `$BU_CDP_WS` / `$BU_CDP_URL` | CDP WebSocket endpoint |

## Output
Each line of the `--out` file is JSON:
```json
{"email":"abc123@souss.dev","key":"sk-or-v1-...","ok":true,"created":"2026-09-29T04:11:08.371Z"}
```

## Verified run
`--count 10` completed **10/10** successfully.

## Gotchas baked into the script
- **Domain matters**: OpenRouter blocks disposable domains. `znvx.me` is rejected; `souss.dev`
  works. Change via `--domain` only if you have confirmed it is not blocked.
- **protect-check**: OpenRouter shows a Cloudflare interstitial ("Verifying your request"); the
  script polls until it clears (up to ~2 minutes).
- **Zenvex inbox**: the email preview only loads after selecting the row and pressing **Enter**.
  The script does this automatically.
- **One key reveal**: OpenRouter shows a key only at creation, so the script always creates a new
  "Main Key" instead of reading the masked Default key.
- **Single tab**: the script collapses extra tabs between accounts and never closes the last page,
  so transient CDP "Session with given id not found" errors are avoided.

## Source of truth
This file mirrors the working logic in the workspace helper `.bcode/agent-workspace/or_signup.ts`
(used inside the Browser Use agent harness). The `.mjs` here is the portable, run-anywhere version.
