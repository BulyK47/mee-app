// Regenerate every icon size the manifest, iOS and the app stores need, from a single source
// image (SVG or PNG).
//   node scripts/make-icons.mjs [source] [tag] [background]
// Defaults to public/icon-scope.svg → public/icons/scope-*.png
//
// "maskable" variants get a 20% margin: Android crops the icon to the launcher's own shape, so
// artwork that touches the edge would lose its corners. When no background is given it is sampled
// from the source's top-left pixel, which is what a rounded-square app icon has in its corner.
import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'node:fs'

const src = process.argv[2] || 'public/icon-scope.svg'
const tag = process.argv[3] || 'scope'
const OUT = 'public/icons'
const SIZES = [48, 72, 96, 144, 180, 192, 256, 384, 512]

mkdirSync(OUT, { recursive: true })
const buf = readFileSync(src)

async function background() {
  if (process.argv[4]) return process.argv[4]
  if (/\.svg$/i.test(src)) return '#0A0E12'
  const { data } = await sharp(buf).resize(8, 8, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
  const hex = n => n.toString(16).padStart(2, '0')
  return `#${hex(data[0])}${hex(data[1])}${hex(data[2])}`
}
const bg = await background()

for (const s of SIZES) {
  await sharp(buf, { density: 400 }).resize(s, s, { fit: 'cover' }).png().toFile(`${OUT}/${tag}-${s}.png`)
}
for (const s of [192, 512]) {
  const inner = Math.round(s * 0.8)
  const art = await sharp(buf, { density: 400 }).resize(inner, inner, { fit: 'cover' }).png().toBuffer()
  await sharp({ create: { width: s, height: s, channels: 4, background: bg } })
    .composite([{ input: art, top: Math.round((s - inner) / 2), left: Math.round((s - inner) / 2) }])
    .png().toFile(`${OUT}/${tag}-maskable-${s}.png`)
}
console.log(`${SIZES.length + 2} icons written to ${OUT}/${tag}-*.png  (maskable background ${bg})`)
