/**
 * Pre-release audit — the gate `npm run check` is not.
 *
 * The three existing gates check the COURSE: exercises, keys, invariants, types, the build. Nothing
 * checked the PACKAGE, and that is where every mistake of the last two weeks happened: an export
 * that announced success without writing a file, an app drawing under the system bars, a version
 * number that existed in three places and agreed in none, a screenshot set that published two
 * graded items. A sibling project (DadGlass) shipped a build whose About screen said "v2.0" for
 * months while the store served 1.0.4 — nothing was wrong with its code, and nothing was checking.
 *
 * So this script asks the questions a Play reviewer, a tester and a student would ask, in the order
 * that a wrong answer costs the most. It uses Node built-ins only, needs no network, and exits 1 on
 * a blocking problem so it can be used as a gate rather than as a suggestion.
 *
 * Run from the repository root (mee-app/app). The listing texts and the store graphics live one
 * level up, OUTSIDE this repository, so every check that needs them is skipped — not failed — when
 * they are absent: a public clone and CI must both pass.
 */
import fs from 'node:fs'
import zlib from 'node:zlib'
import path from 'node:path'

let problems = 0, warns = 0, skipped = 0
const P = s => console.log(s)
const FAIL = s => { problems++; console.log('  ❌ ' + s) }
const WARN = s => { warns++; console.log('  ⚠️  ' + s) }
const OK = s => console.log('  ✅ ' + s)
const SKIP = s => { skipped++; console.log('  ·  skipped: ' + s) }

const read = f => fs.readFileSync(f, 'utf8')
const exists = f => fs.existsSync(f)
/** Character counts must be taken in BOTH normalisations. The RO short description was 77 composed
 *  and 81 decomposed against a limit of 80 — i.e. it fit until the paste into the console
 *  decomposed the diacritics, at which point the field refused it with no explanation. */
const nfc = s => s.normalize('NFC').length
const nfd = s => s.normalize('NFD').length
const RO_DIACRITICS = /[ăâîșțĂÂÎȘȚşţŞŢ]/

// The store-facing material that is deliberately not in this repository.
const UP = '..'
const FISA = path.join(UP, 'FISA-LISTARE-PLAY.md')
const POZE = path.join(UP, 'poze', 'play')

// ─────────────────────────────────────────────────────────────────────────────
// A minimal zip reader, so the .aab can be inspected without a dependency.
// An App Bundle is a zip; its manifest is protobuf, not binary XML, which is why
// the version is read as a string below rather than parsed as a resource table.
// ─────────────────────────────────────────────────────────────────────────────
function zipEntries(buf) {
  let i = buf.length - 22
  while (i >= 0 && buf.readUInt32LE(i) !== 0x06054b50) i--
  if (i < 0) return null
  const count = buf.readUInt16LE(i + 10)
  let off = buf.readUInt32LE(i + 16)
  const out = new Map()
  for (let n = 0; n < count; n++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== 0x02014b50) break
    const method = buf.readUInt16LE(off + 10)
    const csize = buf.readUInt32LE(off + 20)
    const size = buf.readUInt32LE(off + 24)
    const nlen = buf.readUInt16LE(off + 28)
    const elen = buf.readUInt16LE(off + 30)
    const clen = buf.readUInt16LE(off + 32)
    const lho = buf.readUInt32LE(off + 42)
    out.set(buf.toString('utf8', off + 46, off + 46 + nlen), { method, csize, size, lho })
    off += 46 + nlen + elen + clen
  }
  return out
}
function zipRead(buf, e) {
  const nlen = buf.readUInt16LE(e.lho + 26)
  const elen = buf.readUInt16LE(e.lho + 28)
  const start = e.lho + 30 + nlen + elen
  const raw = buf.subarray(start, start + e.csize)
  return e.method === 0 ? raw : zlib.inflateRawSync(raw)
}

// ─────────────────────────────────────────────────────────────────────────────
P('\n════ 1. VERSION IDENTITY — three files, one number ════')
// package.json is the human version, build.gradle's versionName is what the store displays, and
// versionCode is the only number Play treats as the identity of an upload. CITATION.cff carries the
// same version into the DOI, where it cannot be corrected afterwards. All four have to agree, and
// the in-app label (Settings → Despre) is built from the first two — so a drift here does not just
// look untidy, it makes every tester report ambiguous.
const pkg = JSON.parse(read('package.json'))
const gradle = exists('android/app/build.gradle') ? read('android/app/build.gradle') : ''
let versionCode = null, versionName = null
if (!gradle) {
  SKIP('android/app/build.gradle absent — no native project in this tree')
} else {
  // Both Groovy forms: the Capacitor template writes `versionCode 8`, newer AGP writes `= 8`.
  versionCode = (gradle.match(/versionCode\s*=?\s*(\d+)/) || [])[1] || null
  versionName = (gradle.match(/versionName\s*=?\s*"([^"]+)"/) || [])[1] || null
  if (!versionCode || !versionName) FAIL('could not read versionCode / versionName from android/app/build.gradle')
  else if (versionName !== pkg.version) FAIL(`version mismatch: package.json ${pkg.version} vs build.gradle versionName ${versionName} — Settings → Despre would show one and the store the other`)
  else OK(`version ${pkg.version} (versionCode ${versionCode}) consistent across package.json and build.gradle`)
}
if (exists('CITATION.cff')) {
  const cff = (read('CITATION.cff').match(/^version:\s*(\S+)/m) || [])[1]
  if (!cff) WARN('CITATION.cff has no version field')
  else if (cff !== pkg.version) FAIL(`CITATION.cff says ${cff}, package.json says ${pkg.version} — Zenodo mints the DOI from the CFF and that cannot be corrected later`)
  else OK(`CITATION.cff agrees (${cff})`)
}

// Every package ever built is kept, one file per versionCode. The next upload has to beat all of
// them, because Play refuses a duplicate code — and, worse, silently SHADOWS a bundle whose code is
// lower than one still active on another track, so it reaches nobody with no error anywhere.
if (versionCode) {
  // Only the ARCHIVE counts as "already used": `_aab-vechi/` holds the superseded packages, while a
  // file next to the project is this build's own artefact and legitimately carries this code.
  const codes = []
  const old = path.join(UP, '_aab-vechi')
  if (exists(old)) for (const f of fs.readdirSync(old)) {
    const m = f.match(/-vc(\d+)\.aab$/)
    if (m) codes.push(Number(m[1]))
  }
  if (!codes.length) SKIP('no superseded .aab files in _aab-vechi/ to compare version codes against')
  else {
    const highest = Math.max(...codes)
    if (Number(versionCode) > highest) OK(`versionCode ${versionCode} beats every superseded package (highest archived was vc${highest})`)
    else FAIL(`versionCode ${versionCode} is not above vc${highest}, which is already archived — Play refuses a duplicate code and silently shadows a lower one`)
    WARN('unverifiable from here: the code must also beat every bundle still ACTIVE on any other track (the internal one included), and anyone opted into internal testing receives only the internal build')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
P('\n════ 2. THE PACKAGE — is the .aab the one you think it is ════')
// Four things have gone wrong with an .aab in this project's sibling and in its own history: an
// unsigned bundle, a stale version code, a filename that disagreed with the code inside, and — the
// expensive one — a bundle built from a tree WITHOUT content-private/, which ships the 10-exercise
// demo module to students with no error anywhere. Each is checked from the artefact itself.
// Only this project's own packages: a public clone's parent directory is somebody else's disk.
const aabs = exists(UP) ? fs.readdirSync(UP).filter(f => /^mee-.*\.aab$/.test(f)) : []
if (!aabs.length) {
  SKIP('no .aab staged next to the project — nothing to inspect')
} else {
  const newest = aabs.map(f => ({ f, t: fs.statSync(path.join(UP, f)).mtimeMs })).sort((a, b) => b.t - a.t)[0].f
  const buf = fs.readFileSync(path.join(UP, newest))
  const entries = zipEntries(buf)
  P(`  (inspecting ${newest}, ${(buf.length / 1048576).toFixed(2)} MB)`)
  if (!entries) {
    FAIL(`${newest} is not readable as a zip`)
  } else {
    const sig = [...entries.keys()].filter(k => /^META-INF\/.+\.(RSA|DSA|EC)$/.test(k))
    const sf = [...entries.keys()].filter(k => /^META-INF\/.+\.SF$/.test(k))
    if (sig.length && sf.length) OK(`signed (${sig[0]} + ${sf[0]})`)
    else FAIL(`${newest} carries no signature block — Play will reject it`)

    const man = entries.get('base/manifest/AndroidManifest.xml')
    if (!man) FAIL('no base/manifest/AndroidManifest.xml inside the bundle')
    else {
      const m = zipRead(buf, man)
      // protobuf: the attribute name, then 0x1a, a length byte, then the value as ASCII.
      const strAfter = label => {
        const i = m.indexOf(Buffer.from(label))
        if (i < 0 || m[i + label.length] !== 0x1a) return null
        return m.toString('latin1', i + label.length + 2, i + label.length + 2 + m[i + label.length + 1])
      }
      const inCode = strAfter('versionCode'), inName = strAfter('versionName')
      if (versionCode && inCode !== versionCode) FAIL(`the bundle says versionCode ${inCode}, build.gradle says ${versionCode} — it was built before the bump`)
      else if (inCode) OK(`bundle versionCode ${inCode}, versionName ${inName}`)
      const fromName = (newest.match(/-vc(\d+)\.aab$/) || [])[1]
      if (fromName && inCode && fromName !== inCode) FAIL(`filename says vc${fromName} but the bundle inside is versionCode ${inCode} — one of them will be uploaded by mistake`)
    }

    // The demo trap, measured rather than assumed: a full build's main chunk is ~870 kB, the
    // bank-less demo's ~290 kB. Anything in between deserves a look before it reaches students.
    //
    // `index-*.js` matches FOUR entries, not one: Vite gives that name to the entry chunk and to
    // three small modules beside it (354 B, 1.5 kB, 8.4 kB). Taking the first match made the verdict
    // depend on where the content hash happened to sort — vc8 passed and vc9 failed with "0 kB",
    // on two bundles built from the same tree by the same command. The biggest one is the entry
    // chunk by definition, so pick that and say how many were weighed, or the next hash collision
    // in alphabetical order silently re-arms the same false alarm.
    const mains = [...entries.entries()]
      .filter(([k]) => /^base\/assets\/public\/assets\/index-.*\.js$/.test(k))
      .sort((a, b) => b[1].size - a[1].size)
    const main = mains[0]
    if (!main) WARN('could not find the main JS chunk inside the bundle')
    else if (main[1].size < 500_000) FAIL(`the bundle's main chunk is ${(main[1].size / 1024).toFixed(0)} kB — that is the DEMO build (10 exercises), not the course. It was built without content-private/`)
    else OK(`main chunk ${(main[1].size / 1024).toFixed(0)} kB — the full course, not the demo (largest of ${mains.length} index-*.js entries)`)

    // The build stamp has to be inside the artefact, not merely in the source: it is what a tester
    // reads back to you, and the only thing that makes a report attributable to a build.
    if (versionCode) {
      const wanted = `${pkg.version} (${versionCode})`
      let found = false
      for (const [k, e] of entries) {
        if (!/^base\/assets\/public\/assets\/.*\.js$/.test(k)) continue
        if (zipRead(buf, e).includes(wanted)) { found = true; break }
      }
      found ? OK(`the build stamp "${wanted}" is inside the bundle`)
            : FAIL(`the build stamp "${wanted}" is NOT in the bundle — Settings → Despre would show a stale version`)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
P('\n════ 3. THE NATIVE PROJECT — identity and permissions ════')
if (!gradle) {
  SKIP('no android/ tree')
} else {
  // The application id is PERMANENT once published. Capacitor writes it in two places, and a
  // mismatch between them is a build that installs as a different app.
  const appId = (gradle.match(/applicationId\s*=?\s*["']([^"']+)["']/) || [])[1]
  const capCfg = exists('capacitor.config.ts') ? read('capacitor.config.ts') : ''
  const capId = (capCfg.match(/appId:\s*['"]([^'"]+)['"]/) || [])[1]
  if (appId && capId && appId !== capId) FAIL(`applicationId ${appId} != capacitor.config appId ${capId}`)
  else if (appId) OK(`applicationId ${appId} (permanent — never change it after the first upload)`)

  const vars = exists('android/variables.gradle') ? read('android/variables.gradle') : ''
  const target = Number((vars.match(/targetSdkVersion\s*=\s*(\d+)/) || [])[1] || 0)
  const min = Number((vars.match(/minSdkVersion\s*=\s*(\d+)/) || [])[1] || 0)
  if (target >= 35) OK(`targetSdk ${target}, minSdk ${min}`)
  else FAIL(`targetSdk ${target} — Play requires 35 or higher for new uploads, and edge-to-edge behaviour depends on it`)

  // Every permission ends up in the Play data-safety form and on the store page. This app needs
  // exactly two, and a plugin added later can quietly merge in more (a filesystem plugin used to
  // pull in storage permissions on old API levels); an unexpected one here means the form is now
  // wrong, which is a policy problem rather than a bug.
  const manifest = read('android/app/src/main/AndroidManifest.xml')
  const perms = [...manifest.matchAll(/android:name="android\.permission\.([A-Z_]+)"/g)].map(m => m[1]).sort()
  const expected = ['INTERNET', 'VIBRATE']
  const extra = perms.filter(p => !expected.includes(p))
  const missing = expected.filter(p => !perms.includes(p))
  if (!extra.length && !missing.length) OK(`permissions are exactly ${perms.join(' + ')}`)
  if (extra.length) FAIL(`unexpected permission(s): ${extra.join(', ')} — the data-safety form and the listing bullet "nu cere acces la cameră, microfon, locație sau contacte" both have to be revisited`)
  if (missing.length) WARN(`expected permission(s) missing: ${missing.join(', ')} (VIBRATE is what makes the Vibrații switch honest)`)

  // The window background is what paints the strip behind the clock on the older-WebView path,
  // where Capacitor pads the web view instead of passing insets into the page. Unset, it resolves
  // to AppCompat's DayNight default and follows the PHONE's theme while the icon colour follows the
  // APP's — two of four combinations unreadable.
  const styles = exists('android/app/src/main/res/values/styles.xml') ? read('android/app/src/main/res/values/styles.xml') : ''
  const pinsBackground = /<style name="AppTheme.NoActionBar"[\s\S]*?android:windowBackground[\s\S]*?<\/style>/.test(styles)
  if (pinsBackground) OK('AppTheme.NoActionBar pins android:windowBackground (the strip behind the clock cannot follow the phone theme)')
  else WARN('AppTheme.NoActionBar has no android:windowBackground — on a WebView below 140 the band behind the status bar follows the phone theme, not the app')
}

// ─────────────────────────────────────────────────────────────────────────────
P('\n════ 4. SIGNING MATERIAL — present, and never committed ════')
{
  const key = 'android/key.properties'
  const jks = exists('android') ? fs.readdirSync('android').filter(f => /\.(jks|keystore)$/.test(f)) : []
  if (!exists(key) || !jks.length) {
    WARN('no key.properties / keystore in android/ — `npm run keystore` creates them; a release build cannot be signed without them')
  } else {
    OK(`signing material present (${jks.join(', ')})`)
    const ignore = exists('.gitignore') ? read('.gitignore') : ''
    const ignored = /key\.properties/.test(ignore) && /\.jks|\.keystore/.test(ignore)
    ignored ? OK('.gitignore covers key.properties and the keystore')
            : FAIL('.gitignore does NOT cover the signing material — a single commit would publish the upload key, and it cannot be rotated for an existing app without Google\'s help')
    WARN('keep a SECOND, offline copy of the keystore and its password: lose it and this app can never be updated again')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
P('\n════ 5. THE TWO WIRINGS THAT FAIL SILENTLY ════')
{
  // (a) the build stamp: define + declaration are two halves of one feature, in two files.
  const vite = read('vite.config.ts')
  const dts = exists('src/vite-env.d.ts') ? read('src/vite-env.d.ts') : ''
  const defined = /define:\s*\{[^}]*__APP_BUILD__/.test(vite)
  const declared = /declare const __APP_BUILD__/.test(dts)
  if (defined && declared) OK('__APP_BUILD__ is both defined in vite.config.ts and declared for TypeScript')
  else if (defined !== declared) FAIL(`__APP_BUILD__ is ${defined ? 'defined but not declared' : 'declared but not defined'} — the version line would break the build or render nothing`)
  else WARN('__APP_BUILD__ wiring not found — Settings would show no version')

  // (b) the service-worker cache generation, which is pruned by a digits-only regex. Feeding it a
  // human version string leaves the cache name unmatched forever: two-generation pruning dies and
  // the cache grows without bound, silently, until eviction takes offline mode with it.
  const sw = exists('public/sw.js') ? read('public/sw.js') : ''
  if (!sw) WARN('public/sw.js not found — offline mode comes from it')
  else {
    const marker = /const BUILD = \/\*__BUILD__\*\/'([^']*)'/.exec(sw)
    const prune = /\^meem-\\d\+\$/.test(sw) || /meem-\\d\+/.test(sw)
    const injectsDigits = /String\(Date\.now\(\)\)/.test(vite)
    if (marker && prune && injectsDigits) OK('the SW cache stamp stays numeric, so cache pruning keeps working')
    else if (prune && !injectsDigits) FAIL('public/sw.js prunes caches with a digits-only pattern but vite.config.ts no longer injects a numeric stamp — pruning would stop, and the cache would grow without bound')
    else WARN('could not confirm the SW cache-stamp contract (marker / prune pattern / injected value)')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
P('\n════ 6. WHAT THE APP PROMISES ABOUT PRIVACY, vs what the code does ════')
{
  const files = []
  ;(function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = d + '/' + e.name
      if (e.isDirectory()) walk(p)
      else if (/\.(ts|tsx)$/.test(e.name)) files.push(p)
    }
  })('src')
  const all = files.map(f => [f, read(f)])

  // The store listing, PRIVACY.md and now the in-app About line all say the same thing: nothing
  // leaves the phone. One fetch() would make all three false at once.
  const netRe = [[/\bfetch\s*\(/g, 'fetch()'], [/XMLHttpRequest/g, 'XMLHttpRequest'], [/new WebSocket/g, 'WebSocket'], [/navigator\.sendBeacon/g, 'sendBeacon']]
  const hits = []
  for (const [f, c] of all) for (const [re, label] of netRe) { const m = c.match(re); if (m) hits.push(`${f}: ${label} ×${m.length}`) }
  hits.length ? hits.forEach(h => FAIL('network call in src/ — the "nothing is collected" claim is no longer true: ' + h))
              : OK('no fetch / XHR / WebSocket / beacon anywhere in src/')

  // Match the SHAPE of an SDK, not a vocabulary word. The first version of this rule looked for
  // bare "amplitude" and flagged four content files — because this is a measurements course and
  // amplitude is a signal property. A tracker arrives as an import specifier, a global call or a
  // host name; none of those can be confused with the subject matter.
  const trackers = /@sentry\/|@amplitude\/|amplitude\.(getInstance|init|track)|mixpanel\.|posthog\.|gtag\s*\(|dataLayer\.push|googletagmanager|google-analytics|hotjar|facebook\.net|fbq\s*\(/i
  const tHit = all.filter(([, c]) => trackers.test(c)).map(([f]) => f)
  tHit.length ? tHit.forEach(f => FAIL('analytics/tracking SDK in ' + f)) : OK('no analytics or tracking SDKs')

  // Hosts the app can send a student to. Each is a link the user chooses to follow; anything new
  // here has to be disclosed before it ships.
  const disclosed = {
    'forms.cloud.microsoft': 'the end-of-course questionnaire, opened in the system browser',
    'github.com': 'the public repository and the privacy policy',
    'www.w3.org': 'the SVG/MathML namespace, not a request',
    'orcid.org': 'the author identifier in metadata',
    'zenodo.org': 'the archive that mints the DOI',
    'creativecommons.org': 'the content licence',
    'localhost': 'the dev server',
  }
  const hosts = new Set()
  for (const [, c] of all) for (const m of c.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) hosts.add(m[1].toLowerCase())
  for (const h of hosts) disclosed[h] ? OK(`external host ${h} — ${disclosed[h]}`)
                                      : WARN(`undisclosed external host referenced in src/: ${h}`)

  exists('PRIVACY.md') ? OK('PRIVACY.md present (it is the URL Play points at)') : FAIL('PRIVACY.md MISSING — Play requires a reachable privacy policy')
  const about = all.find(([f]) => /Settings\.tsx$/.test(f))
  about && /f[ăa]r[ăa] cont|no account/i.test(about[1])
    ? OK('the app states the no-account/no-data claim in Settings, not only in PRIVACY.md')
    : WARN('the privacy claim is not visible inside the app — a student never opens a URL on GitHub')
}

// ─────────────────────────────────────────────────────────────────────────────
P('\n════ 7. LISTING TEXTS — the limits, in both normalisations ════')
// Self-maintaining by design: every heading in the listing sheet that carries "(max N)" has its
// fenced blocks measured against N. Add a section with a limit in its title and it is checked for
// free. This is the check that would have caught the short description at 81 decomposed.
if (!exists(FISA)) {
  SKIP(`${FISA} not in this tree (it lives outside the repository, with the store material)`)
} else {
  const doc = read(FISA)
  const lines = doc.split('\n')
  let limit = null, heading = '', inFence = false, fence = [], checked = 0
  const flush = () => {
    if (!limit || !fence.length) return
    const text = fence.join('\n')
    const before = heading
    const isEn = /en-US/i.test(before)
    const a = nfc(text), b = nfd(text)
    checked++
    if (b > limit) FAIL(`"${heading.trim()}" — a block is ${a} composed / ${b} DECOMPOSED, over the limit of ${limit}: the console will refuse it the moment a paste decomposes the diacritics`)
    else if (a > limit) FAIL(`"${heading.trim()}" — a block is ${a} characters, over the limit of ${limit}`)
    else if (b > limit - 2) WARN(`"${heading.trim()}" — a block is ${a}/${b} against ${limit}: one character from the edge`)
    // Capitalised tokens are proper nouns — the authors are called Voicilă and Șerițan, and their
    // names are spelt the same in every language. What would be a real leak is a Romanian WORD left
    // in the English text, and those are lowercase. Reported as a warning, not a failure: a quoted
    // Romanian course title is legitimate too, and only a person can tell the difference.
    if (isEn) {
      const leaked = [...new Set((text.match(/\S*[ăâîșț]\S*/g) || []).filter(w => w[0] === w[0].toLowerCase()))]
      if (leaked.length) WARN(`"${heading.trim()}" — Romanian word(s) in an en-US block: ${leaked.slice(0, 6).join(', ')}`)
    }
  }
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      if (inFence) { flush(); fence = [] }
      inFence = !inFence
      continue
    }
    if (inFence) { fence.push(line); continue }
    if (/^#{1,4}\s/.test(line)) {
      const m = line.match(/\(max\s+(\d+)\)/i)
      limit = m ? Number(m[1]) : null
      heading = line.replace(/^#+\s*/, '')
    } else if (/\*\*(ro-RO|en-US)/.test(line)) {
      heading = heading.split(' — ')[0] + ' — ' + line.replace(/\*\*/g, '').trim().slice(0, 40)
    }
  }
  checked ? OK(`${checked} listing block(s) measured against the limit stated in their own heading`)
          : WARN('no "(max N)" heading found in the listing sheet — nothing was measured')
}

// ─────────────────────────────────────────────────────────────────────────────
P('\n════ 8. STORE GRAPHICS — the sizes Play enforces ════')
if (!exists(POZE)) {
  SKIP(`${POZE} not in this tree`)
} else {
  const png = f => {
    const b = fs.readFileSync(f)
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), depth: b[24], colour: b[25] }
  }
  const files = fs.readdirSync(POZE).filter(f => /\.png$/i.test(f))
  const shots = files.filter(f => /^\d/.test(f))
  if (shots.length < 4) FAIL(`${shots.length} screenshots — Play wants at least 4 per language`)
  else OK(`${shots.length} screenshots`)
  for (const f of shots) {
    const { w, h } = png(path.join(POZE, f))
    if (Math.min(w, h) < 1080) FAIL(`${f} is ${w}×${h} — below the 1080 px short edge Play recommends; it must be re-captured, not upscaled`)
  }
  const feat = files.find(f => /feature/i.test(f))
  if (!feat) FAIL('no 1024×500 feature graphic')
  else { const { w, h } = png(path.join(POZE, feat)); (w === 1024 && h === 500) ? OK(`feature graphic ${w}×${h}`) : FAIL(`feature graphic is ${w}×${h}, must be exactly 1024×500`) }
  const icon = files.find(f => /icon.*512/i.test(f))
  if (!icon) FAIL('no 512×512 store icon')
  else {
    const { w, h, colour } = png(path.join(POZE, icon))
    if (w !== 512 || h !== 512) FAIL(`store icon is ${w}×${h}, must be 512×512`)
    else if (colour !== 6) WARN(`store icon colour type ${colour} — Play asks for 32-bit PNG (RGBA, type 6)`)
    else OK('store icon 512×512, 32-bit')
  }
  WARN('unverifiable from here: whether any screenshot shows a graded bank item, and whether the captions are burned in (Play has no caption field). See FISA-LISTARE-PLAY.md §2.4bis')
}

// ─────────────────────────────────────────────────────────────────────────────
P('\n════ 9. IS THIS TREE THE ONE THAT SHIPS ════')
{
  // The bank is not in the repository; a build made without it is the demo. This is the single most
  // expensive mistake available here, because nothing anywhere reports it.
  exists('content-private') ? OK('content-private/ present — a build from this tree is the real course')
                            : WARN('content-private/ ABSENT — anything built here is the 10-exercise demo. Correct for a public clone, catastrophic for a release')
  if (exists('dist/index.html') && exists('src')) {
    const dist = fs.statSync('dist/index.html').mtimeMs
    let newest = 0
    ;(function walk(d) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = d + '/' + e.name
        if (e.isDirectory()) walk(p)
        else newest = Math.max(newest, fs.statSync(p).mtimeMs)
      }
    })('src')
    newest > dist ? WARN('dist/ is older than src/ — run `npm run build` (and `npx cap sync android`) before packaging')
                  : OK('dist/ is newer than every source file')
  }
}

P('\n════════════════════════════════════')
P(`RESULT: ${problems} blocking problem(s), ${warns} warning(s), ${skipped} check(s) skipped`)
if (problems) P('A blocking problem means: do not upload this build until it is answered.')
process.exit(problems ? 1 : 0)
