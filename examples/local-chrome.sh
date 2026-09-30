#!/usr/bin/env bash
# Use a local Chrome instance with remote debugging enabled.
set -euo pipefail

# Start Chrome (Linux example) with a non-default profile dir:
#   google-chrome --remote-debugging-port=9222 --user-data-dir=./.chrome-profile &

WS="$(curl -s http://127.0.0.1:9222/json/version | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).webSocketDebuggerUrl))")"

node ../src/index.mjs --cdp "$WS" --count 1 --out ./openrouter_accounts.jsonl
