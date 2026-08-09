// Last gate before a push: does anything staged contain the question bank?
//
// The bank is used for grading, so publishing it is the one mistake no later commit can undo — it
// enters git history. The obvious check, `git status | grep content-private`, greps a PATH, and the
// dangerous copies do not have that word in their path: a dated HTML export of every question with
// its key, a Markdown twin, snapshot folders, the Moodle JSON. Renaming or moving any of them
// defeats a path check entirely.
//
// So this inspects the staged CONTENT, by two independent routes:
//   1. STRUCTURAL — exercise-shaped data (a `correct` key next to a `prompt`), or an answer-key
//      export. Works on any clone, even one that never had the private bank.
//   2. PHRASE — when content-private/ is present locally, every distinctive sentence in it is
//      searched for in the staged blobs. Catches a copy under any name, in any format.
//
// The demo module is exercise-shaped ON PURPOSE and is meant to ship, so it is allowed by path —
// the only allowance, and a narrow one.
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP = join(dirname(fileURLToPath(import.meta.url)), '..')
const ALLOW = [/(^|\/)src\/content\/(worlds|recaps)\/[^/]*\.demo\.json$/]
// .gitignore's whole job is to NAME the private artefacts so they stay out of the repo, so the
// structural rule below — which fires on the export's filename appearing anywhere — fires on the
// one file that has to contain it. Naming a file is the opposite of publishing it. Only the
// filename rule is waived; the phrase route still runs, so a real sentence from the bank pasted in
// here would still stop the push.
const NAMES_ALLOWED = [/(^|\/)\.gitignore$/]

const git = (...args) => execFileSync('git', args, { cwd: APP, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })

let staged
try {
  staged = git('diff', '--cached', '--name-only').split('\n').map(s => s.trim()).filter(Boolean)
} catch {
  console.log('nu e un repository git (sau nu există nimic pregătit) — nimic de verificat')
  process.exit(0)
}
if (!staged.length) { console.log('nimic pregătit pentru commit — nimic de verificat'); process.exit(0) }

// staged CONTENT, not the working copy: what git would actually push
const blobOf = p => { try { return git('show', ':' + p) } catch { return '' } }

// ── route 2: distinctive phrases from the private bank, if we have it ────────
const norm = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim()
const phrases = new Set()
const collect = node => {
  if (typeof node === 'string') { const s = node.trim(); if (s.split(/\s+/).length >= 8) phrases.add(norm(s)); return }
  if (Array.isArray(node)) return node.forEach(collect)
  if (node && typeof node === 'object') Object.values(node).forEach(collect)
}
for (const dir of ['content-private/worlds', 'content-private/recaps']) {
  const abs = join(APP, dir)
  if (!existsSync(abs)) continue
  for (const f of readdirSync(abs).filter(x => x.endsWith('.json'))) collect(JSON.parse(readFileSync(join(abs, f), 'utf8')))
}

const hits = []
for (const p of staged) {
  if (ALLOW.some(re => re.test(p))) continue
  const body = blobOf(p)
  if (!body) continue

  // 1. structural: exercise-shaped, or an answer-key export
  const exerciseShaped = /"correct"\s*:/.test(body) && /"prompt"\s*:/.test(body) && /"choices"\s*:|"answer"\s*:/.test(body)
  if (exerciseShaped) hits.push({ p, why: 'conține exerciții cu chei de răspuns (structură "prompt" + "correct")' })
  else if (!NAMES_ALLOWED.some(re => re.test(p))
    && (/MEE[- ]intrebari[- ]raspunsuri/i.test(body) || /r[ăa]spuns\s+corect\s*:/i.test(body) && /\n.*\n.*r[ăa]spuns\s+corect/i.test(body)))
    hits.push({ p, why: 'seamănă cu un export de întrebări cu răspunsuri' })

  // 2. phrase: any distinctive sentence from the local bank
  else if (phrases.size) {
    const flat = norm(body)
    for (const ph of phrases) if (flat.includes(ph)) { hits.push({ p, why: `conține o frază din banca privată (${ph.split(' ').length} cuvinte)` }); break }
  }
}

console.log(`fișiere pregătite: ${staged.length}${phrases.size ? ` · fraze de referință din bancă: ${phrases.size}` : ' · banca privată nu e prezentă local (doar verificare structurală)'}`)
if (!hits.length) { console.log('\n✓ nimic din banca de întrebări nu este pregătit pentru commit'); process.exit(0) }

console.log(`\n✗ OPREȘTE-TE — ${hits.length} fișier(e) pregătite conțin banca:\n`)
for (const h of hits) console.log(`   ${h.p}\n      ${h.why}`)
console.log(`\nScoate-le din staging (git restore --staged <fișier>) și adaugă-le în .gitignore.`)
console.log(`Dacă ajung într-un commit împins, cheile de răspuns intră în istoricul public și nu mai pot fi retrase.`)
process.exit(1)
