// Content quality checker — run: node scripts/check-content.mjs
// Flags bilingual gaps, untranslated EN, and missing visuals across all questions + recaps.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))

// Both content locations are scanned, exactly as src/content/course.ts globs them: the demo bank
// committed to the public repo, and the real bank kept in content-private/. Checking only the first
// is the silent-failure mode this script exists to prevent — it would print a reassuring "0 issues"
// while never opening a single real question.
const WORLD_DIRS = ['../src/content/worlds', '../content-private/worlds'].map(p => join(HERE, p))
const RECAP_DIRS = ['../src/content/recaps', '../content-private/recaps'].map(p => join(HERE, p))
const jsonIn = dirs => dirs.filter(existsSync).flatMap(d =>
  readdirSync(d).filter(x => x.endsWith('.json')).map(f => ({ file: f, path: join(d, f) })))

const RO_DIACRITICS = /[ăâîșțĂÂÎȘȚşţŞŢ]/
// `noVisual` and `unusedUiKey` are informational: they describe deliberate choices as often as
// mistakes, so they are reported but do not fail the build (see the exit code at the bottom).
const issues = { missingLang: [], enHasRo: [], enEqualsRo: [], noVisual: [], unusedUiKey: [], other: [] }

// An identical ro/en pair is only suspicious when the string is prose. Most of this course's short
// strings are language-independent by nature — formulas ("U = R · I  [V]"), SI unit names ("Volt
// (V)", "Henry"), prefixes ("kilo (k)"), dimensional formulas ("L²·M·T⁻²") — and translating them
// would be wrong. Flagging them buries the real misses in 130 lines of noise, which is how a gate
// stops being read. So: a math relation or a middle dot marks the string as notation, and what is
// left must carry at least two real words (outside any parenthetical abbreviation) to be prose.
const NOTATION = /[=<>≈≤≥·×√∫∑]/
const isProse = s =>
  !NOTATION.test(s) &&
  (s.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ').match(/[A-Za-z]{3,}/g) || []).length >= 2

const isLoc = v => v && typeof v === 'object' && ('ro' in v || 'en' in v)
function checkLoc(loc, where) {
  if (!isLoc(loc)) return
  const ro = (loc.ro ?? '').trim(), en = (loc.en ?? '').trim()
  if (!ro || !en) { issues.missingLang.push(`${where} (ro:${!!ro} en:${!!en})`); return }
  if (RO_DIACRITICS.test(en)) issues.enHasRo.push(`${where}: "${en.slice(0, 60)}"`)
  else if (ro === en && ro.length > 4 && isProse(ro))
    issues.enEqualsRo.push(`${where}: "${ro.slice(0, 60)}"`)
}

// walk any object for Loc fields (prompt, hint, explanation, label, relation, note, title, and array items)
function walkLoc(node, where) {
  if (Array.isArray(node)) { node.forEach((x, i) => walkLoc(x, `${where}[${i}]`)); return }
  if (!node || typeof node !== 'object') return
  if (isLoc(node)) { checkLoc(node, where); return }
  for (const k of Object.keys(node)) walkLoc(node[k], `${where}.${k}`)
}

// Load worlds first so the demo-drop rule can be applied before checking: a demo world that the real
// bank replaces is never shown to a student, so flagging its contents would be pure noise.
const worlds = jsonIn(WORLD_DIRS).map(({ file, path }) => {
  const data = JSON.parse(readFileSync(path, 'utf8'))
  return { file, data, id: String(data.worldId), demo: data.demo === true }
})
const live = worlds.filter((w, _i, all) => !w.demo || !all.some(o => !o.demo && o.id === w.id))

// Every lesson and exercise id in the live bank. An id is an INTERNAL handle: the player never
// prints one, so a cross-reference written as "vezi <exercise-id>" sends the student looking
// for something they cannot see. Two such references were written into an M05 exercise while adding
// the material-measure signposting, and survived several passes — the letter guard below cannot catch
// them, because there is no letter involved.
const INTERNAL_IDS = []
for (const { data } of live)
  for (const lesson of data.lessons || []) {
    if (String(lesson.id).length >= 5) INTERNAL_IDS.push(String(lesson.id))
    for (const ex of lesson.exercises || []) if (String(ex.id).length >= 5) INTERNAL_IDS.push(String(ex.id))
  }
const ID_REF = INTERNAL_IDS.length
  ? new RegExp(`(^|[^a-z0-9-])(${INTERNAL_IDS.map(i => i.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})([^a-z0-9-]|$)`)
  : null

let exCount = 0
for (const { file, data } of live) {
  for (const lesson of data.lessons || []) for (const ex of lesson.exercises || []) {
    exCount++
    const w = `${file}:${ex.id}`
    checkLoc(ex.prompt, `${w}.prompt`)
    if (ex.hint) checkLoc(ex.hint, `${w}.hint`)
    if (ex.explanation) checkLoc(ex.explanation, `${w}.explanation`)
    if (ID_REF)
      for (const [field, loc] of [['prompt', ex.prompt], ['hint', ex.hint], ['explanation', ex.explanation]])
        for (const lang of ['ro', 'en']) {
          const m = loc?.[lang] && ID_REF.exec(loc[lang])
          if (m) issues.other.push(`${w}.${field}.${lang}: names the internal id "${m[2]}" — the student never sees ids; describe the other exercise instead`)
        }
    for (const c of ex.choices || []) checkLoc(c.label, `${w}.choice(${c.id})`)
    // Ids stay a, b, c, … in display order. They are no longer PRINTED — the player shows a tick box
    // and the label — but they remain the vocabulary `correct` is written in, and the "primele N"
    // rule below reads them positionally, so an id that does not match its slot still lies.
    if (ex.choices?.length) {
      const ids = ex.choices.map(c => c.id).join(',')
      const expected = ex.choices.map((_, i) => String.fromCharCode(97 + i)).join(',')
      if (ids !== expected) issues.other.push(`${w}: choice ids are [${ids}] but must run in display order — expected [${expected}]`)

      // Every id in `correct` must name a choice that exists, or the exercise is UNANSWERABLE:
      // grader.ts compares the selection to the key as a set, so a key naming a phantom option can
      // never be matched — the student loses a heart on every attempt and the lesson cannot be
      // finished. Nothing checked this before, and it went unnoticed because ids used to be visible
      // as letters; now they are internal, so only a guard can see it.
      const idSet = new Set(ex.choices.map(c => String(c.id)))
      const key = (ex.correct || []).map(String)
      for (const k of key) if (!idSet.has(k)) issues.other.push(`${w}: the key names "${k}" but the choices are [${ids}] — the exercise can never be answered correctly`)
      if (!key.length) issues.other.push(`${w}: ${ex.type} with an empty key — nothing can satisfy it`)
      if (ex.type === 'mcq' && key.length > 1) issues.other.push(`${w}: mcq with ${key.length} correct options [${key}] — the player only allows one selection`)

      // No explanation may point at an option BY LETTER. The letters were removed from the player,
      // so "deci corecte sunt a, b, c" now names things the student cannot see. That is not merely
      // stale prose: a letter is a pointer nothing verifies, and THREE explanations were found to
      // have quietly drifted out of sync with their own key behind it — two multi-selects and one
      // single-choice, one of which even contradicted itself within the same sentence. Naming the
      // option by its TEXT cannot drift the same way: a wrong phrase is wrong on its face.
      // Bare "a"/"e" are NOT matched — Romanian "deci e falsă" is the verb *este*, and "(A)"/"(C)"
      // are Ampere and Coulomb. Only shapes that can only be an option reference are caught.
      //
      // Deliberately CASE-SENSITIVE, and the verdict words are closed with \b. Option letters in
      // this bank are always lowercase, while an uppercase letter opening a parenthesis is normal
      // prose: the first version of this rule was case-insensitive and fired on an English prompt
      // that opened a parenthesis with "A correct…", reading it as "option (a) is correct".
      //
      // NOTHING in this file may name a bank exercise id or its key: scripts/ is published, the
      // bank is not, and option ids stay in display ORDER — so a key written out as letters is a
      // usable answer ("tick the first and third"), not a harmless note to a maintainer.
      const LETTER_REF = new RegExp([
        '(?:[Vv]arianta|[Vv]ariantele|[Oo]p[țt]iunea|[Oo]p[țt]iunile|[Oo]ption|[Oo]ptions)\\s+[a-e]\\b',
        'corect[ea]?\\s+sunt\\s+[a-e]\\s*,',
        'sunt\\s+corecte\\s+[a-e]\\s*,',
        '\\b[a-e]\\s*,\\s*[a-e]\\s*(?:,\\s*[a-e]\\s*)?(?:și|si|and)\\s+[a-e]\\b',
        '\\(\\s*[a-e]\\s+(?:fals[ăa]?|adev[ăa]rat[ăa]?|corect[ăa]?|gre[șs]it[ăa]?|false|true|correct|wrong)\\b',
      ].join('|'), 'g')
      for (const lang of ['ro', 'en']) {
        const t = ex.explanation?.[lang]
        if (!t) continue
        for (const m of t.matchAll(LETTER_REF))
          issues.other.push(`${w}.explanation.${lang}: refers to an option by letter — "${m[0].trim()}". The player no longer shows letters; name the option by its text.`)

        // The other way an explanation pins itself to the option order: "de aceea doar primele trei
        // perechi sunt corecte". The letter check above cannot see this one — there is no letter in
        // it — and the answer shuffle only spared it because it left `multi` exercises alone. If
        // those are ever reordered too, this is the claim that breaks silently.
        const N = { 'dou[ăa]': 2, two: 2, trei: 3, three: 3, patru: 4, four: 4 }
        for (const [word, n] of Object.entries(N)) {
          const re = new RegExp(`prim(?:ele|ii)\\s+${word}\\b|first\\s+${word}\\b`, 'i')
          if (!re.test(t)) continue
          const firstN = ex.choices.slice(0, n).map(c => c.id).sort().join(',')
          const keySet = (ex.correct || []).map(String).sort().join(',')
          if (firstN !== keySet)
            issues.other.push(`${w}.explanation.${lang}: claims the first ${n} options are the correct ones, but the key is [${keySet}] and the first ${n} are [${firstN}]`)
        }
      }
    }
    // `integerOnly` does not merely duplicate a tolerance, it OVERRIDES it: gradeNumeric rejects a
    // fractional input before the band is ever consulted, so on an exercise keyed 250 ± 1 the
    // answer 250,4 — squarely inside the author's own band — comes back wrong. That is only fair
    // if the prompt asked for a whole number. A silent flag next to a real tolerance is a hidden
    // rule that cancels a stated one, so it has to be one or the other.
    if (ex.type === 'numeric' && ex.integerOnly) {
      const saysInt = /[îi]ntreg|integer|f[ăa]r[ăa]\s+zecimale|no decimals|whole number|rotunj/i
        .test(`${ex.prompt?.ro ?? ''} ${ex.prompt?.en ?? ''}`)
      const band = ex.tolerance?.abs != null ? Math.abs(ex.tolerance.abs)
        : ex.tolerance?.pct != null ? Math.abs(ex.tolerance.pct) : 0
      if (!saysInt && band > 0)
        issues.other.push(`${w}: integerOnly is set but the prompt never asks for a whole number, and the tolerance (${JSON.stringify(ex.tolerance)}) says decimals are acceptable — the flag silently overrides the band`)
    }
    if (ex.visual?.params) walkLoc(ex.visual.params, `${w}.visual`)
    if (!ex.visual && !ex.media?.image) issues.noVisual.push(w)

    // Figure geometry the RENDERER cannot complain about. Meter clamps the needle with
    // `Math.min(1, reading / max)`, so a reading past full scale draws a pegged needle and the
    // picture then says something the data does not — silently, which is how the decade resistor
    // came to be drawn as a pointer instrument sitting exactly at full scale. Scope's screen is
    // 10×8 divisions centred, so a trace swings at most 4 divisions before leaving the frame.
    const vp = ex.visual?.params
    if (ex.visual?.kind === 'meter' && vp) {
      const max = Number(vp.max), rd = Number(vp.reading)
      if (Number.isFinite(max) && Number.isFinite(rd)) {
        if (rd > max) issues.other.push(`${w}.visual: needle reading ${rd} exceeds full scale ${max} — the renderer clamps, so the figure would show full scale instead`)
        if (rd < 0) issues.other.push(`${w}.visual: negative needle reading ${rd}`)
        if (max <= 0) issues.other.push(`${w}.visual: full scale is ${max}`)
      }
    }
    if (ex.visual?.kind === 'scope' && vp) {
      const list = Array.isArray(vp.traces) && vp.traces.length
        ? vp.traces
        : [{ amp: vp.amp, period: Number(vp.periods) ? 10 / Number(vp.periods) : undefined }]
      for (const t of list) {
        if (!t || typeof t !== 'object') continue
        const amp = Number(t.amp), per = Number(t.period)
        if (Number.isFinite(amp) && amp > 4) issues.other.push(`${w}.visual: trace amplitude ${amp} div exceeds the 4 divisions from the centreline — the trace leaves the screen`)
        if (Number.isFinite(amp) && amp <= 0) issues.other.push(`${w}.visual: trace amplitude ${amp} div draws nothing`)
        if (Number.isFinite(per) && (per > 10 || per < 0.5)) issues.other.push(`${w}.visual: trace period ${per} div does not fit the 10-division screen`)
      }
    }
  }
}
// Recaps are keyed by worldId (see src/content/recaps.ts), and a demo recap is shadowed the moment
// a real one exists for that module — so keying the de-duplication on the FILENAME would sail past
// the shadowing and check a recap no student can reach.
const recaps = jsonIn(RECAP_DIRS).map(({ file, path }) => ({ file, r: JSON.parse(readFileSync(path, 'utf8')) }))
const liveRecaps = recaps.filter(({ r }, _i, all) =>
  !r.demo || !all.some(o => !o.r.demo && o.r.worldId === r.worldId))

let recapCount = 0
for (const { file, r } of liveRecaps) {
  recapCount++
  checkLoc(r.title, `${file}.title`)
  walkLoc(r.items, `${file}.items`); walkLoc(r.formulas, `${file}.formulas`)
}

// The Lab's catalogue is content too — 31 instruments with names, categories, descriptions, specs
// and a glossary, all of it read by students — and it sat outside this gate entirely because it
// lives in TypeScript rather than JSON. Node imports .ts directly, so there is no reason to walk it
// with a regex or to leave it unchecked.
const { EQUIPMENT } = await import('../src/content/equipment.ts')
const { EQUIP_INFO } = await import('../src/content/equipmentInfo.ts')
const { DAILY_QUESTS } = await import('../src/content/quests.ts')
for (const item of EQUIPMENT) walkLoc(item, `equipment:${item.id}`)
let infoCount = 0
for (const [id, v] of Object.entries(EQUIP_INFO)) { infoCount++; walkLoc(v, `equipmentInfo:${id}`) }
for (const q of DAILY_QUESTS) walkLoc(q, `quest:${q.id}`)

// modules.ts and achievements.ts cannot be imported here: they reach ./course, which uses Vite's
// import.meta.glob, and plain Node has no such thing. Their strings are still student-facing — the
// module titles and "what you'll learn" blurbs on the map, the eleven achievement names in Settings
// — so they are read from source instead. A source scan is the weaker tool, so it VERIFIES ITSELF:
// each file declares how many pairs it should yield, and a mismatch is reported as a failure rather
// than passing quietly with half the strings unchecked.
const SOURCE_SCANNED = [
  { file: 'modules.ts', expect: 15 * 2, what: 'module' },        // 15 × (title + learn)
  { file: 'achievements.ts', expect: 11 * 2, what: 'achievement' }, // 11 × (title + desc)
]
let sourcePairs = 0
for (const { file, expect, what } of SOURCE_SCANNED) {
  const src = readFileSync(join(HERE, '../src/content/', file), 'utf8')
  const pairs = [...src.matchAll(/\bro:\s*'((?:[^'\\]|\\.)*)'\s*,\s*en:\s*'((?:[^'\\]|\\.)*)'/g)]
  sourcePairs += pairs.length
  if (pairs.length !== expect)
    issues.other.push(`${file}: the source scan found ${pairs.length} bilingual pairs, expected ${expect} — the extractor is out of step with the file, so some strings went unchecked`)
  pairs.forEach((m, i) => checkLoc({ ro: m[1], en: m[2] }, `${what}[${i}] in ${file}`))
}

// The UI dictionary is the last authored text, and its failure is the quietest of all: t() falls
// back to STR.ro[k], so a key present in Romanian and missing in English shows Romanian to an
// English reader with no error anywhere. i18n.tsx contains JSX, so Node cannot import it either.
const i18n = readFileSync(join(HERE, '../src/i18n.tsx'), 'utf8')
function dictOf(tag) {
  const at = i18n.indexOf(`  ${tag}: {`)
  if (at < 0) return null
  const open = i18n.indexOf('{', at)
  let depth = 0, end = open
  for (let i = open; i < i18n.length; i++) {
    if (i18n[i] === '{') depth++
    else if (i18n[i] === '}') { depth--; if (!depth) { end = i; break } }
  }
  const body = i18n.slice(open + 1, end)
  const out = new Map()
  // the `m` flag matters: without it the FIRST key of each dictionary is invisible
  for (const m of body.matchAll(/(?:^|[,{])\s*([A-Za-z_$][\w$]*)\s*:\s*(['"])((?:[^\\]|\\.)*?)\2/gm)) out.set(m[1], m[3])
  return out
}
const RO_DICT = dictOf('ro'), EN_DICT = dictOf('en')
if (!RO_DICT || !EN_DICT || RO_DICT.size < 50 || EN_DICT.size < 50) {
  issues.other.push(`i18n.tsx: the dictionary scan yielded ${RO_DICT?.size ?? 0} ro / ${EN_DICT?.size ?? 0} en keys — too few to be real, so the UI strings went unchecked`)
} else {
  for (const k of RO_DICT.keys()) if (!EN_DICT.has(k)) issues.missingLang.push(`i18n.tsx: "${k}" exists in ro but not in en — an English reader silently gets the Romanian`)
  for (const k of EN_DICT.keys()) if (!RO_DICT.has(k)) issues.missingLang.push(`i18n.tsx: "${k}" exists in en but not in ro`)
  for (const [k, v] of EN_DICT) if (RO_DIACRITICS.test(v)) issues.enHasRo.push(`i18n.tsx:${k}: "${v.slice(0, 60)}"`)

  // Strings nothing can display. Not failures — some describe states the app deliberately does not
  // have (worldLocked, from when modules gated each other; noMistakes, from when the review card
  // stayed on screen with a congratulation) — but they accumulate silently otherwise, and each one
  // is a promise in the dictionary that the interface never keeps.
  const used = new Set()
  const walkSrc = dir => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) { walkSrc(full); continue }
      if (!/\.tsx?$/.test(full)) continue
      const text = readFileSync(full, 'utf8')
      for (const m of text.matchAll(/\bt\(\s*['"]([^'"]+)['"]\s*\)/g)) used.add(m[1])
      // keys reached indirectly, e.g. t(goalLabel[i]) over a literal array of key names
      for (const m of text.matchAll(/=\s*\[([^\]]*)\]\s*as const/g))
        for (const q of m[1].matchAll(/'([^']+)'/g)) used.add(q[1])
    }
  }
  walkSrc(join(HERE, '../src'))
  for (const k of RO_DICT.keys()) if (!used.has(k)) issues.unusedUiKey.push(`i18n.tsx: "${k}" — declared in both languages, displayed nowhere`)
}

console.log(`Scanned ${exCount} exercises + ${recapCount} recaps (${live.length} worlds) + ${EQUIPMENT.length} instruments`
  + ` + ${infoCount} instrument sheets + ${DAILY_QUESTS.length} quests + ${sourcePairs} module/achievement strings`
  + ` + ${RO_DICT?.size ?? 0} UI keys\n`)
for (const [k, list] of Object.entries(issues)) {
  console.log(`== ${k}: ${list.length} ==`)
  for (const it of list.slice(0, 40)) console.log('  ' + it)
  if (list.length > 40) console.log(`  … +${list.length - 40} more`)
  console.log()
}
const total = Object.values(issues).reduce((s, l) => s + l.length, 0)
console.log(`TOTAL issues: ${total}`)

// A gate that always exits 0 cannot fail a build. Bilingual defects are hard failures; a missing
// visual is a design note (some questions are purely textual by intent), so it only reports.
const hard = issues.missingLang.length + issues.enHasRo.length + issues.enEqualsRo.length + issues.other.length
process.exit(hard > 0 ? 1 : 0)
