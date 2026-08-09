import { defineConfig } from 'vite'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, rmSync } from 'node:fs'

// @fontsource emits every face twice — woff2 and a legacy woff fallback — and Vite copies both
// because the generated @font-face lists both in `src:`. The fallback is dead weight: woff2 has
// been supported by every browser since 2016 (iOS 10, Android 5, Edge 14), and this app is a PWA,
// which needs a newer browser than that just to install. Measured before removal: 34 .woff files,
// 517 108 bytes — 23% of the whole deployment, downloaded by nobody and precached by nothing.
// Both halves are removed together, so no @font-face is left pointing at a file that is not there.
const dropLegacyWoff = () => ({
  name: 'drop-legacy-woff',
  apply: 'build' as const,
  closeBundle() {
    const dir = 'dist/assets'
    if (!existsSync(dir)) return
    let freed = 0
    for (const f of readdirSync(dir).filter(x => x.endsWith('.css'))) {
      const p = join(dir, f)
      const before = readFileSync(p, 'utf8')
      // drop only the ", url(x.woff) format(\"woff\")" tail — never the woff2 that precedes it
      const after = before.replace(/,\s*url\([^)]+\.woff\)\s*format\("woff"\)/g, '')
      if (after !== before) writeFileSync(p, after, 'utf8')
    }
    for (const f of readdirSync(dir).filter(x => x.endsWith('.woff'))) {
      const p = join(dir, f)
      freed += statSync(p).size
      rmSync(p)
    }
    if (freed) console.log(`  legacy woff fallbacks removed: ${(freed / 1024).toFixed(0)} kB`)
  },
})

// The service worker has to know the content-hashed filenames of this build, otherwise the main
// bundle is never precached and the app cannot start offline (the browser requests it before the
// worker takes control). Runs last, after Vite has copied public/sw.js into dist — and after
// dropLegacyWoff above, so the precache list can never name a file that has just been deleted.
const precacheServiceWorker = () => ({
  name: 'precache-service-worker',
  apply: 'build' as const,
  closeBundle() {
    const dir = 'dist/assets'
    if (!existsSync(dir) || !existsSync('public/sw.js')) return
    // Unused font subsets are NOT precached. @fontsource emits every Unicode subset it has, and
    // precaching them made the install force-download 131 kB of Cyrillic, Greek, Vietnamese and
    // Thai glyphs — measured. They stay in dist/ and stay fetchable, they are simply not part of
    // what a student pays for on first launch. Latin and latin-ext are kept: latin-ext carries
    // ă, â, î, ș, ț, without which the Romanian half of the app loses its diacritics.
    //
    // `greek` is KEPT, and the reasoning that first excluded it was wrong. It ran "the only two
    // languages here are Romanian and English, so no string can ever render a Greek glyph" — but
    // Greek letters in this app are NOTATION, not language: Ω, τ, Δ, ω, φ, ε, β, π, Φ, θ appear
    // 1169 times across the bank, Ω alone 312. Nothing showed while the network was up; pulling
    // the server and reloading is what surfaced it — inter-greek-400 and jetbrains-mono-greek-500
    // both failed, and a browser only requests a subset when the page actually contains characters
    // in its unicode-range. Offline, every ohm and time-constant in the course fell back to a
    // system face in the middle of a formula. Costs 27 924 bytes across the four files that carry
    // it (Chakra Petch ships no Greek, so headings need none).
    //
    // `greek-ext` stays excluded: it covers polytonic Greek, U+1F00–1FFF, and the bank contains
    // zero characters in that range.
    const NON_LATIN = /-(cyrillic|cyrillic-ext|greek-ext|vietnamese|thai|hebrew|arabic|devanagari)-/
    const assets = readdirSync(dir)
      .filter(f => /\.(js|css|woff2)$/.test(f))
      .filter(f => !(f.endsWith('.woff2') && NON_LATIN.test(f)))
      .map(f => '/assets/' + f)
    // Icons were left to sw.js's hand-written CORE list, which named one of the five that ship —
    // so app-180 (the iOS touch icon), app-512 and both maskable icons were absent from the cache,
    // and the fetch handler could not save the day either: it caches what it fetches, but the
    // activate handler prunes everything outside CORE+BUILT, so a runtime copy was deleted at the
    // next release. Enumerated instead of listed, for the same reason the progress export walks
    // localStorage rather than a fixed set of keys: a list written by hand drifts from the files.
    const icons = existsSync('dist/icons')
      ? readdirSync('dist/icons').filter(f => /\.(png|svg|webp|ico)$/.test(f)).map(f => '/icons/' + f)
      : []
    const all = assets.concat(icons)
    // Each build gets its own cache, named with this stamp, and the worker keeps the newest two —
    // so a page still running the previous build keeps finding its own lazily-imported chunks.
    const build = String(Date.now())
    // Both substitutions are asserted, because String.replace with a literal that is not found
    // returns the string UNCHANGED — it does not throw, and nothing downstream notices. Reformat
    // public/sw.js once (Prettier turns `/*__PRECACHE__*/[]` into `/*__PRECACHE__*/ []`, one added
    // space) and both markers stop matching: the worker ships with an empty precache list and
    // BUILD still 'dev'. The app then cannot start offline — the defining feature of this release —
    // while this very function prints "N assets precached", and PUBLISHING.md names that printed
    // line as the proof that offline works. The cache name would also stay "meem-dev" forever,
    // which /^meem-\d+$/ in the activate handler never matches, so the two-generation pruning dies
    // and the cache grows without bound: the 264-entry problem sw.js says it fixed, returning.
    // A tolerant regex would paper over a reformat; failing the build is the honest answer, since
    // the marker moving means someone touched a file that is generated into, and should look.
    const raw = readFileSync('public/sw.js', 'utf8')
    for (const marker of ['/*__PRECACHE__*/[]', "/*__BUILD__*/'dev'"])
      if (!raw.includes(marker))
        throw new Error(`public/sw.js: marcajul ${marker} lipsește — precache-ul NU a fost injectat, iar aplicația nu ar porni offline. Nu formata public/sw.js.`)
    const sw = raw
      .replace('/*__PRECACHE__*/[]', JSON.stringify(all))
      .replace("/*__BUILD__*/'dev'", JSON.stringify(build))
    writeFileSync('dist/sw.js', sw, 'utf8')
    console.log(`  service worker: ${assets.length} assets + ${icons.length} icons precached (cache meem-${build})`)
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), dropLegacyWoff(), precacheServiceWorker()],
})
