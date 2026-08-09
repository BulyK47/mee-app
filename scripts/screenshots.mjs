// Real phone-resolution screenshots of the running app, by driving headless Chrome over the
// DevTools protocol. Node 22+ ships a WebSocket client, so this needs no dependencies.
//
//   node scripts/screenshots.mjs [url] [outDir]
//
// Also doubles as a verification channel: unlike the embedded preview pane, this browser really
// composites, so animations settle and what is captured is what a student would see.
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const URL_ = process.argv[2] || 'http://localhost:5176'
const OUT = process.argv[3] || '../poze/store'

// This script is exposed as `npm run shots` in a public package.json, so it has to be findable on
// something other than the machine it was written on. It used to hold one hard-coded Windows path
// and spawn it unconditionally with stdio ignored — on macOS, on Linux, or on a Windows box with
// Chrome installed anywhere else, that fails with ENOENT into a silence the caller never sees, and
// the script then waits for a DevTools port that will never open.
const CANDIDATES = process.platform === 'darwin'
  ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
     '/Applications/Chromium.app/Contents/MacOS/Chromium']
  : process.platform === 'win32'
    ? ['C:/Program Files/Google/Chrome/Application/chrome.exe',
       'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
       (process.env.LOCALAPPDATA || '') + '/Google/Chrome/Application/chrome.exe']
    : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
       '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium']

const CHROME = process.env.CHROME_PATH || CANDIDATES.find(p => p && existsSync(p))
if (!CHROME) {
  console.error('Chrome nu a fost găsit. Caut în:\n  ' + CANDIDATES.filter(Boolean).join('\n  ') +
    '\nSetează CHROME_PATH către binarul Chrome/Chromium și reia.')
  process.exit(1)
}
const PROFILE = join(tmpdir(), 'mee-shots-profile')

mkdirSync(OUT, { recursive: true })
try { rmSync(PROFILE, { recursive: true, force: true }) } catch { /* first run */ }

const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9222', '--disable-gpu', '--hide-scrollbars',
  '--no-first-run', '--no-default-browser-check', '--user-data-dir=' + PROFILE,
  '--window-size=412,915', 'about:blank',
], { stdio: 'ignore' })
// a spawn that fails asynchronously (ENOENT, EACCES) otherwise leaves the script hanging on a
// DevTools port that never opens, with nothing printed
chrome.on('error', e => { console.error(`Nu am putut porni Chrome (${CHROME}): ${e.message}`); process.exit(1) })

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── minimal CDP client ─────────────────────────────────────────────────────
let ws, id = 0
const pending = new Map()
const send = (method, params = {}) => new Promise((res, rej) => {
  const n = ++id
  pending.set(n, { res, rej })
  ws.send(JSON.stringify({ id: n, method, params }))
})
const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval failed')
  return r.result?.value
}

async function connect() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch('http://localhost:9222/json/list')).json()
      const page = list.find(t => t.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch { /* not up yet */ }
    await sleep(250)
  }
  throw new Error('Chrome did not expose a debugging target')
}

const wsUrl = await connect()
ws = new WebSocket(wsUrl)
await new Promise(r => { ws.onopen = r })
ws.onmessage = e => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result) }
}

await send('Page.enable'); await send('Runtime.enable')
// a modern flagship portrait: 412×915 CSS px at 3× → 1236×2745 PNG, well inside store limits
await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 3, mobile: true })

const goto = async (url) => { await send('Page.navigate', { url }); await sleep(2200) }
const shot = async (name) => {
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(data, 'base64'))
  console.log('  ▸', name + '.png')
}

// helper injected into the page: real pointer events, because the lesson nodes ignore .click()
const HELPERS = `
window.__fire = el => { const r = el.getBoundingClientRect(), o = {bubbles:true,cancelable:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2,pointerId:1,isPrimary:true,button:0,buttons:1};
  ['pointerdown','mousedown'].forEach(t => el.dispatchEvent(new (t[0]==='p'?PointerEvent:MouseEvent)(t,o)));
  ['pointerup','mouseup','click'].forEach(t => el.dispatchEvent(new (t[0]==='p'?PointerEvent:MouseEvent)(t,{...o,buttons:0}))) };
window.__btn = re => [...document.querySelectorAll('button')].find(b => re.test(b.innerText));
window.__aria = s => [...document.querySelectorAll('button[aria-label]')].find(b => b.getAttribute('aria-label') === s);
window.__card = () => [...document.querySelectorAll('div')].filter(d => /Verifică|Continuă|Lecție terminată/.test(d.innerText||'') && d.querySelectorAll('button').length > 1).pop();
window.__node = () => [...document.querySelectorAll('button')].find(b => !b.disabled && /h-14 w-14/.test(b.className) && /text-ink-950/.test(b.className));
window.__setInput = v => { const i = window.__card().querySelector('input'); if (!i) return false;
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(i, v);
  i.dispatchEvent(new Event('input',{bubbles:true})); return true };
true`

// a profile that looks like a student halfway through the course, so the screens are not empty.
//
// The three dated records MUST use the LOCAL day: the app compares them against its own
// localToday(), so a UTC stamp makes them read as yesterday's — and between local midnight and
// 03:00 (Romania is UTC+2/+3) the streak, the daily goal and every quest would silently render at
// zero. That is precisely the empty state this seed exists to avoid, in the store-listing images.
//
// The bench has NINE slots. Seeding three instruments left it 66% flat dark with 2% coloured
// pixels — measured on the captured PNG — which is a poor second image in a store listing, the
// slot that decides whether anyone keeps scrolling. The whole measurement bench is seeded instead,
// plus the bronze lab template, which is what puts a frame and a warm accent into an otherwise
// very dark room.
//
// The numbers are kept INTERNALLY COHERENT rather than merely flattering: 26 finished lessons at
// roughly 44 Volți each, plus daily quests, funds the 985 Volți of instruments and the 250 of the
// template with about a hundred left over. A store image should show a state a student can
// actually reach, and this one is reachable by the arithmetic the app itself uses.
const SEED = `
const D = new Date();
const TODAY = D.getFullYear() + '-' + String(D.getMonth()+1).padStart(2,'0') + '-' + String(D.getDate()).padStart(2,'0');
const LECTII = ['m01-l1','m01-gl1','m01-gl2','m02-l1','m02-gl1','m02-gl2',
  'm03-l1','m03-l2','m03-l3','m03-l4','m03-gl1','m03-gl2',
  'm04-l1','m04-l2','m04-l3','m04-l4','m04-l5','m04-l6','m04-l7',
  'm05-l1','m05-l2','m05-l3','m05-ex','m06-l1','m06-l2','m06-ex'];
const NOTE = [100,86,100,92,78,100,94,100,88,100,90,100,100,82,96,100,74,100,90,100,88,100,92,100,84,100];
const best = {}, plays = {};
LECTII.forEach((id,i) => { best[id] = NOTE[i]; plays[id] = 1; });
localStorage.clear();
localStorage.setItem('meem_onboarded','true');
localStorage.setItem('meem_lang','ro');
localStorage.setItem('meem_xp','2600');
localStorage.setItem('meem_coins','120');
localStorage.setItem('meem_streak', JSON.stringify({count:12,last:TODAY}));
localStorage.setItem('meem_daily', JSON.stringify({date:TODAY, xp:25}));
localStorage.setItem('meem_completed', JSON.stringify(LECTII));
localStorage.setItem('meem_best', JSON.stringify(best));
localStorage.setItem('meem_plays', JSON.stringify(plays));
localStorage.setItem('meem_inventory', JSON.stringify(
  ['analog-vm','dmm','scope','lcr','analog-am','clamp','emeter','current-transformer','voltage-transformer','lab-bronze']));
localStorage.setItem('meem_skins', JSON.stringify({'__lab__':'lab-bronze'}));
localStorage.setItem('meem_quests', JSON.stringify({date:TODAY,lessons:1,xp:25,perfect:1,reviews:0,exam:0,claimed:[]}));
true`

console.log('capturing at 412×915 @3× →', OUT)
await goto(URL_)
await evaluate(SEED)
await goto(URL_)
await evaluate(HELPERS)
await sleep(1200)
await shot('1-harta')

// My Lab
await evaluate('window.__fire(window.__btn(/Laboratorul meu/)); true'); await sleep(1400)
await shot('2-laborator')

// back to the map, then a question with a figure
await evaluate('window.__fire(window.__btn(/^Învață$/)); true'); await sleep(900)
await evaluate('window.__fire(window.__node()); true'); await sleep(1600)
await shot('3-intrebare')

// the theory recap
await evaluate(`const c = window.__card(); if (c) { const x = [...c.querySelectorAll('button[aria-label]')].find(b => /Ieși|exit/i.test(b.getAttribute('aria-label')||'')); window.confirm = () => true; if (x) window.__fire(x) } true`)
await sleep(1000)
await evaluate('window.__fire([...document.querySelectorAll("button")].find(b => b.innerText.trim() === "Teorie")); true'); await sleep(1500)
await shot('4-teorie')

// exam simulation
await evaluate('const b=window.__btn(/Închide/); if(b) window.__fire(b); true'); await sleep(800)
await evaluate('window.__fire(window.__btn(/Simulare de examen/)); true'); await sleep(1800)
await shot('5-examen')

// the formula sheet
await evaluate('window.confirm = () => true; const x=[...document.querySelectorAll("button[aria-label]")].find(b=>/Ieși|exit/i.test(b.getAttribute("aria-label")||"")); if(x) window.__fire(x); true')
await sleep(1000)
await evaluate('window.__fire(window.__aria("Memorator")); true'); await sleep(1500)
await shot('6-memorator')

console.log('done')
ws.close()
chrome.kill()
process.exit(0)
