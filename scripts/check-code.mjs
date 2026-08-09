// Platform-assumption guards — run: node scripts/check-code.mjs
//
// Every user-reported bug in this app so far came from the same place: code that is correct in a
// desktop browser tab and silently dead in an Android WebView. None of them threw, none showed in
// the console, and no type error or build failure could have caught them — only a person tapping
// the button noticed. These are the guards for the ones already paid for.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) ? [p] : []
  })
}

// String and template literals always go, so a rule about `mailto:` does not fire on a message that
// merely mentions it. Comments are optional: a rule about a *missing* explanation has to be able to
// see the explanation, while a rule about forbidden calls must not fire on the comment that says
// why the call was removed.
const stripStrings = s => s
  .replace(/`(?:[^`\\]|\\.)*`/g, '``')
  .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
  .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
const stripComments = s => s
  .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))   // keep line numbers intact
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')

// True for every line that sits inside a try block. An unguarded localStorage read is fatal; the
// same read wrapped in try/catch is the fix, so the rule has to tell them apart.
function linesInsideTry(src) {
  const stack = []
  let open = 0
  const flags = []
  let line = 0
  // A line counts as guarded if it was inside a try at ANY point, not just at its end: the common
  // one-liner `try { localStorage.setItem(…) } catch { … }` opens and closes on the same line.
  let seen = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (c === '\n') { flags[line++] = seen || open > 0; seen = false; continue }
    if (c === '{') {
      const isTry = /\btry\s*$/.test(src.slice(Math.max(0, i - 10), i))
      stack.push(isTry)
      if (isTry) open++
    } else if (c === '}') {
      if (stack.pop()) open--
    }
    if (open > 0) seen = true
  }
  flags[line] = seen || open > 0
  return flags
}

const RULES = [
  {
    id: 'native-dialog',
    comments: 'strip',
    why: 'A browser suppresses repeated confirm()/alert() ("prevent this page from creating additional dialogs") and an Android WebView ignores them entirely — the button becomes a silent no-op. Use ui/Confirm.tsx.',
    test: /(?:^|[^.\w])(?:window\.)?(?:confirm|alert|prompt)\s*\(/,
  },
  {
    id: 'empty-catch',
    comments: 'keep',   // a comment inside the catch IS the required explanation
    why: 'An empty catch swallows the very TypeError that tells you an API is missing on this platform. Say in a comment what is being ignored and why.',
    test: /catch\s*(?:\([^)]*\))?\s*\{\s*\}/,
  },
  {
    id: 'unguarded-localStorage',
    comments: 'strip',
    onlyOutsideTry: true,
    why: 'localStorage THROWS (not returns null) in private mode, with site data blocked, or in a WebView started without storage — an unguarded read in a provider kills the app before first paint. Use src/storage.ts or wrap it in try/catch.',
    test: /(?:^|[^.\w])localStorage\s*[.[]/,
    allow: ['src/storage.ts'],
  },
  {
    id: 'mailto-navigation',
    comments: 'strip',
    strings: 'keep',   // the pattern lives INSIDE the string literal, so it must survive
    why: 'Assigning a mailto: URL to location.href is dropped by an Android WebView and by any desktop with no mail client, with no error. Show the address in-app and offer a real <a href>.',
    test: /location\s*(?:\.href)?\s*=\s*["'`]?mailto:|location\.assign\(\s*["'`]mailto:/,
  },
  {
    id: 'hardcoded-figure-colour',
    comments: 'strip',
    strings: 'keep',   // the hex lives inside the literal
    why: 'A hex colour written into a figure is frozen at whatever theme it was picked for. Three of these shipped: #38D6E3 was literally cyan-500, so the light theme rendered it at 1.77:1 instead of ACCENT\'s 5.14; #FF8A8A on the panel read 2.27:1; #2b4a3a read 1.66:1 on the DARK panel. Use a var(--color-*) token. The screen palette below is exempt: those are painted on the oscilloscope\'s fixed #04120b glass, which does not follow the theme.',
    // Exempt by CONTEXT, not by value. A value allowlist cannot work here: #38D6E3 is a legitimate
    // trace colour on the glass AND was the frozen label ink on the panel, so allowing the hex
    // would wave the defect straight through — which is exactly what the first version of this
    // rule did until it was tested. These four patterns are the lines that paint the screen itself.
    allowLine: [
      /const col = \(/,                    // Scope's trace-colour map, drawn on the glass
      /fill="#(?:04120b|0c1218)"/,         // the screen bed and the instrument face
      /grid\.push\(/,                      // the graticule
      /cursors\.map\(/,                    // the measurement cursors, on the glass
    ],
    onlyIn: 'src/visuals/',
    test: /#[0-9A-Fa-f]{6}\b/,
  },
  {
    id: 'one-axis-tap-target',
    comments: 'strip',
    strings: 'keep',   // the utilities live inside the className literal
    why: 'A ::before that widens a small control to a 44px tap target must name BOTH axes. `before:-inset-y-2` on its own leaves left/right at `auto`, which resolve to the static position: the pseudo-element comes out full height and ZERO px wide, so the target does not grow at all and nothing about the rendering says so. Measured on the quests claim button, which shipped that way. Use `before:-inset-N` for all four sides, or pair `before:-inset-y-N` with `before:inset-x-0` / `before:-inset-x-N`.',
    // Matches only the broken shape: has before:absolute, is NOT the all-sides `before:-inset-N`
    // form, and is missing at least one of the two axes.
    test: /^(?=.*before:absolute)(?!.*before:-?inset-[0-9])(?:(?!.*before:-?inset-x-)|(?!.*before:-?inset-y-))/,
  },
  {
    id: 'icon-button-needs-a-name',
    comments: 'strip',
    strings: 'keep',   // aria-label sits in the attribute list, which stripStrings would remove
    why: 'A <button> whose only child is an <Icon> has NO accessible name: an icon is a drawing, and the element carries no text for a screen reader to read. It must either say what it does (aria-label) or, if it is a decorative duplicate of a real control next to it, be taken out of the accessibility tree entirely (aria-hidden="true" plus tabindex="-1", the way the round lesson nodes on the Learn screen are). Measured on the live app: 123 buttons, 49 of them icon-only — all 49 correctly hidden, which is exactly the state this rule exists to keep.',
    // Only the unambiguous shape: opened and closed on one line, single <Icon> child, neither
    // aria-label nor aria-hidden present. Buttons that also contain text are not matched, because
    // their text already names them.
    test: /<button(?![^>]*aria-label)(?![^>]*aria-hidden)[^>]*>\s*(?:\{[^}]*\}\s*)?<Icon[^>]*\/>\s*<\/button>/,
  },
]

let failures = 0
const files = walk(SRC)
for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  const raw = readFileSync(file, 'utf8')
  const stripped = stripComments(stripStrings(raw))
  const inTry = linesInsideTry(stripped)
  for (const rule of RULES) {
    if (rule.allow?.includes(rel)) continue
    const body = rule.strings === 'keep' ? raw : stripStrings(raw)
    const lines = (rule.comments === 'keep' ? body : stripComments(body)).split('\n')
    if (rule.onlyIn && !rel.startsWith(rule.onlyIn)) continue
    lines.forEach((line, i) => {
      if (!rule.test.test(line)) return
      if (rule.onlyOutsideTry && inTry[i]) return
      if (rule.allowLine?.some(re => re.test(line))) return
      failures++
      console.log(`${rel}:${i + 1}  [${rule.id}]`)
      console.log(`    ${line.trim().slice(0, 110)}`)
      console.log(`    → ${rule.why}`)
    })
  }
}

console.log(`\nscanned ${files.length} source files · ${failures} violation${failures === 1 ? '' : 's'}`)
process.exit(failures > 0 ? 1 : 0)
