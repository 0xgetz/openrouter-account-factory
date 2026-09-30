# Architecture

This document explains how `openrouter-account-factory` is built and why.

## Design goals

1. **Zero dependencies.** The tool must run on a bare Node.js ≥ 20 install with no `npm install`.
2. **Portable.** It should work against any CDP endpoint, not one specific vendor.
3. **Observable.** Every account is logged with clear, greppable status lines.
4. **Resilient.** Browser targets go stale; the tool must recover without human intervention.

## High-level flow

```
main()
  └─ CdpClient.connect(wsUrl)          # built-in WebSocket
       └─ for each account:
            attachPage()               # pick/collapse to one page target
            createAccountBody()
              ├─ signOut()             # Clerk.signOut() via Runtime.evaluate
              ├─ zenvexAddress()       # set + submit temp address
              ├─ openRouterSignup()    # fill + submit form
              ├─ waitOutProtect()      # poll until Cloudflare clears
              ├─ readVerifyLink()      # select inbox row + Enter + read anchor
              ├─ openLinkInNewTab()    # Target.createTarget + attach
              ├─ onboarding()          # survey steps
              └─ createKey()           # New Key dialog + clipboard read
```

## Modules (all in `src/index.mjs`)

| Component | Responsibility |
|---|---|
| `CdpClient` | Minimal CDP client: `send(method, params, sessionId)`, event listeners, `waitEvent`. |
| `Page` | Target-scoped convenience wrapper: `evaluate`, `navigate`, `screenshot`, `mouseClick`, `clickCenter`, `pressEnter`. |
| `attachPage` | Ensures exactly one usable page target, collapsing extras and never closing the last one. |
| `createAccount` / `createAccountBody` | Orchestrates a single account, with stale-session retry. |
| `waitOutProtect` | Polls `location.href` until the Cloudflare `protect-check` page clears. |
| `onboarding` | Detects each survey step by text and acts accordingly. |
| `createKey` | Drives the New Key dialog (base-ui selects need real mouse clicks). |

## Why raw CDP instead of Playwright/Puppeteer

- **Zero install:** Node's global `WebSocket` is enough to speak CDP.
- **Cloud-native:** CDP works identically against remote browsers (Browser Use Cloud) and local ones.
- **Small surface:** only a handful of domains are needed (`Target`, `Page`, `Runtime`, `Input`,
  `Browser`), so the whole client fits in ~90 lines.

## Known platform quirks handled

| Quirk | Handling |
|---|---|
| `CDP` global name clash in Node ≥ 22 | The client class is named `CdpClient`. |
| Cloudflare `protect-check` interstitial | `waitOutProtect` polls up to ~2 minutes. |
| Zenvex inbox preview requires keyboard open | Select row, then dispatch `Enter` key events. |
| base-ui `<select>` ignores synthetic `.click()` | Click via real `Input.dispatchMouseEvent` at the option's rect center. |
| Disposable domain blocklist | Default to `souss.dev`; `znvx.me` is rejected by OpenRouter. |
| Stale CDP session ids | Detect the error, re-attach, retry once. |

## Security notes

- No credentials are stored. Passwords are passed via `--password` or generated per run.
- API keys are read from the clipboard and written only to the user-specified `--out` file.
- The tool never exfiltrates data anywhere; all traffic goes to OpenRouter and Zenvex through the
  browser you point it at.

## Extending

- **New email provider:** implement a `provisionAddress()` and `readVerificationLink()` pair and
  swap them into `createAccountBody`.
- **New target site:** the `Page` helper is generic; only the form selectors and step detection
  are site-specific.
