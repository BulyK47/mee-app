// Invariants that are cheap to assert and expensive to discover by hand. Every check here exists
// because the thing it guards actually broke at least once, and none of them is a matter of taste.
//
// Deliberately NOT in check-content.mjs: that one imports the TypeScript content modules, so it is
// bound to a Node version and to what those modules can import. This file reads the JSON directly
// and stays runnable anywhere.
//
// Nothing printed here may quote an answer key. Failures name the exercise and describe the shape
// of the problem — enough to find it, not enough to leak the bank into a log or a CI transcript.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')

// BOTH content locations, exactly as src/content/course.ts globs them. This used to point only at
// content-private/ and exit(0) when that folder was missing — so in a clone without the bank (which
// is what a contributor, and any CI job, actually has) the whole file passed in silence, without
// opening even the demo module that IS committed. A gate that reports green without reading
// anything is worse than no gate: it is a badge that means nothing.
const PRIV_WORLDS = join(ROOT, 'content-private/worlds')
const PRIV_RECAPS = join(ROOT, 'content-private/recaps')
const WORLD_DIRS = [PRIV_WORLDS, join(ROOT, 'src/content/worlds')].filter(existsSync)
const RECAP_DIRS = [PRIV_RECAPS, join(ROOT, 'src/content/recaps')].filter(existsSync)

const jsonIn = dirs => dirs.flatMap(d => readdirSync(d).filter(f => f.endsWith('.json')).map(f => join(d, f))).sort()

const worlds = jsonIn(WORLD_DIRS)
if (!worlds.length) {
  console.log('no content files found — nothing to check')
  process.exit(0)
}
const load = p => JSON.parse(readFileSync(p, 'utf8'))
// messages name the file, not the path: "M07.json:c1-10" stays findable and stays short
const base = p => p.slice(p.replace(/\\/g, '/').lastIndexOf('/') + 1)
const exercises = []
const lessons = []
for (const f of worlds) {
  const w = load(f)
  for (const l of w.lessons) {
    lessons.push({ ...l, _world: w.worldId, _id: `${w.worldId}:${l.id}` })
    for (const e of l.exercises || []) exercises.push({ ...e, _world: w.worldId, _lesson: l.id, _id: `${w.worldId}:${e.id}` })
  }
}

const fail = []
const add = (check, id, msg) => fail.push({ check, id, msg })

// ── 0. a lesson must have exercises ──────────────────────────────────────────
// course.ts drops empty lessons so they cannot crash the player, which means an author who saves a
// lesson mid-edit gets silence instead of a missing lesson they can explain. This is the telling.
for (const l of lessons)
  if (!Array.isArray(l.exercises) || l.exercises.length === 0)
    add('lessons', l._id, 'lesson with no exercises — it will never be offered to a student')

// ── 1. content JSON must round-trip byte-for-byte ────────────────────────────
// Any tool that rewrites a world file has to reproduce the on-disk formatting exactly, or every
// later diff is noise. The format is JSON.stringify(obj, null, 1) + '\n'.
for (const f of worlds) {
  const raw = readFileSync(f, 'utf8')
  if (JSON.stringify(JSON.parse(raw), null, 1) + '\n' !== raw)
    add('format-json', base(f), 'does not reproduce byte-for-byte from JSON.stringify(obj, null, 1) + newline')
}

// ── 2. answer options must be structurally answerable ────────────────────────
// A key pointing at an option that does not exist makes the question impossible; two options with
// the same text mark one of two identical answers wrong. Compared on RAW text: squashing
// punctuation turns "√((1/T)·∫₀ᵀ x² dt)" and "(1/T)·∫₀ᵀ x² dt" into the same string.
const norm = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim()
for (const e of exercises) {
  if (!['mcq', 'multi'].includes(e.type)) continue
  const ids = (e.choices || []).map(c => String(c.id))
  const keys = (Array.isArray(e.correct) ? e.correct : [e.correct]).map(String)
  for (const k of keys) if (!ids.includes(k)) add('choices', e._id, `the key points at an option that does not exist`)
  if (new Set(ids).size !== ids.length) add('choices', e._id, 'duplicate option id')
  if (ids.length < 2) add('choices', e._id, `has ${ids.length} option(s)`)
  if (e.type === 'mcq' && keys.length !== 1) add('choices', e._id, `mcq with ${keys.length} keys`)
  if (e.type === 'multi' && keys.length < 2) add('choices', e._id, `multi with ${keys.length} keys`)
  if (e.type === 'multi' && keys.length === ids.length) add('choices', e._id, 'every option is correct')
  for (const lang of ['ro', 'en']) {
    const seen = new Set()
    for (const c of e.choices || []) {
      const lab = c.label?.[lang]
      if (!lab || !String(lab).trim()) { add('choices', e._id, `option ${c.id} has no text [${lang}]`); continue }
      if (seen.has(norm(lab))) add('choices', e._id, `two options with identical text [${lang}]`)
      seen.add(norm(lab))
    }
  }
}

// ── 3. an explanation must reach its own answer ──────────────────────────────
// If the derivation lands on a different number than the key, the student is told two different
// things and one of them marks them wrong.
const numsIn = s => [...String(s).matchAll(/-?\d[\d  ]*(?:[.,]\d+)?/g)]
  .map(m => parseFloat(m[0].replace(/[  ]/g, '').replace(',', '.'))).filter(Number.isFinite)
const near = (key, v) => {
  if (key === v) return true
  const dec = (String(key).split('.')[1] || '').length
  return Math.abs(key - v) <= Math.pow(10, -dec) / 2 + 1e-9
}
for (const e of exercises) {
  if (e.type !== 'numeric' || e.answer == null || !e.explanation) continue
  for (const lang of ['ro', 'en']) {
    const txt = e.explanation[lang]
    if (txt && !numsIn(txt).some(v => near(e.answer, v)))
      add('explanation', e._id, `the explanation [${lang}] never reaches the keyed value`)
  }
}

// ── 3b. a large answer must warn about the thousands separator ───────────────
// parseNum treats a point as a decimal mark, always. A Romanian student who computes 245000 and
// writes it the way school taught them — "245.000" — is read as 245 and marked wrong for a correct
// answer. It is not safely fixable in the parser: "digits + separator + exactly three digits" is
// also what a student typing extra precision produces (0,866 for a keyed 0,87, which the tolerance
// accepts today), so any silent reinterpretation trades one wrongly-marked student for another.
// The instruction is therefore part of the prompt, and this keeps it there as answers are added.
for (const e of exercises) {
  if (e.type !== 'numeric' || e.answer == null || Math.abs(e.answer) < 1000) continue
  if (!/separator de mii/i.test(e.prompt?.ro || '') || !/thousands separator/i.test(e.prompt?.en || ''))
    add('separator', e._id, `answer ${e.answer} ≥ 1000 but the prompt does not say "fără separator de mii" / "thousands separator" in both languages`)
}

// ── 3c. no answer may need three decimals ────────────────────────────────────
// Not a style rule — a boundary the input depends on. The keypad withholds the decimal key on
// integerOnly exercises, and every judgement about what a typed separator can mean was made against
// a bank whose deepest answer has two decimals. An answer needing three would put a legitimate
// "0,866" and a grouped "245.000" into the same shape, and there is no rule that reads both right.
for (const e of exercises) {
  if (e.type !== 'numeric' || e.answer == null) continue
  const dec = (String(e.answer).split('.')[1] || '').length
  if (dec >= 3) add('separator', e._id, `the answer ${e.answer} has ${dec} decimals — see the comment above, two is the most the input can carry`)
}

// ── 3d. a recap file is named after the module it holds, and holds it alone ──
// recaps.ts keys by worldId and assigns with `map[r.worldId] = r`: two files claiming one module
// means one silently overwrites the other, in glob order, with no warning anywhere. That was one
// mistaken file away — eight of the fifteen recaps used to be named W1…W8 while holding M01, M05,
// M03…, so anyone looking for "the M04 recap", not finding M04.json, and creating it would have
// shadowed W6.json and never known. Names match their worldId now; this keeps it that way.
{
  const byWorld = {}
  for (const p of jsonIn(RECAP_DIRS)) {
    const f = base(p)
    const r = load(p)
    if (!r.worldId) { add('recap', f, 'no worldId — it will never be loaded'); continue }
    // `M01.demo.json` is the committed placeholder for `M01`; the suffix is how course.ts knows to
    // drop it once the real module exists, so it is a legal name, not a mismatch.
    if (f.replace(/(\.demo)?\.json$/, '') !== r.worldId) add('recap', f, `the filename is not ${r.worldId}.json`)
    // Two files for one module only collide if they are BOTH real; a demo and its replacement is
    // exactly the arrangement this project ships.
    if (!/\.demo\.json$/.test(f)) (byWorld[r.worldId] = byWorld[r.worldId] || []).push(f)
  }
  for (const [world, fs_] of Object.entries(byWorld))
    if (fs_.length > 1) add('recap', world, `${fs_.length} files for the same module (${fs_.join(', ')}) — one silently hides the other`)
}

// ── 3e. no bank text may appear in a publishable file ────────────────────────
// The one mistake no later commit can undo. `npm run prepush` guards what is STAGED; this guards
// what is WRITTEN, so a sentence copied out of the bank into the demo module is caught the moment
// it lands rather than at push time. Two such notes were found this way, both figure captions in
// M01.demo.json reproduced word for word from M02.
//
// Comments are excluded, and deliberately: src/ui/FormulaMath.tsx cites "X_L = 2·π·f·L [Ω]" as an
// example of what its parser must handle, and that is the inductive-reactance formula out of any
// textbook. Rewriting a code comment to avoid resembling the bank would be theatre.
// The phrase set comes from the PRIVATE folders only — the point is to catch private text landing
// in a publishable file. Gathering the demo's own sentences here would make the demo flag itself.
if (existsSync(PRIV_RECAPS)) {
  const bankPhrases = new Set()
  const flat = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim()
  const gather = node => {
    if (typeof node === 'string') { const s = node.trim(); if (s.split(/\s+/).length >= 8) bankPhrases.add(flat(s)); return }
    if (Array.isArray(node)) return node.forEach(gather)
    if (node && typeof node === 'object') Object.values(node).forEach(gather)
  }
  for (const dir of [PRIV_WORLDS, PRIV_RECAPS])
    for (const f of readdirSync(dir).filter(x => x.endsWith('.json'))) gather(JSON.parse(readFileSync(join(dir, f), 'utf8')))

  const strip = src => src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, '')
  const publishable = []
  ;(function walk(d) {
    for (const name of readdirSync(d)) {
      // android/ and ios/ join this list the moment `cap add` creates them: a Gradle build
      // leaves tens of thousands of files under android/app/build/, many of them .json, and
      // this walk would then take minutes and report generated files as publishable.
      if (['node_modules', 'dist', 'content-private', '.git', 'android', 'ios'].includes(name)) continue
      const p = join(d, name)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(ts|tsx|json|md|html|css)$/.test(name)) publishable.push(p)
    }
  })(ROOT)
  for (const p of publishable) {
    const body = flat(strip(readFileSync(p, 'utf8')))
    for (const ph of bankPhrases)
      if (body.includes(ph)) { add('bank', p.slice(ROOT.length + 1).replace(/\\/g, '/'), `contains ${ph.split(' ').length} words identical to the private bank`); break }
  }
}

// ── 4. formula markup must terminate ─────────────────────────────────────────
// Formula.tsx consumes "_{" until "}" OR THE END OF THE STRING, so an unclosed brace does not
// degrade — it swallows the rest of the sentence into a 0.7em subscript.
const WORD = /[\p{L}\p{N}]/u
const scanScripts = s => {
  const out = []
  for (let i = 0; i < s.length;) {
    const ch = s[i]
    if (ch !== '_' && ch !== '^') { i++; continue }
    const at = i; i++
    if (s[i] === '{') {
      i++; let body = ''
      while (i < s.length && s[i] !== '}') body += s[i++]
      out.push({ at, ch, closed: s[i] === '}', len: body.length }); i++
    } else { while (i < s.length && WORD.test(s[i])) i++ }
  }
  return out
}
const visibleStrings = []
const walkStrings = (node, where) => {
  if (typeof node === 'string') return visibleStrings.push({ where, s: node })
  if (Array.isArray(node)) return node.forEach(v => walkStrings(v, where))
  if (node && typeof node === 'object') for (const v of Object.values(node)) walkStrings(v, where)
}
for (const e of exercises) walkStrings({ p: e.prompt, h: e.hint, x: e.explanation, c: e.choices }, e._id)
for (const p of jsonIn(RECAP_DIRS))
  walkStrings(load(p), 'recap:' + base(p).replace(/(\.demo)?\.json$/, ''))
for (const { where, s } of visibleStrings) {
  for (const h of scanScripts(s)) if (!h.closed) add('formulas', where, `"${h.ch}{" unclosed — it swallows ${h.len} characters of the sentence`)
  if ((s.match(/\{/g) || []).length !== (s.match(/\}/g) || []).length) add('formulas', where, 'unbalanced braces')
}

// ── 5. every figure kind must have a renderer ────────────────────────────────
// A kind with no branch renders nothing at all — a silent blank where a diagram should be.
const visualSrc = readFileSync(join(SRC, 'visuals/QuestionVisual.tsx'), 'utf8')
const handled = new Set([...visualSrc.matchAll(/kind === '([a-z-]+)'/g)].map(m => m[1]))
for (const e of exercises) if (e.visual?.kind && !handled.has(e.visual.kind))
  add('figures', e._id, `kind "${e.visual.kind}" has no renderer`)

// ── 6. oscilloscope scale constants stay in one form ─────────────────────────
// These sit in the same spot on every scope figure; "2 V" without "/div" reads as a voltage rather
// than a per-division constant, and contradicts prompts that spell it out.
for (const e of exercises) {
  const p = e.visual?.params
  for (const k of ['vdiv', 'tdiv']) {
    const v = p?.[k]
    if (typeof v === 'string' && !/\/div$/.test(v.trim())) add('figures', e._id, `${k} = "${v}" does not end in "/div"`)
    if (typeof v === 'string' && /\d\.\d/.test(v)) add('figures', e._id, `${k} = "${v}" uses a decimal point (the label is shared by both languages)`)
  }
}

// ── 7. words drawn by the renderer must follow the language ──────────────────
// Greek letters and unit symbols are neutral; Romanian prose drawn into an SVG is shown to the
// English half of the users too. Diacritics are not a reliable signal — "primar"/"secundar" have
// none — so this looks for any drawn literal carrying a lowercase word, then requires a language
// switch on the same line.
const NEUTRAL = /^(div|ms|µs|ns|kHz|Hz|rot|kWh|Wh|min|max|rad|sr|mol|cd|kg|dB|log|sin|cos|tan|ac|dc|in|out|ref|rms|ef|med|pp|mA|kΩ|MΩ|nF|µF|pF|mH|VA|var)$/
const stripComments = src => src
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, m => m.replace(/[^\n]/g, ' '))
  .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
  .replace(/^\s*\/\/.*$/gm, '')
stripComments(visualSrc).split('\n').forEach((line, i) => {
  if (!/\bT\(|\bTsub\(/.test(line)) return
  if (/lang === '(en|ro)'|\ben \?|\bro \?/.test(line)) return
  for (const m of line.matchAll(/'([^'\\]{2,120})'/g)) {
    const words = (m[1].match(/[a-zăâîșț]{3,}/g) || []).filter(w => !NEUTRAL.test(w))
    if (words.length >= 2) add('language', `QuestionVisual.tsx:${i + 1}`, `drawn text with no language switch: "${m[1].slice(0, 48)}"`)
  }
})

// ── 8. reset() must clear every progress key ─────────────────────────────────
// A key usePersisted owns but reset() never touches is residue the student cannot see or clear.
// Preferences are meant to survive "Resetează progresul"; progress is not.
const storeSrc = readFileSync(join(SRC, 'store.tsx'), 'utf8')
const PREFS = new Set(['meem_goal', 'meem_studymode', 'meem_bench', 'meem_theme', 'meem_sound', 'meem_haptics', 'meem_onboarded'])
const resetAt = storeSrc.indexOf('const reset = ')
const resetBody = resetAt < 0 ? '' : storeSrc.slice(resetAt, storeSrc.indexOf('\n  }', resetAt))
for (const m of storeSrc.matchAll(/const \[(\w+), (\w+)\] = usePersisted[^(]*\(\s*'(meem_\w+)'/g)) {
  const [, state, setter, key] = m
  if (PREFS.has(key)) continue
  const names = [setter, setter.replace(/State$/, ''), 'set' + state[0].toUpperCase() + state.slice(1)]
  if (!names.some(n => new RegExp('\\b' + n + '\\s*\\(').test(resetBody)))
    add('reset', key, 'progress key that reset() never clears')
}

// ── report ───────────────────────────────────────────────────────────────────
const byCheck = {}
for (const f of fail) (byCheck[f.check] = byCheck[f.check] || []).push(f)
const ORDER = ['lessons', 'format-json', 'choices', 'explanation', 'separator', 'recap', 'bank', 'formulas', 'figures', 'language', 'reset']
console.log(`invariants: ${exercises.length} exercises in ${lessons.length} lessons, ${visibleStrings.length} visible strings, ${worlds.length} modules\n`)
for (const c of ORDER) {
  const items = byCheck[c] || []
  console.log(`== ${c}: ${items.length} ==`)
  for (const x of items.slice(0, 15)) console.log(`   ${x.id}  ${x.msg}`)
  if (items.length > 15) console.log(`   … +${items.length - 15}`)
}
console.log(`\nTOTAL: ${fail.length}`)
process.exit(fail.length ? 1 : 0)
