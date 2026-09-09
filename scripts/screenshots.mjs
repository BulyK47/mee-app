// Real phone-resolution screenshots of the running app, by driving headless Chrome over the
// DevTools protocol. Node 22+ ships a WebSocket client, so this needs no dependencies.
//
//   node scripts/screenshots.mjs [url] [outDir]
//
// Also doubles as a verification channel: unlike the embedded preview pane, this browser really
// composites, so animations settle and what is captured is what a student would see.
import { spawn } from 'node:child_process'
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const URL_ = process.argv[2] || 'http://localhost:5176'
const OUT = process.argv[3] || '../poze/store'
// Play holds screenshots PER LANGUAGE, and en-US is this listing's default language - the one the
// rest of the world sees. A Romanian set uploaded there would be the listing's own screenshots
// contradicting its own text. Everything the run has to click is therefore looked up by language.
const LANG = (process.argv[4] || 'ro').toLowerCase()
// DOAR_GRAFICA=1 renders only the 1024×500 feature graphic. The eight screenshots take a minute of
// clicking through the app; the graphic is one paint, and it is the thing that gets iterated on.
const DOAR_GRAFICA = process.env.DOAR_GRAFICA === '1'

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
  console.error('Chrome not found. Looked in:\n  ' + CANDIDATES.filter(Boolean).join('\n  ') +
    '\nSet CHROME_PATH to the Chrome/Chromium binary and run again.')
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
chrome.on('error', e => { console.error(`Could not start Chrome (${CHROME}): ${e.message}`); process.exit(1) })

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

// Play has no caption field: a caption has to be part of the pixels. It is injected INTO the page
// rather than composited afterwards, so it is set in the app's own faces and its own tokens - a
// caption typeset in whatever font the image library happens to find looks like a sticker.
//
// Only the first three carry one, and only where the picture cannot speak for itself: that the
// dial and the trace are DRAWN, from the exercise's own data, is the claim the whole listing rests
// on and the one thing a screenshot of a dial cannot say by itself. The recap and the formula sheet
// are self-evident and stay clean.
// Every string the run clicks or types, in both languages: lesson titles come from the bank, the
// rest from src/i18n.tsx.
const T = {
  ro: { learn: '^Învață$', lab: 'Laboratorul meu', theory: 'Teorie', memorator: 'Memorator', close: 'Închide',
        lectii: ['Aparate analogice (1)', 'Semnale (2)', 'Punți de curent continuu'] },
  en: { learn: '^Learn$', lab: 'My Lab', theory: 'Theory', memorator: 'Formula sheet', close: 'Close',
        lectii: ['Analog instruments (1)', 'Signals (2)', 'DC bridges'] },
}[LANG]
if (!T) { console.error(`Unknown language "${LANG}". Use ro or en.`); process.exit(1) }

const LEGENDE_TOATE = {
  ro: {
    '1-harta': '15 module, 49 de lecții, în ordinea de la curs',
    '2-cadran': 'Cadranul e desenat din datele exercițiului, nu scanat',
    '3-osciloscop': 'Ecran de osciloscop, desenat: 2 V/div, 500 µs/div',
  },
  en: {
    '1-harta': '15 modules, 49 lessons, in the order they are taught',
    '2-cadran': 'The dial is drawn from the exercise data, not scanned',
    '3-osciloscop': 'An oscilloscope screen, drawn: 2 V/div, 500 µs/div',
  },
}
const LEGENDE = LEGENDE_TOATE[LANG]
const legendaOn = text => evaluate(`(() => {
  const H = 78;
  // The band is FIXED, and the overlays are pushed down with it. Shrinking #root alone was not
  // enough and the first run proved it: a lesson is a "fixed inset-0" layer, positioned against the
  // viewport rather than against #root, so it sailed straight over the caption - which is exactly
  // the two screens the caption exists for.
  const st = document.createElement('style');
  st.id = '__capstyle';
  st.textContent = '#__cap{position:fixed;top:0;left:0;right:0;height:' + H + 'px;z-index:2147483647;' +
    'display:flex;align-items:center;justify-content:center;text-align:center;padding:0 26px;' +
    'box-sizing:border-box;font-family:Chakra Petch,Inter,sans-serif;font-weight:600;font-size:16px;' +
    'line-height:1.25;letter-spacing:-.01em;text-wrap:balance;color:var(--color-fg);' +
    'background:var(--color-bg);border-bottom:1px solid var(--color-border)}' +
    '#root{height:calc(100% - ' + H + 'px);margin-top:' + H + 'px}' +
    '[role=dialog],[role=alertdialog]{top:' + H + 'px !important}';
  document.head.appendChild(st);
  const el = document.createElement('div');
  el.id = '__cap';
  el.textContent = ${JSON.stringify(text)};
  document.body.insertAdjacentElement('afterbegin', el);
  return true })()`)
const legendaOff = () => evaluate(`(() => {
  for (const id of ['__cap','__capstyle']) { const e=document.getElementById(id); if(e) e.remove() }
  return true })()`)

const shot = async (name) => {
  const legenda = LEGENDE[name]
  if (legenda) { await legendaOn(legenda); await sleep(500) }
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(data, 'base64'))
  if (legenda) await legendaOff()
  console.log('  ▸', name + '.png' + (legenda ? '   legendă: ' + legenda : ''))
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
// Opening a lesson BY TITLE rather than by "the first unlocked node". The blind version is what put
// a text card in the store listing: 32 of the 49 lessons open on a concept-card visual, so a click on
// whatever came first had a 65% chance of showing the one thing this app is not - a quiz with a box
// of text. The lesson row is the button that carries the title; the round node beside it is
// aria-hidden and refuses .click() anyway.
window.__lesson = t => [...document.querySelectorAll('button')].find(b => !b.disabled && (b.innerText||'').includes(t));
// What is actually on screen, so the run can be checked from its own log instead of by opening
// eight PNGs: the exercise prompt, and whether a figure was drawn for it.
window.__what = () => { const d = document.querySelector('[role=dialog]'); if (!d) return 'NO DIALOG';
  const h = d.querySelector('h2, .font-semibold'); const svg = d.querySelector('svg:not([aria-hidden=true])');
  return (h ? h.innerText.slice(0,60) : '?') + ' | figura: ' + (svg ? 'DA' : 'nu') };
window.__setInput = v => { const i = window.__card().querySelector('input'); if (!i) return false;
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(i, v);
  i.dispatchEvent(new Event('input',{bubbles:true})); return true };
// Leaving a lesson or an exam raises the app's OWN confirmation sheet, not window.confirm — the
// code gate forbids the native one precisely because a WebView may not show it. Overriding
// window.confirm therefore did nothing: the sheet stayed up, and 6-memorator was captured as the
// exam screen with a modal over it. Dismiss the real sheet by pressing its primary button.
// role is "alertdialog", not "dialog" — Confirm.tsx. Matching only [role=dialog] silently found
// nothing and the sheet stayed up, which is the whole bug this helper exists to fix.
window.__yes = () => { const d = document.querySelector('[role=alertdialog]'); if (!d) return false;
  const b = [...d.querySelectorAll('button')].find(x => /^(Ieși|Exit|Da|Yes)$/i.test(x.innerText.trim()));
  if (!b) return false; window.__fire(b); return true };
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
// roughly 44 Volts each, plus daily quests, funds the 985 Volts of instruments and the 250 of the
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
localStorage.setItem('meem_lang','${LANG}');
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
// The two one-off hint bands, seeded as already read. Everything else about this profile says a
// student twelve days and twenty-six lessons in — leaving the beginners' bands on top of that is
// incoherent, and on the map capture the band would sit directly under the burned-in caption, two
// stacked strips of small text competing for the same corner of a store screenshot. This is the
// same kind of decision as seeding the streak and the finished lessons: the captures show the app
// in steady use, not on its first launch.
localStorage.setItem('meem_hints', JSON.stringify(['learn','lab']));
true`

console.log(`capturing at 412×915 @3× · ${LANG} →`, OUT)

// Exit whatever lesson is open: the X in the player header, then the app's OWN confirmation sheet.
async function exitLesson() {
  // Wrapped in an IIFE, not a bare `const`: Runtime.evaluate shares one global scope across the
  // whole run, so the second lesson would die with "Identifier 'x' has already been declared".
  await evaluate('(() => { const x=[...document.querySelectorAll("button[aria-label]")].find(b=>/Ieși|exit/i.test(b.getAttribute("aria-label")||"")); if(x) window.__fire(x); return true })()')
  await sleep(700)
  await evaluate('window.__yes(); true')
  await sleep(1000)
}

// Open a lesson by title, report what landed on screen, capture. The report is the point: a silent
// miss here is what published a text card as "the app draws its own figures".
async function lessonShot(title, name) {
  await evaluate(`window.__fire(window.__lesson(${JSON.stringify(title)})); true`)
  await sleep(1700)
  const what = await evaluate('window.__what()')
  console.log(`    ${title} → ${what}`)
  if (String(what).endsWith('nu') || what === 'NO DIALOG') {
    throw new Error(`"${title}" did not open on a drawn figure (${what}). The listing must not claim figures it cannot show.`)
  }
  await shot(name)
  await exitLesson()
}

// The NUMBER in each file name is the position in the store listing, not the order of capture:
// Play shows the first three or four prominently, so the two drawn figures come straight after the
// map, and the lab - which used to be second - moves to fourth. The capture order below is simply
// whatever costs the fewest screen transitions.
await goto(URL_)
if (!DOAR_GRAFICA) {
await evaluate(SEED)
await goto(URL_)
await evaluate(HELPERS)
await sleep(1200)
await shot('1-harta')

// My Lab
await evaluate(`window.__fire(window.__btn(new RegExp(${JSON.stringify(T.lab)}))); true`); await sleep(1400)
await shot('4-laborator')
await evaluate(`window.__fire(window.__btn(new RegExp(${JSON.stringify(T.learn)}))); true`); await sleep(900)

// The three figures the description promises and no capture used to show. Each of these lessons
// opens ON its drawn exercise — verified against the bank, not hoped for:
//   analog dial (meter), oscilloscope screen (scope), measuring bridge (bridge).
await lessonShot(T.lectii[0], '2-cadran')
await lessonShot(T.lectii[1], '3-osciloscop')
await lessonShot(T.lectii[2], '5-punte')

// The theory recap
await evaluate(`window.__fire([...document.querySelectorAll("button")].find(b => b.innerText.trim() === ${JSON.stringify(T.theory)})); true`); await sleep(1500)
await shot('6-teorie')

// The formula sheet
await evaluate(`(() => { const b=window.__btn(new RegExp(${JSON.stringify(T.close)})); if(b) window.__fire(b); return true })()`); await sleep(800)
await evaluate(`window.__fire(window.__aria(${JSON.stringify(T.memorator)})); true`); await sleep(1500)
await shot('7-memorator')

// The light theme, on the course map: a whole second look at the app, and the only screen that can
// show it. usePersisted stores JSON, so the value is a quoted string.
await evaluate('localStorage.setItem("meem_theme", JSON.stringify("light")); true')
await goto(URL_); await sleep(1400)
await shot('8-tema-luminoasa')
}

// ─── the 1024×500 feature graphic, in both languages ────────────────────────
// It used to be a hand-made file: one language, and nothing to regenerate it from. Play shows the
// graphic per language, so an en-US listing was going to carry Romanian marketing text. Rendering it
// here, inside the running app, is what gets it the app's own faces and tokens - the page already
// has Chakra Petch loaded and :root already carries the palette.
const GRAFICA_TOATE = {
  ro: { titlu: 'Măsurări Electrice și Electronice',
        r1: '15 module · 305 exerciții · laborator virtual',
        r2: 'funcționează offline · fără reclame · fără cont' },
  en: { titlu: 'Electrical and Electronic Measurements',
           r1: '15 modules · 305 exercises · virtual lab',
           r2: 'works offline · no ads · no account' },
}
const ICON = 'data:image/png;base64,' + readFileSync('../poze/play/icon-512-play.png').toString('base64')

await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 500, deviceScaleFactor: 1, mobile: false })
await goto(URL_)
const GRAFICA = { [LANG === 'ro' ? '' : '-' + LANG]: GRAFICA_TOATE[LANG] }
for (const [sufix, t] of Object.entries(GRAFICA)) {
  await evaluate(`(() => {
    document.documentElement.dataset.theme = 'dark';
    document.body.innerHTML = ${JSON.stringify(`
      <div style="position:fixed;inset:0;background:#0A0E12;overflow:hidden;display:flex;align-items:center;gap:54px;padding:0 64px;box-sizing:border-box">
        <div style="position:absolute;inset:0;opacity:.5;background:
          repeating-linear-gradient(0deg,transparent 0 79px,#1E2A36 79px 80px),
          repeating-linear-gradient(90deg,transparent 0 79px,#1E2A36 79px 80px)"></div>
        <div style="position:absolute;left:-120px;top:-60px;width:560px;height:620px;border-radius:50%;
          background:radial-gradient(circle,#12C77E33,transparent 65%)"></div>
        <svg viewBox="0 0 1024 500" style="position:absolute;inset:0" preserveAspectRatio="none">
          <!-- The curve has to MISS the text block (x 330-930, y 140-360): the first version ran
               straight through "no ads". It crosses high where the icon covers it, dips under the
               copy, and only climbs again to the right of the last line. -->
          <!-- One continuous curve, kept out of the text by geometry rather than by luck: the block
               sits from x=330 to x=930 between y=140 and y=360, so the descent is forced into the
               gutter between the icon and the text, and the trough stays below y=420 for the whole
               width of the block. The first render struck a line straight through "no ads"; the
               second avoided it by breaking the wave in two, which read as a hook. -->
          <path d="M-20 300 C 90 300, 150 150, 230 150 C 300 150, 300 380, 352 430 S 660 495, 840 440 S 980 260, 1044 150"
            fill="none" stroke="#2BF5A0" stroke-width="5" stroke-linecap="round" opacity=".95"
            style="filter:drop-shadow(0 0 18px #2BF5A088)"/>
        </svg>
        <img src="${ICON}" alt="" style="position:relative;width:212px;height:212px;border-radius:46px;flex:none">
        <div style="position:relative">
          <div style="font-family:Chakra Petch,Inter,sans-serif;font-weight:600;font-size:76px;line-height:1;
            letter-spacing:.14em;color:#E8F0F4">MEE</div>
          <div style="font-family:Chakra Petch,Inter,sans-serif;font-weight:600;font-size:31px;line-height:1.2;
            margin-top:16px;color:#2BF5A0">${t.titlu}</div>
          <div style="font-family:Inter,sans-serif;font-size:21px;line-height:1.55;margin-top:18px;color:#B6C6D2">${t.r1}</div>
          <div style="font-family:Inter,sans-serif;font-size:21px;line-height:1.55;color:#9DB0BC">${t.r2}</div>
        </div>
      </div>`)};
    return true })()`)
  await sleep(700)
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  writeFileSync(`${OUT}/feature-graphic-1024x500${sufix}.png`, Buffer.from(data, 'base64'))
  console.log('  ▸ feature-graphic-1024x500' + sufix + '.png')
}

console.log('done')
ws.close()
chrome.kill()
process.exit(0)
