import { EQUIPMENT, type BenchTheme } from '../content/equipment'
import { earnedEquip } from '../content/modules'
import { Icon } from './icons'
import { useGame } from '../store'
import { useT, L } from '../i18n'
import { proj, boxFaces, quad, shade, type Pt } from '../iso'

export type { BenchTheme }

export const BENCHES: { id: BenchTheme; ro: string; en: string }[] = [
  { id: 'measurement', ro: 'Măsurare', en: 'Measurement' },
  { id: 'research', ro: 'Cercetare', en: 'Research' },
  { id: 'experiment', ro: 'Experimentare', en: 'Experiment' },
]

const THEME: Record<BenchTheme, { floor: string; wallL: string; wallR: string; slabTop: string; slabL: string; slabR: string }> = {
  measurement: { floor: '#0e1620', wallL: '#13202c', wallR: '#0e1a25', slabTop: '#1e2f3e', slabL: '#16232f', slabR: '#101a24' },
  research: { floor: '#0f1220', wallL: '#161a2e', wallR: '#101426', slabTop: '#262341', slabL: '#1b1932', slabR: '#141227' },
  experiment: { floor: '#17120c', wallL: '#1e1811', wallR: '#15100a', slabTop: '#3a2c1c', slabL: '#2b2015', slabR: '#20180f' },
}

const POS = [
  { X: 0.3, Y: 0.3 }, { X: 0.3, Y: 3 }, { X: 3, Y: 0.3 },
  { X: 0.3, Y: 5.7 }, { X: 3, Y: 3 }, { X: 5.7, Y: 0.3 },
  { X: 3, Y: 5.7 }, { X: 5.7, Y: 3 }, { X: 5.7, Y: 5.7 },
]
const O: Pt = { x: 180, y: 118 }
const S = 11.5
const SH = 2
const PW = 2
const PH = 1.4

const activeSkin = (id: string | undefined, inventory: string[]) => {
  const skin = id && id !== 'default' ? EQUIPMENT.find(x => x.id === id) : undefined
  return skin && inventory.includes(skin.id) ? skin : undefined
}

export default function LabBench({ theme }: { theme: BenchTheme }) {
  const { inventory, skins, completed } = useGame()
  // A bench id that is not one of the three leaves this lookup undefined and the very first
  // <polygon fill={t.floor}> throws — which the root ErrorBoundary turns into the crash screen for
  // the WHOLE app, not just this tab. LabTab normalises the id already; this is the crash site
  // itself, so it keeps its own floor.
  const t = THEME[theme] ?? THEME.measurement
  const earned = earnedEquip(completed)
  // Only real instruments (+ device skins) sit on the 3×3 bench; lab/wall skins are the frame/wall themselves.
  const items = EQUIPMENT.filter(e => e.bench === theme && e.skinType !== 'lab' && e.skinType !== 'wall').slice(0, POS.length)
  const slab = boxFaces(O, S, 0, 0, 0, 8, 8, SH)
  const stroke = (hex: string) => shade(hex, 0.78)

  const lab = activeSkin(skins['__lab__'], inventory)
  const wall = activeSkin(skins['__wall__'], inventory)
  const wp = (x: number, z: number) => proj(O, S, x, -1.5, z)
  const wpt = (x: number, z: number) => { const p = wp(x, z); return `${p.x},${p.y}` }

  // `lang` only — `t` above is the bench THEME, not the translator.
  //
  // This drawing was the one graphic in the app that was neither named nor marked decorative: no
  // role, no aria-label, no <title>. Every other meaningful figure carries a name (QuestionVisual
  // uses role="group" so its inner labels stay readable) and every icon is aria-hidden, so this sat
  // in between — announced as a bare unnamed graphic, or skipped, and either way the student never
  // learned what is on their own bench. role="img" is right HERE and not on the question figures:
  // this SVG contains no text at all (measured: zero <text> nodes), so collapsing the subtree loses
  // nothing, and the alternative — listing the instruments — is exactly what the name says.
  const { lang } = useT()
  const onBench = items.filter(e => inventory.includes(e.id) || earned.has(e.id))
  const benchName = BENCHES.find(b => b.id === theme)?.[lang === 'en' ? 'en' : 'ro'] ?? ''
  const benchLabel = onBench.length
    ? `${lang === 'en' ? 'Workbench' : 'Bancul'} ${benchName}: ${onBench.map(e => L(e.name, lang)).join(', ')}`
    : `${lang === 'en' ? 'Workbench' : 'Bancul'} ${benchName} — ${lang === 'en' ? 'still empty' : 'încă gol'}`

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border">
      <svg viewBox="0 0 360 244" className="h-full w-full" role="img" aria-label={benchLabel}>
        <polygon points={quad(O, S, [[-1.5, -1.5, 0], [9.5, -1.5, 0], [9.5, 9.5, 0], [-1.5, 9.5, 0]])} fill={t.floor} />
        <polygon points={quad(O, S, [[-1.5, -1.5, 0], [-1.5, 9.5, 0], [-1.5, 9.5, 6], [-1.5, -1.5, 6]])} fill={t.wallL} />
        <polygon points={quad(O, S, [[-1.5, -1.5, 0], [9.5, -1.5, 0], [9.5, -1.5, 6], [-1.5, -1.5, 6]])} fill={t.wallR} />

        {/* Accreditation certificate on the back wall */}
        {wall && (() => {
          const tone = wall.tone ?? '#e0b84e'
          const seal = wp(5.9, 3.35)
          const ln = (z: number, x1: number) => { const a = wp(6.2, z), b = wp(x1, z); return { x1: a.x, y1: a.y, x2: b.x, y2: b.y } }
          return (
            <g>
              <polygon points={`${wpt(5.2, 5.2)} ${wpt(8.4, 5.2)} ${wpt(8.4, 2.7)} ${wpt(5.2, 2.7)}`} fill="#f5efdc" stroke={tone} strokeWidth={1.3} strokeLinejoin="round" />
              <polygon points={`${wpt(5.4, 5.0)} ${wpt(8.2, 5.0)} ${wpt(8.2, 2.9)} ${wpt(5.4, 2.9)}`} fill="none" stroke={tone} strokeWidth={0.5} strokeOpacity={0.6} />
              <line {...ln(4.7, 8.0)} stroke="#3a3320" strokeWidth={0.7} strokeOpacity={0.55} />
              <line {...ln(4.35, 8.0)} stroke="#3a3320" strokeWidth={0.7} strokeOpacity={0.55} />
              <line {...ln(4.0, 7.5)} stroke="#3a3320" strokeWidth={0.7} strokeOpacity={0.55} />
              <path d={`M${seal.x - 3} ${seal.y + 4} L${seal.x - 4.5} ${seal.y + 11} L${seal.x} ${seal.y + 8} L${seal.x + 4.5} ${seal.y + 11} L${seal.x + 3} ${seal.y + 4} Z`} fill={tone} opacity={0.9} />
              <circle cx={seal.x} cy={seal.y} r={6.4} fill={tone} stroke="#8a6d1e" strokeWidth={0.8} />
              <circle cx={seal.x} cy={seal.y} r={3.4} fill="none" stroke="#fffbe8" strokeWidth={0.7} strokeOpacity={0.7} />
            </g>
          )
        })()}

        <polygon points={slab.left} fill={t.slabL} stroke={stroke(t.slabL)} strokeWidth={0.5} strokeLinejoin="round" />
        <polygon points={slab.right} fill={t.slabR} stroke={stroke(t.slabR)} strokeWidth={0.5} strokeLinejoin="round" />
        <polygon points={slab.top} fill={t.slabTop} stroke={stroke(t.slabTop)} strokeWidth={0.5} strokeLinejoin="round" />

        {items.map((e, i) => {
          const s = POS[i]
          const owned = inventory.includes(e.id) || earned.has(e.id)
          if (!owned) {
            return <polygon key={e.id} points={quad(O, S, [[s.X, s.Y, SH], [s.X + PW, s.Y, SH], [s.X + PW, s.Y + PW, SH], [s.X, s.Y + PW, SH]])}
              fill="none" stroke={shade(t.slabTop, 1.6)} strokeOpacity={0.5} strokeWidth={0.7} strokeDasharray="3 2.5" strokeLinejoin="round" />
          }
          const b = boxFaces(O, S, s.X, s.Y, SH, PW, PW, PH)
          const c = proj(O, S, s.X + PW / 2, s.Y + PW / 2, SH + PH)
          const skin = activeSkin(skins[e.id], inventory)
          const shiny = !!skin
          const hex = shiny && skin?.tone ? skin.tone : e.hex
          return (
            <g key={e.id}>
              {shiny && <circle cx={c.x} cy={c.y} r={24} fill={hex} opacity={0.28} />}
              {shiny && <circle cx={c.x} cy={c.y} r={14} fill={hex} opacity={0.33} />}
              <polygon points={b.left} fill={hex} stroke={stroke(hex)} strokeWidth={0.5} strokeLinejoin="round" />
              <polygon points={b.right} fill={shade(hex, 0.82)} stroke={stroke(hex)} strokeWidth={0.5} strokeLinejoin="round" />
              <polygon points={b.top} fill={shade(hex, 1.12)} stroke={stroke(hex)} strokeWidth={0.5} strokeLinejoin="round" />
              <circle cx={c.x} cy={c.y} r={11} fill="#0b0f14" stroke={hex} strokeWidth={0.8} />
              <g transform={`translate(${c.x - 9},${c.y - 9})`} style={{ color: hex }}>
                <Icon name={e.icon} size={18} />
              </g>
              {shiny && <path d={`M${c.x - 6} ${c.y - 13} L${c.x - 3.5} ${c.y - 19} L${c.x - 1.5} ${c.y - 15.5} L${c.x} ${c.y - 20} L${c.x + 1.5} ${c.y - 15.5} L${c.x + 3.5} ${c.y - 19} L${c.x + 6} ${c.y - 13} Z`} fill={hex} stroke={shade(hex, 0.7)} strokeWidth={0.6} />}
            </g>
          )
        })}

        {/* Lab-template skin: premium frame + glow + ★ PREMIUM badge */}
        {lab && (
          <g style={{ pointerEvents: 'none' }}>
            <rect x="3" y="3" width="354" height="238" rx="12" fill="none" stroke={lab.tone} strokeWidth={3} style={{ filter: `drop-shadow(0 0 7px ${lab.tone})` }} />
            <g transform="translate(249,9)">
              <rect x="0" y="0" width="102" height="24" rx="7" fill="#0b0f14" opacity={0.9} stroke={lab.tone} strokeWidth={1.2} />
              <text x="51" y="16.5" textAnchor="middle" fill={lab.tone} fontSize="12" fontWeight={700} fontFamily="ui-monospace, monospace" letterSpacing="1">★ PREMIUM</text>
            </g>
          </g>
        )}
      </svg>
    </div>
  )
}
