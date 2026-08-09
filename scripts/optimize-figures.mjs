// Recompress extracted figures to WebP (much smaller, theme-neutral). Run from the app dir.
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const DIR = path.resolve(process.argv[2] || 'public/figures')
const files = fs.readdirSync(DIR).filter(f => !/\.webp$/i.test(f))
let before = 0, after = 0, ok = 0
for (const f of files) {
  const src = path.join(DIR, f)
  before += fs.statSync(src).size
  const out = path.join(DIR, f.replace(/\.[^.]+$/, '.webp'))
  try {
    await sharp(src).rotate().resize({ width: 1000, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out)
    after += fs.statSync(out).size
    fs.unlinkSync(src)
    ok++
  } catch (e) {
    console.log('skip', f, e.message)
  }
}
console.log(`optimized ${ok}/${files.length}: ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB`)
