// Pregătește materialele vizuale cerute de Google Play, pornind de la capturile brute produse de
// scripts/screenshots.mjs.
//
//   node scripts/store-assets.mjs [dirCapturi] [dirIesire]
//
// Două lucruri pe care Play le respinge și pe care o captură brută le încalcă:
//
//   1. RAPORTUL. Regula nu e „9:16", ci „latura lungă cel mult dublul celei scurte". O captură de
//      412×915 la 3× dă 1236×2745, adică 1:2,22 — respinsă. Nu tăiem conținut ca s-o încadrăm:
//      adăugăm ramă laterală în culoarea de fundal a aplicației, până raportul intră în limită.
//      Ecranul rămâne întreg, iar rama arată intenționat, nu ca o eroare.
//
//   2. CANALUL ALFA. Play cere PNG pe 24 de biți, fără transparență. Chrome scoate RGBA, deci
//      aplatizăm pe fundal opac. Fără asta, încărcarea eșuează cu un mesaj care nu spune de ce.
import sharp from 'sharp'
import { readdirSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const IN = process.argv[2] || '../poze/store'
const OUT = process.argv[3] || '../poze/play'
const FUNDAL = '#0A0E12'          // aceeași culoare ca `background_color` din manifest
const RAPORT_MAX = 2              // latura lungă / latura scurtă, impus de Play

if (!existsSync(IN)) { console.error(`Nu găsesc capturile în ${IN}. Rulează întâi: npm run shots`); process.exit(1) }
mkdirSync(OUT, { recursive: true })

const capturi = readdirSync(IN).filter(f => /\.png$/i.test(f)).sort()
if (!capturi.length) { console.error(`Niciun PNG în ${IN}.`); process.exit(1) }

console.log(`pregătesc ${capturi.length} capturi pentru Play → ${OUT}`)
for (const f of capturi) {
  const src = join(IN, f)
  const { width, height } = await sharp(src).metadata()
  // lățimea minimă la care raportul intră în limită, rotunjită la par
  const latMin = Math.ceil(height / RAPORT_MAX / 2) * 2
  const lat = Math.max(width, latMin)
  await sharp({ create: { width: lat, height, channels: 3, background: FUNDAL } })
    .composite([{ input: await sharp(src).flatten({ background: FUNDAL }).toBuffer(), left: Math.round((lat - width) / 2), top: 0 }])
    // `channels: 3` pe pânză nu e de ajuns: compunerea reintroduce alfa, iar sharp scria PNG-uri
    // RGBA cu alfa complet opac — invizibil la privire, dar tipul de culoare din fișier rămâne 6,
    // nu 2, adică exact ce zice Play că nu acceptă. removeAlpha() taie canalul la ieșire.
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(join(OUT, f))
  const r = (height / lat).toFixed(2)
  console.log(`  ▸ ${f.padEnd(18)} ${width}×${height} → ${lat}×${height}  (raport 1:${r}${r <= RAPORT_MAX ? ' ✓' : ' ✗'})`)
}
console.log(`gata · ${capturi.length} fișiere, PNG fără canal alfa`)
