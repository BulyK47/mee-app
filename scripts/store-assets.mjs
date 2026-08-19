// Prepares the visual assets Google Play asks for, starting from the raw captures produced by
// scripts/screenshots.mjs.
//
//   node scripts/store-assets.mjs [captureDir] [outDir]
//
// Two things Play rejects that a raw capture violates:
//
//   1. THE RATIO. The rule is not "9:16", it is "the long side at most twice the short one". A
//      412×915 capture at 3× gives 1236×2745, i.e. 1:2.22 — rejected. Content is not cropped to
//      make it fit: side padding in the app's background colour is added until the ratio comes
//      within the limit. The screen stays whole, and the padding reads as deliberate, not as a bug.
//
//   2. THE ALPHA CHANNEL. Play wants 24-bit PNG, no transparency. Chrome emits RGBA, so it is
//      flattened onto an opaque background. Without that, the upload fails with a message that
//      never says why.
import sharp from 'sharp'
import { readdirSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const IN = process.argv[2] || '../poze/store'
const OUT = process.argv[3] || '../poze/play'
const FUNDAL = '#0A0E12'          // same colour as `background_color` in the manifest
const RAPORT_MAX = 2              // long side / short side, the limit Play imposes

if (!existsSync(IN)) { console.error(`No captures found in ${IN}. Run first: npm run shots`); process.exit(1) }
mkdirSync(OUT, { recursive: true })

const capturi = readdirSync(IN).filter(f => /\.png$/i.test(f)).sort()
if (!capturi.length) { console.error(`No PNG in ${IN}.`); process.exit(1) }

console.log(`preparing ${capturi.length} captures for Play → ${OUT}`)
for (const f of capturi) {
  const src = join(IN, f)
  const { width, height } = await sharp(src).metadata()
  // the smallest width at which the ratio comes within the limit, rounded up to an even number
  const latMin = Math.ceil(height / RAPORT_MAX / 2) * 2
  const lat = Math.max(width, latMin)
  await sharp({ create: { width: lat, height, channels: 3, background: FUNDAL } })
    .composite([{ input: await sharp(src).flatten({ background: FUNDAL }).toBuffer(), left: Math.round((lat - width) / 2), top: 0 }])
    // `channels: 3` on the canvas is not enough: compositing puts alpha back, and sharp was
    // writing RGBA PNGs with a fully opaque alpha — invisible to the eye, but the colour type in
    // the file stays 6, not 2, which is exactly what Play says it does not accept. removeAlpha()
    // strips the channel on output.
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(join(OUT, f))
  const r = (height / lat).toFixed(2)
  console.log(`  ▸ ${f.padEnd(18)} ${width}×${height} → ${lat}×${height}  (ratio 1:${r}${r <= RAPORT_MAX ? ' ✓' : ' ✗'})`)
}
console.log(`done · ${capturi.length} files, PNG with no alpha channel`)
