// Prepares the visual assets Google Play asks for, starting from the raw captures produced by
// scripts/screenshots.mjs.
//
//   node scripts/store-assets.mjs [captureDir] [outDir]
//
// Two things Play rejects that a raw capture violates:
//
//   1. THE RATIO. Two different rules apply, and satisfying only the first is a trap.
//      To be ACCEPTED, the long side must be at most twice the short one: a 412×915 capture at 3×
//      gives 1236×2745, i.e. 1:2.22, which is rejected outright.
//      To be ELIGIBLE FOR RECOMMENDATION PLACEMENTS, Play wants at least four screenshots at 9:16
//      and no smaller than 1080×1920. Assets that merely squeak under 2:1 pass review and then
//      quietly never appear in those placements, with nothing to say so.
//      The target is therefore 9:16 EXACTLY. Nothing is cropped to reach it: the screen keeps its
//      own width and gains side padding in the app's background colour, which reads as deliberate
//      framing rather than as a bug. At 2745 tall that is 1544 wide, well above the 1080×1920 floor.
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
const RAPORT = 9 / 16             // exactly 9:16 — accepted AND eligible for placements

if (!existsSync(IN)) { console.error(`No captures found in ${IN}. Run first: npm run shots`); process.exit(1) }
mkdirSync(OUT, { recursive: true })

const capturi = readdirSync(IN).filter(f => /\.png$/i.test(f)).sort()
if (!capturi.length) { console.error(`No PNG in ${IN}.`); process.exit(1) }

console.log(`preparing ${capturi.length} captures for Play → ${OUT}`)
for (const f of capturi) {
  const src = join(IN, f)
  const { width, height } = await sharp(src).metadata()
  // the width that makes the ratio exactly 9:16, rounded to an even number; never narrower than
  // the capture, so the screen is padded and never cropped
  const latTinta = Math.round(height * RAPORT / 2) * 2
  const lat = Math.max(width, latTinta)
  await sharp({ create: { width: lat, height, channels: 3, background: FUNDAL } })
    .composite([{ input: await sharp(src).flatten({ background: FUNDAL }).toBuffer(), left: Math.round((lat - width) / 2), top: 0 }])
    // `channels: 3` on the canvas is not enough: compositing puts alpha back, and sharp was
    // writing RGBA PNGs with a fully opaque alpha — invisible to the eye, but the colour type in
    // the file stays 6, not 2, which is exactly what Play says it does not accept. removeAlpha()
    // strips the channel on output.
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(join(OUT, f))
  const r = height / lat
  const ok = Math.abs(r - 16 / 9) < 0.01 && lat >= 1080 && height >= 1920
  console.log(`  ▸ ${f.padEnd(18)} ${width}×${height} → ${lat}×${height}  (1:${r.toFixed(3)}${ok ? ' ✓ 9:16, ≥1080×1920' : ' ✗'})`)
}
console.log(`done · ${capturi.length} files, PNG with no alpha channel`)
