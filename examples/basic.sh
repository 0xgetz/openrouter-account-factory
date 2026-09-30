#!/usr/bin/env bash
# Create a single account using a Browser Use Cloud browser.
set -euo pipefail

export BU_CDP_WS="wss://<session>.cdp.browser-use.com/devtools/browser/<id>"

node ../src/index.mjs \
  --count 1 \
  --password 'YourPassword!1' \
  --out ./openrouter_accounts.jsonl
