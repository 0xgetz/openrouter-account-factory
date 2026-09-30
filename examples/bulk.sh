#!/usr/bin/env bash
# Create 25 accounts with a shared password, appended to one results file.
set -euo pipefail

export BU_CDP_WS="wss://<session>.cdp.browser-use.com/devtools/browser/<id>"

node ../src/index.mjs \
  --count 25 \
  --first Budi \
  --last Santoso \
  --password 'YourPassword!1' \
  --out ./openrouter_accounts.jsonl
