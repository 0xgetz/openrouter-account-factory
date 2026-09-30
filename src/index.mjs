#!/usr/bin/env node
/**
 * create_openrouter_accounts.mjs
 * End-to-end OpenRouter account creator using Zenvex temp email + a Browser Use Cloud
 * browser (or any Chrome DevTools Protocol endpoint).
 *
 * Usage:
 *   BU_CDP_WS="wss://.../devtools/browser/..." node create_openrouter_accounts.mjs --count 5 --password 'YourPassword!1'
 *
 * Flags:
 *   --count N        how many accounts to create (default 1)
 *   --password P     password for every account (default: generated per run)
 *   --first NAME     first name (default Budi)
 *   --last NAME      last name (default Santoso)
 *   --domain D       zenvex domain (default souss.dev; znvx.me is BLOCKED by OpenRouter)
 *   --out PATH       results JSONL path (default ./openrouter_accounts.jsonl)
 *   --cdp URL        CDP websocket url (else uses BU_CDP_WS / BU_CDP_URL env)
 *   --headed         keep going after each account (no effect, scripts are sequential)
 *
 * Requires Node >= 20 (uses built-in global WebSocket). No npm dependencies.
 *
 * Notes / gotchas baked in:
 *   - OpenRouter blocks disposable domains: znvx.me fails, souss.dev works.
 *   - OpenRouter shows Cloudflare "Verifying your request" (protect-check); the script waits it out.
 *   - The Zenvex inbox row must be opened with Enter after selecting it, otherwise the preview
 *     never loads and no verification link is exposed.
 *   - OpenRouter only reveals a key once, so the script creates a fresh "Main Key".
 */

const args = process.argv.slice(2)

const HELP = `openrouter-account-factory

Create and verify OpenRouter accounts end-to-end via Zenvex temp email + CDP.

Usage:
  BU_CDP_WS="wss://..." node src/index.mjs [options]

Options:
  --count N        Number of accounts to create (default: 1)
  --password P     Password for every account (default: random)
  --first NAME     First name (default: Budi)
  --last NAME      Last name (default: Santoso)
  --domain D       Zenvex receiving domain (default: souss.dev)
  --out PATH       Results JSONL path (default: ./openrouter_accounts.jsonl)
  --cdp URL        CDP websocket URL (else BU_CDP_WS / BU_CDP_URL)
  --help, -h       Show this help and exit
  --version, -v    Show version and exit

Environment:
  BU_CDP_WS        Browser Use Cloud (or any) CDP websocket URL
  BU_CDP_URL       Alias for BU_CDP_WS
`

if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(HELP)
  process.exit(0)
}
if (args.includes("--version") || args.includes("-v")) {
  process.stdout.write("1.0.0\n")
  process.exit(0)
}

function flag(name, def) {
  const i = args.indexOf("--" + name)
  return i >= 0 && args[i + 1] ? args[i + 1] : def
}
const COUNT = parseInt(flag("count", "1"), 10)
const PASSWORD = flag("password", "Or" + Math.random().toString(36).slice(2, 12) + "!9x")
const FIRST = flag("first", "Budi")
const LAST = flag("last", "Santoso")
const DOMAIN = flag("domain", "souss.dev")
const OUT = flag("out", new URL("./openrouter_accounts.jsonl", import.meta.url).pathname)
const CDP = flag("cdp", process.env.BU_CDP_WS || process.env.BU_CDP_URL || "")

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ------------------------------------------------------------------ *
 * Minimal CDP client over the built-in WebSocket.
 * ------------------------------------------------------------------ */
class CdpClient {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.listeners = []
    ws.addEventListener("message", (ev) => {
      let msg
      try { msg = JSON.parse(typeof ev.data === "string" ? ev.data : ev.data.toString()) } catch { return }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        if (msg.error) reject(new Error(msg.error.message + " " + JSON.stringify(msg.error.data || "")))
        else resolve(msg.result)
      } else if (msg.method) {
        for (const l of this.listeners) l(msg)
      }
    })
  }
  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl)
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true })
      ws.addEventListener("error", () => reject(new Error("WS error connecting to " + wsUrl)), { once: true })
    })
    const c = new CdpClient(ws)
    c.rootUrl = wsUrl
    return c
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id
    const payload = { id, method, params }
    if (sessionId) payload.sessionId = sessionId
    this.ws.send(JSON.stringify(payload))
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); reject(new Error("CDP timeout: " + method)) }
      }, 60000)
    })
  }
  on(fn) { this.listeners.push(fn); return () => { this.listeners = this.listeners.filter((x) => x !== fn) } }
  waitEvent(method, timeoutMs = 15000) {
    return new Promise((resolve) => {
      const off = this.on((m) => { if (m.method === method) { off(); resolve(m) } })
      setTimeout(() => { off(); resolve(null) }, timeoutMs)
    })
  }
}

/* ------------------------------------------------------------------ *
 * Page driver (target-attached).
 * ------------------------------------------------------------------ */
class Page {
  constructor(client, sessionId) { this.c = client; this.sid = sessionId }
  call(method, params = {}) { return this.c.send(method, params, this.sid) }
  async enable() {
    await this.call("Page.enable").catch(() => {})
    await this.call("Runtime.enable").catch(() => {})
    return this
  }
  async evaluate(expression, awaitPromise = false) {
    const r = await this.call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise })
    if (r.exceptionDetails) throw new Error("eval error: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text))
    return r.result ? r.result.value : undefined
  }
  async navigate(url, waitMs = 15000) {
    const loaded = this.c.waitEvent("Page.loadEventFired", waitMs)
    await this.call("Page.navigate", { url })
    await Promise.race([loaded, sleep(waitMs)])
    await sleep(1800)
  }
  async screenshot(path) {
    const r = await this.call("Page.captureScreenshot", { format: "png" })
    if (path) {
      const fs = await import("fs/promises")
      await fs.writeFile(path, Buffer.from(r.data, "base64"))
    }
    return r.data
  }
  async mouseClick(x, y) {
    await this.call("Input.dispatchMouseEvent", { type: "mouseMoved", x, y })
    await this.call("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 })
    await this.call("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 })
  }
  async clickCenter(expr) {
    const box = await this.evaluate(`(()=>{${expr}})()`)
    if (!box || box === "none") return "none"
    let p
    try { p = JSON.parse(box) } catch { return box }
    if (!p || typeof p.x !== "number") return "none"
    await this.mouseClick(p.x, p.y)
    return "clicked"
  }
  async pressEnter(times = 1) {
    for (let i = 0; i < times; i++) {
      await this.call("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 })
      await this.call("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 })
      await sleep(1200)
    }
  }
}

/* ------------------------------------------------------------------ *
 * Account flow
 * ------------------------------------------------------------------ */
async function attachPage(client) {
  // Prefer a stable existing tab; collapse extras but NEVER close the last page.
  const { targetInfos } = await client.send("Target.getTargets")
  const pages = targetInfos.filter((t) => t.type === "page" && !t.url.startsWith("chrome://") && !t.url.startsWith("devtools://"))
  let page = pages[0]
  if (!page) {
    const created = await client.send("Target.createTarget", { url: "about:blank" })
    page = { targetId: created.targetId }
  } else {
    for (const p of pages.slice(1)) {
      await client.send("Target.closeTarget", { targetId: p.targetId }).catch(() => {})
    }
  }
  const { sessionId } = await client.send("Target.attachToTarget", { targetId: page.targetId, flatten: true })
  return new Page(client, sessionId)
}

// A page handle can go stale (target navigated/closed). Re-attach and retry once.
async function withRetry(fn, tries = 2) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try { return await fn() } catch (e) {
      lastErr = e
      await sleep(1500)
    }
  }
  throw lastErr
}

const randLocal = () => "or" + Date.now().toString(36).slice(-6) + Math.random().toString(36).slice(2, 6)

async function waitOutProtect(page, tries = 24) {
  let url = await page.evaluate("location.href")
  for (let i = 0; i < tries && String(url).includes("protect-check"); i++) {
    await sleep(5000)
    url = await page.evaluate("location.href")
  }
  return url
}

async function onboarding(page) {
  for (let i = 0; i < 12; i++) {
    const txt = (await page.evaluate("document.body.innerText")) || ""
    if (/You're all set/i.test(txt)) break
    if (/Add a payment method/i.test(txt)) {
      await page.evaluate(`(()=>{const b=[...document.querySelectorAll('button,a')].find(e=>/i'll do this later/i.test(e.innerText)); if(b)b.click(); return 'ok';})()`)
      await sleep(3000); continue
    }
    if (/Where did you first hear about OpenRouter/i.test(txt)) {
      await page.evaluate(`(()=>{const l=[...document.querySelectorAll('label')].find(x=>/Other \\/ Not sure/i.test(x.innerText)); const inp=l&&(l.querySelector('input')||document.getElementById(l.getAttribute('for'))); if(inp)inp.click(); return 'ok';})()`)
      await sleep(700)
      await page.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>/^continue$/i.test(e.innerText.trim())&&!e.disabled); if(b)b.click(); return 'ok';})()`)
      await sleep(3000); continue
    }
    await page.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>/^(next|continue|get started|finish|done)$/i.test(e.innerText.trim())&&!e.disabled); if(b)b.click(); return 'ok';})()`)
    await sleep(3000)
  }
}

async function createKey(page) {
  await page.navigate("https://openrouter.ai/workspaces/default/keys", 15000)
  await sleep(3000)
  await page.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>/new key/i.test(e.innerText.trim())); if(b)b.click(); return 'ok';})()`)
  await sleep(2000)
  await page.evaluate(`(()=>{const el=document.getElementById('name'); if(!el)return 'no'; const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value'); d.set.call(el,'Main Key'); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return el.value;})()`)
  await sleep(500)
  await page.clickCenter(`const t=[...document.querySelectorAll('[role=dialog] *')].find(e=>/^select expiration$/i.test((e.innerText||'').trim())); if(!t)return 'none'; const el=t.closest('button,[role=combobox],[role=button]')||t; const r=el.getBoundingClientRect(); return JSON.stringify({x:r.x+r.width/2,y:r.y+r.height/2});`)
  await sleep(1100)
  await page.clickCenter(`const o=[...document.querySelectorAll('[role=option]')].find(e=>/^no expiration$/i.test(e.innerText.trim())); if(!o)return 'none'; const r=o.getBoundingClientRect(); return JSON.stringify({x:r.x+r.width/2,y:r.y+r.height/2});`)
  await sleep(1100)
  await page.clickCenter(`const t=[...document.querySelectorAll('[role=dialog] *')].find(e=>/^choose a credit limit$/i.test((e.innerText||'').trim())); if(!t)return 'none'; const el=t.closest('button,[role=combobox],[role=button]')||t; const r=el.getBoundingClientRect(); return JSON.stringify({x:r.x+r.width/2,y:r.y+r.height/2});`)
  await sleep(1100)
  await page.clickCenter(`const o=[...document.querySelectorAll('[role=option]')].find(e=>/^no limit$/i.test(e.innerText.trim())); if(!o)return 'none'; const r=o.getBoundingClientRect(); return JSON.stringify({x:r.x+r.width/2,y:r.y+r.height/2});`)
  await sleep(900)
  await page.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>/^create$/i.test(e.innerText.trim())&&!e.disabled); if(b)b.click(); return 'ok';})()`)
  await sleep(2500)
  await page.call("Browser.grantPermissions", { permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"], origin: "https://openrouter.ai" }).catch(() => {})
  await page.evaluate(`(()=>{const b=document.querySelector('[aria-label="Copy key to clipboard"]'); if(b)b.click(); return 'ok';})()`)
  await sleep(1000)
  return await page.evaluate(`navigator.clipboard.readText().then(t=>t).catch(e=>'ERR:'+e.message)`, true)
}

async function finishSignedIn(page) {
  await page.navigate("https://openrouter.ai/", 15000)
  await sleep(2500)
  await onboarding(page)
  return await createKey(page)
}

async function createAccount(client, { password, first, last, domain, log }) {
  const local = randLocal()
  let email = `${local}@${domain}`
  const runOnce = async () => {
    const page = await attachPage(client)
    await page.enable()
    return await createAccountBody(client, page, { local, password, first, last, domain, log })
  }
  try {
    // first run; on stale-session errors re-attach and retry once
    let result
    try {
      result = await runOnce()
    } catch (e) {
      if (/Session with given id not found|stale|Target closed|Cannot find context/i.test(String(e.message || e))) {
        log("  stale session, re-attaching and retrying…")
        await sleep(2500)
        // collapse to a single fresh tab before retrying
        try {
          const { targetInfos } = await client.send("Target.getTargets")
          const pages = targetInfos.filter((t) => t.type === "page" && !t.url.startsWith("chrome://") && !t.url.startsWith("devtools://"))
          // keep the first page alive; close the rest. If none, create one.
          if (pages.length === 0) {
            await client.send("Target.createTarget", { url: "about:blank" })
          } else {
            for (const p of pages.slice(1)) await client.send("Target.closeTarget", { targetId: p.targetId }).catch(() => {})
          }
          await sleep(1200)
        } catch {}
        result = await runOnce()
      } else throw e
    }
    email = result.email
    return result
  } catch (e) {
    return { email, ok: false, error: String(e.message || e) }
  }
}

async function createAccountBody(client, page, { local, password, first, last, domain, log }) {
  let email = `${local}@${domain}`
  try {
    // sign out any existing session
    await page.navigate("https://openrouter.ai/", 15000)
    await page.evaluate(`(async()=>{ if(window.Clerk){ try{ await window.Clerk.signOut(); }catch(e){} } return 'done'; })()`, true)
    await sleep(1500)

    // Zenvex address: set local, ensure domain, then SUBMIT via Open Inbox so the
    // session switches to the new address (a raw /inbox nav keeps the old session address).
    await page.navigate("https://zenvex.dev/")
    await page.evaluate(`(()=>{const i=[...document.querySelectorAll('input')].find(x=>!x.readOnly); const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value'); d.set.call(i,${JSON.stringify(local)}); i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new Event('change',{bubbles:true})); return i.value;})()`)
    await sleep(500)
    const shown = await page.evaluate(`(document.body.innerText.match(/@[a-z.]+/i)||[])[0]`)
    if (!new RegExp(domain.replace(".", "\\.")).test(shown || "")) {
      await page.clickCenter(`const t=[...document.querySelectorAll('button,[role=button]')].find(e=>/@/.test(e.innerText)&&e.innerText.length<30); if(!t)return 'none'; const r=t.getBoundingClientRect(); return JSON.stringify({x:r.x+r.width/2,y:r.y+r.height/2});`)
      await sleep(900)
      await page.clickCenter(`const o=[...document.querySelectorAll('li,a,button,[role=option],[role=menuitem]')].find(e=>e.innerText.trim().includes(${JSON.stringify(domain)})); if(!o)return 'none'; const r=o.getBoundingClientRect(); return JSON.stringify({x:r.x+r.width/2,y:r.y+r.height/2});`)
      await sleep(900)
    }
    // submit the address via the Open Inbox button
    await page.clickCenter(`const b=[...document.querySelectorAll('a,button')].find(e=>/open inbox/i.test(e.innerText)); if(!b)return 'none'; const r=b.getBoundingClientRect(); return JSON.stringify({x:r.x+r.width/2,y:r.y+r.height/2});`)
    await sleep(3500)
    // make sure we actually are on the inbox route for the new address
    let inboxAddr = await page.evaluate(`(document.body.innerText.match(/[a-z0-9]+@[a-z.]+/i)||[])[0]`)
    if (!inboxAddr || !inboxAddr.toLowerCase().startsWith(local.toLowerCase())) {
      await page.navigate("https://zenvex.dev/inbox", 12000)
      await sleep(2500)
      inboxAddr = await page.evaluate(`(document.body.innerText.match(/[a-z0-9]+@[a-z.]+/i)||[])[0]`)
    }
    if (!inboxAddr || !inboxAddr.toLowerCase().startsWith(local.toLowerCase())) {
      throw new Error("zenvex address mismatch: " + inboxAddr + " vs " + local)
    }
    email = inboxAddr
    log(`  inbox ready: ${email}`)

    // OpenRouter signup
    await page.navigate("https://openrouter.ai/sign-up", 15000)
    await sleep(2500)
    await page.evaluate(`(()=>{
      const set=(id,val)=>{const el=document.getElementById(id); if(!el)return false;
        const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
        d.set.call(el,val); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return true;};
      set('firstName-field',${JSON.stringify(first)});
      set('lastName-field',${JSON.stringify(last)});
      set('emailAddress-field',${JSON.stringify(email)});
      set('password-field',${JSON.stringify(password)});
      const c=document.getElementById('legalAccepted-field'); if(c&&!c.checked)c.click();
      return 'filled';})()`)
    await sleep(600)
    await page.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>/^continue$/i.test(e.innerText.trim())); if(b)b.click(); return 'ok';})()`)
    await sleep(5000)
    let url = await waitOutProtect(page)
    if (!String(url).includes("verify-email")) throw new Error("signup failed at " + url)
    log(`  signed up, awaiting verification`)

    // read verification link (inbox: select row then Enter)
    await page.navigate("https://zenvex.dev/inbox", 12000)
    await sleep(2500)
    if (!String(await page.evaluate("location.href")).includes("/inbox")) {
      await page.navigate("https://zenvex.dev/", 10000)
      await sleep(1500)
      await page.clickCenter(`const b=[...document.querySelectorAll('a,button')].find(e=>/open inbox/i.test(e.innerText)); if(!b)return 'none'; const r=b.getBoundingClientRect(); return JSON.stringify({x:r.x+r.width/2,y:r.y+r.height/2});`)
      await sleep(3500)
    }
    await page.clickCenter(`const e=[...document.querySelectorAll('*')].find(n=>/your sign up link/i.test(n.innerText||'')&&n.children.length===0); if(!e)return 'none'; const row=e.closest('article,[role=option]')||e.parentElement||e; const r=row.getBoundingClientRect(); return JSON.stringify({x:r.x+r.width/2,y:r.y+r.height/2});`)
    await sleep(800)
    await page.pressEnter(2)
    let link = ""
    for (let w = 0; w < 10 && !link; w++) {
      await sleep(1500)
      link = await page.evaluate(`(()=>{const a=[...document.querySelectorAll('a')].find(x=>x.href.includes('clerk.openrouter.ai/v1/verify')); return a?a.href:'';})()`)
    }
    if (!link || !String(link).includes("clerk.openrouter.ai")) throw new Error("no verification link")
    log(`  verification link found`)

    // verify in a new tab
    const created = await client.send("Target.createTarget", { url: link })
    await sleep(2000)
    const { sessionId } = await client.send("Target.attachToTarget", { targetId: created.targetId, flatten: true })
    const vpage = new Page(client, sessionId)
    await vpage.enable()
    await sleep(4000)
    url = await waitOutProtect(vpage)
    log(`  verified (${url})`)

    // onboarding + key on the verified tab
    const key = await finishSignedIn(vpage)
    if (!key || !String(key).startsWith("sk-or-v1-")) throw new Error("no key: " + key)
    return { email, key, ok: true }
  } catch (e) {
    return { email, ok: false, error: String(e.message || e) }
  }
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */
async function main() {
  if (!CDP) {
    console.error("ERROR: no CDP endpoint. Pass --cdp wss://... or set BU_CDP_WS")
    process.exit(1)
  }
  const fs = await import("fs/promises")
  console.log(`Connecting to browser…`)
  const client = await CdpClient.connect(CDP)
  console.log(`Creating ${COUNT} account(s). Password: ${PASSWORD}`)
  console.log(`Results -> ${OUT}`)
  const results = []
  for (let i = 1; i <= COUNT; i++) {
    console.log(`\n[${i}/${COUNT}] starting…`)
    const res = await createAccount(client, { password: PASSWORD, first: FIRST, last: LAST, domain: DOMAIN, log: (m) => console.log(m) })
    results.push(res)
    if (res.ok) console.log(`[${i}/${COUNT}] OK  ${res.email}  ${res.key}`)
    else console.log(`[${i}/${COUNT}] FAIL ${res.email}  ${res.error}`)
    await fs.appendFile(OUT, JSON.stringify({ ...res, created: new Date().toISOString() }) + "\n")
  }
  const ok = results.filter((r) => r.ok).length
  console.log(`\nDone. ${ok}/${COUNT} succeeded.`)
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
