// Parametric SVG "instrument" visuals for questions. Rendered from exercise.visual = { kind, params }.
import { Formula } from '../ui/Formula'
import { FormulaMath } from '../ui/FormulaMath'
type Params = Record<string, unknown>
const WIRE = 'var(--color-fg)'
const ACCENT = 'var(--color-accent)'
const DIM = 'var(--color-faint)'
// Figure ink follows the theme (see --color-ink-* in index.css). SCREEN_* keep the raw phosphor
// and volt hues for the one place they are painted on the oscilloscope's fixed dark screen, where
// bright IS correct — 10.5:1 and 13.4:1 there, versus 1.8:1 and 1.4:1 on a white panel.
const PHOS = 'var(--color-ink-phos)'
const AMBER = 'var(--color-ink-amber)'
const SCREEN_PHOS = 'var(--color-phosphor-500)'
const SCREEN_AMBER = 'var(--color-volt-400)'
const ROSE = 'var(--color-ink-rose)'

const num = (v: unknown, d: number) => (typeof v === 'number' && !Number.isNaN(v) ? v : typeof v === 'string' && v.trim() !== '' && !isNaN(+v) ? +v : d)
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d)
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const loc = (v: unknown, lang: string): string => {
  if (v && typeof v === 'object' && 'ro' in (v as Record<string, unknown>)) { const o = v as Record<string, string>; return o[lang] ?? o.ro ?? '' }
  return typeof v === 'string' ? v : ''
}

function Frame({ children, h = 180 }: { children: React.ReactNode; h?: number }) {
  return (
    <div className="mb-3 flex justify-center rounded-lg border border-border bg-panel p-3">
      <svg viewBox={`0 0 300 ${h}`} className="w-full max-w-[320px]" fill="none" stroke={WIRE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </div>
  )
}
function T(x: number, y: number, s: string, fill = WIRE, size = 13) {
  return <text x={x} y={y} fill={fill} stroke="none" fontFamily="ui-monospace, monospace" fontSize={size} textAnchor="middle">{s}</text>
}
// like T(), but "X_sub" renders "sub" as a real subscript (SVG text can't do "_" on its own)
function Tsub(x: number, y: number, s: string, fill = WIRE, size = 13) {
  const nodes: React.ReactNode[] = []
  let i = 0, k = 0, up = false
  while (i < s.length) {
    if (s[i] === '_') {
      i++; let sub = ''
      while (i < s.length && /[A-Za-z0-9]/.test(s[i])) sub += s[i++]
      nodes.push(<tspan key={k++} dy={3} fontSize={size * 0.72}>{sub}</tspan>); up = true
    } else {
      let run = ''
      while (i < s.length && s[i] !== '_') run += s[i++]
      nodes.push(<tspan key={k++} dy={up ? -3 : 0} fontSize={size}>{run}</tspan>); up = false
    }
  }
  return <text x={x} y={y} fill={fill} stroke="none" fontFamily="ui-monospace, monospace" fontSize={size} textAnchor="middle">{nodes}</text>
}

// ——— standard instrument-face glyphs (construction type, current type) ———
function conGlyph(key: string, cx: number, cy: number, s = WIRE) {
  const k = key.toLowerCase()
  if (/magneto|cadru mobil|moving.?coil/.test(k)) return <g stroke={s}><path d={`M${cx - 7} ${cy + 7} V${cy - 3} M${cx + 7} ${cy + 7} V${cy - 3} M${cx - 7} ${cy - 3} A7 7 0 0 1 ${cx + 7} ${cy - 3}`} /><rect x={cx - 2.5} y={cy - 3} width={5} height={11} /></g>
  // IEC 60051 moving-iron (feromagnetic): the fixed coil drawn as a zigzag winding with the
  // iron core as a straight bar through it (per the standard "Moving Iron Instrument Symbol")
  if (/fero|iron|vane/.test(k)) return <g stroke={s} fill="none">
    <path d={`M${cx + 7} ${cy - 8} L${cx - 6} ${cy - 5.3} L${cx + 3} ${cy - 2.7} L${cx - 6} ${cy} L${cx + 3} ${cy + 2.7} L${cx - 6} ${cy + 5.3} L${cx + 7} ${cy + 8}`} strokeWidth={1.3} strokeLinejoin="round" />
    <line x1={cx - 1} y1={cy - 8} x2={cx - 1} y2={cy + 6.5} strokeWidth={2} />
  </g>
  if (/electrodinam|electrodynamic/.test(k)) return <g stroke={s}><ellipse cx={cx - 3.5} cy={cy} rx={5.5} ry={8} /><ellipse cx={cx + 3.5} cy={cy} rx={5.5} ry={8} /></g>
  if (/term|thermal|hot.?wire/.test(k)) return <path d={`M${cx - 9} ${cy} l4 -6 l3.5 12 l3.5 -12 l4 6`} stroke={s} />
  if (/electrostat/.test(k)) return <g stroke={s}><line x1={cx - 6} y1={cy - 7} x2={cx - 6} y2={cy + 7} /><path d={`M${cx + 2} ${cy - 7} a7 7 0 0 1 0 14`} /></g>
  return <g stroke={s}><circle cx={cx} cy={cy} r={8} />{T(cx, cy + 4, '?', s, 11)}</g>
}
function curGlyph(key: string, cx: number, cy: number, s = WIRE) {
  const k = key.toLowerCase()
  if (/both|≂|ambele/.test(k)) return <g stroke={s}><path d={`M${cx - 9} ${cy - 3} q4.5 -6 9 0 t9 0`} /><line x1={cx - 9} y1={cy + 5} x2={cx + 9} y2={cy + 5} /></g>
  if (/ac|~|altern/.test(k)) return <path d={`M${cx - 9} ${cy} q4.5 -7 9 0 t9 0`} stroke={s} />
  return <g stroke={s}><line x1={cx - 9} y1={cy - 2} x2={cx + 9} y2={cy - 2} /><line x1={cx - 7} y1={cy + 4} x2={cx + 7} y2={cy + 4} strokeDasharray="3 3" /></g>
}
function starGlyph(cx: number, cy: number, txt: string, s = AMBER) {
  // IEC face marking: the test-voltage figure (kV) sits INSIDE the star — a digit beside it
  // could be mistaken for the accuracy class
  const pts = []
  for (let i = 0; i < 5; i++) { const a = -90 + i * 72; const a2 = a + 36; pts.push(`${cx + 13 * Math.cos(a * Math.PI / 180)},${cy + 13 * Math.sin(a * Math.PI / 180)}`, `${cx + 6.5 * Math.cos(a2 * Math.PI / 180)},${cy + 6.5 * Math.sin(a2 * Math.PI / 180)}`) }
  return <g><polygon points={pts.join(' ')} stroke={s} fill="none" strokeWidth={1.3} />{T(cx, cy + 3.5, txt, s, 9)}</g>
}

// class marks are printed on the dial with the reader's decimal separator ("0,5" / "0.5")
const dec = (v: unknown, lang: string) => (v == null || v === '' ? '' : String(v).replace('.', lang === 'en' ? '.' : ','))

function Meter({ p, lang = 'ro' }: { p: Params; lang?: string }) {
  const unit = str(p.unit, 'V'), max = num(p.max, 30), reading = num(p.reading, max * 0.6)
  const cls = dec(p.cls, lang)
  // multimeters carry two classes on the dial — "→1,5" for d.c. and "∼2,5" for a.c.
  const clsDc = dec(p.clsDc, lang), clsAc = dec(p.clsAc, lang)
  const construction = str(p.construction, '')
  const current = str(p.current, '')
  const testkV = p.testkV != null && p.testkV !== '' ? String(p.testkV) : ''
  const cx = 150, cy = 118, r = 92, a0 = 205, a1 = 335
  const pt = (deg: number, rr: number) => [cx + rr * Math.cos(deg * Math.PI / 180), cy + rr * Math.sin(deg * Math.PI / 180)]
  const [sx, sy] = pt(a0, r), [ex, ey] = pt(a1, r)
  const ticks: React.ReactNode[] = []
  for (let i = 0; i <= 10; i++) { const a = a0 + (a1 - a0) * i / 10; const big = i % 5 === 0; const [x1, y1] = pt(a, r), [x2, y2] = pt(a, r - (big ? 13 : 8)); ticks.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={WIRE} strokeWidth={big ? 2 : 1} />) }
  const frac = Math.max(0, Math.min(1, max ? reading / max : 0.6))
  const [px, py] = pt(a0 + (a1 - a0) * frac, r - 18)
  // markings row
  const cells: ((x: number) => React.ReactNode)[] = []
  if (construction) cells.push(x => conGlyph(construction, x, 168, WIRE))
  if (current) cells.push(x => curGlyph(current, x, 168, WIRE))
  if (cls) cells.push(x => T(x, 172, cls, AMBER, 15))
  const dual = !!(clsDc || clsAc)
  if (dual) cells.push(x => (
    <g>
      {clsDc && <g><path d={`M${x - 19} ${159} h10`} stroke={AMBER} strokeWidth={1.6} />{T(x + 5, 163, clsDc, AMBER, 13)}</g>}
      {clsAc && <g><path d={`M${x - 19} ${176} q2.5 -4 5 0 t5 0`} stroke={AMBER} strokeWidth={1.6} />{T(x + 5, 179, clsAc, AMBER, 13)}</g>}
    </g>
  ))
  if (testkV) cells.push(x => starGlyph(x, 168, testkV))
  const gap = dual ? 54 : 42
  const startX = 150 - (cells.length - 1) * gap / 2
  const freq = str(p.freq, '')
  return (
    <Frame h={196}>
      <rect x="22" y="20" width="256" height="164" rx="10" fill="var(--color-panel)" stroke="var(--color-border)" />
      <path d={`M${sx} ${sy} A${r} ${r} 0 0 1 ${ex} ${ey}`} stroke={WIRE} strokeWidth={2} />
      {ticks}
      {T(sx + 10, sy + 2, '0', DIM, 11)}{T(ex - 10, ey + 2, dec(max, lang), DIM, 11)}
      <line x1={cx} y1={cy} x2={px} y2={py} stroke={ACCENT} strokeWidth={2.5} />
      <circle cx={cx} cy={cy} r="5" fill={ACCENT} stroke="none" />
      {T(cx, cy - 24, unit, DIM, 14)}
      {freq && T(251, 148, freq, DIM, 10)}
      {cells.map((c, i) => <g key={i}>{c(startX + i * gap)}</g>)}
    </Frame>
  )
}

// ——— multi-range ammeter: dial + terminal strip, terminals numbered right→left ———
function RangeMeter({ p, lang = 'ro' }: { p: Params; lang?: string }) {
  const R = arr(p.ranges).map(x => String(x))
  const ranges = R.length ? R : ['5', '1', '0.2'] // panel order, left→right
  const unit = str(p.unit, 'A'), needle = num(p.needle, 0.5)
  const cx = 150, cy = 62, r = 44, a0 = 205, a1 = 335
  const pt = (deg: number, rr: number) => [cx + rr * Math.cos(deg * Math.PI / 180), cy + rr * Math.sin(deg * Math.PI / 180)]
  const [sx, sy] = pt(a0, r), [ex, ey] = pt(a1, r)
  const ticks: React.ReactNode[] = []
  for (let i = 0; i <= 10; i++) { const a = a0 + (a1 - a0) * i / 10; const big = i % 5 === 0; const [x1, y1] = pt(a, r), [x2, y2] = pt(a, r - (big ? 9 : 6)); ticks.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={WIRE} strokeWidth={big ? 1.6 : 0.9} />) }
  const [nx, ny] = pt(a0 + (a1 - a0) * Math.max(0, Math.min(1, needle)), r - 11)
  const terms = [...ranges.map(v => v + ' ' + unit), 'COM']
  const n = terms.length, x0 = 46, gap = (300 - 2 * x0) / (n - 1)
  return (
    <Frame h={188}>
      <rect x="18" y="12" width="264" height="162" rx="10" fill="var(--color-panel)" stroke="var(--color-border)" />
      <path d={`M${sx} ${sy} A${r} ${r} 0 0 1 ${ex} ${ey}`} stroke={WIRE} strokeWidth={1.6} />
      {ticks}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={ACCENT} strokeWidth={2.2} />
      <circle cx={cx} cy={cy} r="3.5" fill={ACCENT} stroke="none" />
      {T(cx, cy - 16, unit, DIM, 13)}
      {T(cx, cy + 26, ranges.join(' · ') + ' ' + unit, DIM, 9)}
      {T(150, 112, lang === 'en' ? 'terminals — numbered from the right →' : 'borne — numerotate de la dreapta →', DIM, 8.5)}
      {terms.map((lab, i) => {
        const x = x0 + i * gap, com = i === n - 1
        return <g key={i}>
          <circle cx={x} cy={138} r={8.5} fill="var(--color-bg)" stroke={com ? AMBER : WIRE} strokeWidth={com ? 2.2 : 1.4} />
          <circle cx={x} cy={138} r={3} fill={com ? AMBER : WIRE} stroke="none" />
          {T(x, 129, String(n - i), ACCENT, 10)}
          {T(x, 162, lab, com ? AMBER : WIRE, 10)}
        </g>
      })}
    </Frame>
  )
}

// ——— rise-time oscillogram: a step response on a scope grid with 10%/90% cursors ———
function RiseTime({ p }: { p: Params }) {
  const NX = 10, NY = 6, D = 26, W = NX * D, H = NY * D, ox = (300 - W) / 2
  const tdiv = str(p.tdiv, '10 ms'), vdiv = str(p.vdiv, '2 V')
  const lo = H - D, hi = D, amp = lo - hi
  const tau = num(p.tau, 0.865), x0 = num(p.start, 2.2) // 10%→90% span ≈ 2.197·tau divisions
  const yAt = (xd: number) => { const t = xd - x0; return t <= 0 ? lo : lo - amp * (1 - Math.exp(-t / tau)) }
  let d = ''
  for (let px = 0; px <= W; px += 2) d += (px === 0 ? 'M' : 'L') + px + ' ' + yAt(px / D).toFixed(1)
  const x10 = (x0 + tau * 0.10536) * D, x90 = (x0 + tau * 2.302585) * D
  const y10 = lo - amp * 0.1, y90 = lo - amp * 0.9
  const grid: React.ReactNode[] = []
  for (let i = 0; i <= NX; i++) grid.push(<line key={'v' + i} x1={i * D} y1={0} x2={i * D} y2={H} stroke={DIM} strokeWidth={i % NX === 0 ? 1 : 0.5} strokeDasharray={i % NX === 0 ? '' : '1 4'} opacity={0.5} />)
  for (let j = 0; j <= NY; j++) grid.push(<line key={'h' + j} x1={0} y1={j * D} x2={W} y2={j * D} stroke={DIM} strokeWidth={j % NY === 0 ? 1 : 0.5} strokeDasharray={j % NY === 0 ? '' : '1 4'} opacity={0.5} />)
  return (
    <Frame h={H + 30}>
      <g transform={`translate(${ox} 4)`}>
        <rect x={0} y={0} width={W} height={H} fill="#04120b" stroke="var(--color-border)" />
        {grid}
        {/* everything in this <g> is painted on the #04120b screen above, so it keeps the bright
            screen hues in both themes */}
        <line x1={0} y1={y10} x2={W} y2={y10} stroke={SCREEN_AMBER} strokeWidth={0.9} strokeDasharray="4 3" />
        <line x1={0} y1={y90} x2={W} y2={y90} stroke={SCREEN_AMBER} strokeWidth={0.9} strokeDasharray="4 3" />
        {T(20, y10 - 4, '10%', SCREEN_AMBER, 9)}{T(20, y90 - 4, '90%', SCREEN_AMBER, 9)}
        <line x1={x10} y1={0} x2={x10} y2={H} stroke={ACCENT} strokeWidth={0.9} strokeDasharray="4 3" />
        <line x1={x90} y1={0} x2={x90} y2={H} stroke={ACCENT} strokeWidth={0.9} strokeDasharray="4 3" />
        <path d={d} stroke={SCREEN_PHOS} strokeWidth={2.2} fill="none" style={{ filter: `drop-shadow(0 0 2px ${SCREEN_PHOS})` }} />
        <line x1={x10} y1={hi - 7} x2={x90} y2={hi - 7} stroke={ACCENT} strokeWidth={1} />
        {Tsub((x10 + x90) / 2, hi - 10, 't_cr = ?', ACCENT, 10)}
      </g>
      {T(150, H + 22, tdiv + '/div  ·  ' + vdiv + '/div', DIM, 9)}
    </Frame>
  )
}

// ——— simple series–parallel passive network: two identical X in parallel, in series with a third → X_ech = 1.5·X ———
function SerPar({ p, lang = 'ro' }: { p: Params; lang?: string }) {
  const kind = str(p.kind, 'R').toUpperCase()
  const lab = str(p.label, kind === 'L' ? 'L' : kind === 'C' ? 'C' : 'R')
  const comp = (cx: number, cy: number) => {
    if (kind === 'L') {
      let d = `M${cx - 15} ${cy}`
      for (let k = 0; k < 3; k++) d += ` A5 5 0 0 1 ${cx - 15 + (k + 1) * 10} ${cy}`
      return <path d={d} stroke={ACCENT} strokeWidth={2} fill="none" />
    }
    if (kind === 'C') return <g stroke={ACCENT} strokeWidth={2}><line x1={cx - 3.5} y1={cy - 9} x2={cx - 3.5} y2={cy + 9} /><line x1={cx + 3.5} y1={cy - 9} x2={cx + 3.5} y2={cy + 9} /></g>
    return <rect x={cx - 15} y={cy - 6} width={30} height={12} fill="var(--color-panel)" stroke={ACCENT} strokeWidth={1.6} />
  }
  const branch = (cy: number) => <g>
    <line x1={95} y1={cy} x2={120} y2={cy} /><line x1={150} y1={cy} x2={175} y2={cy} />
    {comp(135, cy)}{T(135, cy - 12, lab, ACCENT, 12)}
  </g>
  return (
    <Frame>
      <line x1={30} y1={55} x2={30} y2={145} /><line x1={30} y1={145} x2={250} y2={145} /><line x1={250} y1={55} x2={250} y2={145} />
      <circle cx={30} cy={100} r={14} fill="var(--color-panel)" />{T(30, 105, '~', DIM, 14)}
      <line x1={30} y1={55} x2={95} y2={55} />
      <line x1={95} y1={55} x2={95} y2={105} /><line x1={175} y1={55} x2={175} y2={105} />
      {branch(55)}{branch(105)}
      <line x1={175} y1={55} x2={197} y2={55} /><line x1={227} y1={55} x2={250} y2={55} />
      {comp(212, 55)}{T(212, 43, lab, ACCENT, 12)}
      {/* the only caption baked into a figure; every other visual takes its text from the exercise */}
      {T(140, 172, lang === 'en' ? 'two in parallel · one in series' : 'două în paralel · una în serie', DIM, 9)}
    </Frame>
  )
}

function Symbols({ p }: { p: Params }) {
  const items = arr(p.items).map(x => String(x)).slice(0, 4)
  return (
    <Frame h={112}>
      {items.map((it, i) => {
        const x = 20 + i * 68, cxg = x + 30
        const g = /magneto|fero|electrodinam|term|electrostat|moving|iron|vane/.test(it.toLowerCase()) ? conGlyph(it, cxg, 46, ACCENT)
          : /ac|dc|~|=|altern|continu|both/.test(it.toLowerCase()) ? curGlyph(it, cxg, 46, ACCENT)
            : /class|clas|^\d/.test(it.toLowerCase()) ? T(cxg, 51, it, AMBER, 16)
              : T(cxg, 51, it.slice(0, 3), ACCENT, 13)
        return <g key={i}><rect x={x} y={22} width={60} height={48} rx={6} fill="var(--color-panel)" stroke="var(--color-border)" />{g}</g>
      })}
    </Frame>
  )
}

function CircuitAV({ p, lang = 'ro' }: { p: Params; lang?: string }) {
  const aval = str(p.mode, 'amonte') === 'aval'
  const comp = str(p.comp, 'Rx')
  const src = str(p.source, 'AC') === 'DC' ? '=' : '~'
  const tapL = aval ? 150 : 78
  // The loop is drawn as separate segments with a gap at every element: a wire running behind a
  // series component would short it out, which is what "the capacitor cuts the circuit" looked like.
  return (
    <Frame>
      <path d="M40 40 H98 M126 40 H182 M224 40 H260 V132 H40 V101 M40 71 V40" />
      <circle cx="40" cy="86" r="15" fill="var(--color-panel)" />{T(40, 91, src)}
      <circle cx="112" cy="40" r="14" fill="var(--color-panel)" />{T(112, 45, 'A')}
      {comp.charAt(0) === 'C'
        ? <g stroke={ACCENT} strokeWidth={2} fill="none"><line x1="182" y1="40" x2="198" y2="40" /><line x1="198" y1="31" x2="198" y2="49" /><line x1="208" y1="31" x2="208" y2="49" /><line x1="208" y1="40" x2="224" y2="40" /></g>
        : comp.charAt(0) === 'L'
          ? <g stroke={ACCENT} strokeWidth={2} fill="none"><line x1="182" y1="40" x2="188" y2="40" /><path d="M188 40 q4.5 -10 9 0 q4.5 -10 9 0 q4.5 -10 9 0" /><line x1="215" y1="40" x2="224" y2="40" /></g>
          : <rect x="182" y="31" width="42" height="18" rx="2" fill="var(--color-panel)" stroke={ACCENT} />}
      {T(203, 66, comp, ACCENT)}
      <circle cx="203" cy="120" r="14" fill="var(--color-panel)" />{T(203, 125, 'V')}
      <path d={`M${tapL} 40 V120 H189`} stroke={DIM} /><path d="M247 40 V120 H217" stroke={DIM} />
      {/* the English wording is the bank's own — it renders these as "voltmeter-ammeter (amonte)"
          and "ammeter-voltmeter (aval)" throughout, keeping the Romanian term in parentheses
          because it is the name the course uses. The caption must not disagree with the prompt. */}
      {!p.hideLabel && T(150, 168, lang === 'en'
        ? (aval ? 'ammeter-voltmeter (aval)' : 'voltmeter-ammeter (amonte)')
        : (aval ? 'montaj aval' : 'montaj amonte'), DIM, 12)}
    </Frame>
  )
}

function Shunt() {
  const y = 104, A = 88, B = 120 // ammeter terminals (left, right)
  return (
    <Frame>
      {/* main line through the ammeter */}
      <path d={`M22 ${y} H${A}`} />
      <circle cx={104} cy={y} r={16} fill="var(--color-panel)" />{T(104, y + 5, 'A')}
      <path d={`M${B} ${y} H282`} />
      {/* shunt Rs in PARALLEL across the ammeter's two terminals */}
      <path d={`M${A} ${y} V58 H92`} /><rect x="92" y="49" width="24" height="18" rx="2" fill="var(--color-panel)" stroke={ACCENT} /><path d={`M116 58 H${B} V${y}`} />
      <text x={104} y={43} fill={ACCENT} stroke="none" fontFamily="ui-monospace, monospace" fontSize={12} textAnchor="middle">R<tspan dy={3} fontSize={9}>s</tspan><tspan dy={-3}> (șunt)</tspan></text>
      {T(50, y - 8, 'I', DIM, 12)}{Tsub(104, y + 32, 'I_A', DIM, 11)}{T(250, y - 8, 'I', DIM, 12)}
    </Frame>
  )
}

// Professional oscilloscope: 10×8-division CRT, dotted graticule, one or more
// traces defined by period/amplitude IN DIVISIONS, optional measurement cursors.
function Scope({ p }: { p: Params }) {
  const NX = 10, NY = 8, D = 27, W = NX * D, H = NY * D, cy = H / 2
  const col = (c: string) => c === 'yellow' ? '#FFE23D' : c === 'cyan' ? '#38D6E3' : c === 'red' ? '#FF5C6C' : '#3DF06E'
  const wv = (w: string, t: number) => { const ph = t * 2 * Math.PI; return w === 'square' ? (Math.sin(ph) >= 0 ? 1 : -1) : w === 'triangle' ? (2 / Math.PI) * Math.asin(Math.sin(ph)) : Math.sin(ph) }
  let traces = arr(p.traces).filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
  if (!traces.length) traces = [{ color: 'green', period: NX / Math.max(0.5, num(p.periods, 2)), amp: num(p.amp, 2), phase: 0, wave: str(p.wave, 'sine') }]
  const pathFor = (tr: Record<string, unknown>) => {
    const period = Math.max(0.4, num(tr.period, 4)), amp = num(tr.amp, 2), phase = num(tr.phase, 0), w = str(tr.wave, 'sine')
    let d = ''
    for (let px = 0; px <= W; px += 2) { let t = ((px / D - phase) / period) % 1; if (t < 0) t += 1; const y = cy - amp * D * wv(w, t); d += (px === 0 ? 'M' : 'L') + px.toFixed(0) + ' ' + y.toFixed(1) }
    return d
  }
  const grid: React.ReactNode[] = []
  for (let i = 0; i <= NX; i++) { const mid = i === NX / 2; grid.push(<line key={'v' + i} x1={i * D} y1={0} x2={i * D} y2={H} stroke={mid ? '#3f6650' : '#213c2e'} strokeWidth={mid ? 1 : 0.7} strokeDasharray={mid ? undefined : '1 6'} />) }
  for (let i = 0; i <= NY; i++) { const mid = i === NY / 2; grid.push(<line key={'h' + i} x1={0} y1={i * D} x2={W} y2={i * D} stroke={mid ? '#3f6650' : '#213c2e'} strokeWidth={mid ? 1 : 0.7} strokeDasharray={mid ? undefined : '1 6'} />) }
  const cx = W / 2 // minor ticks: 5 subdivisions per division on the centre axes
  for (let i = 1; i < NX * 5; i++) if (i % 5) grid.push(<line key={'mx' + i} x1={i * D / 5} y1={cy - 3} x2={i * D / 5} y2={cy + 3} stroke="#3f6650" strokeWidth={0.6} />)
  for (let i = 1; i < NY * 5; i++) if (i % 5) grid.push(<line key={'my' + i} x1={cx - 3} y1={i * D / 5} x2={cx + 3} y2={i * D / 5} stroke="#3f6650" strokeWidth={0.6} />)
  const cursors = arr(p.cursors).map(c => num(c, 0))
  return (
    <div className="mb-3 flex justify-center rounded-lg border border-border bg-panel p-3">
      <svg viewBox={`-6 -22 ${W + 12} ${H + 34}`} className="w-full max-w-[380px]" fill="none">
        {/* these two sit ABOVE the screen rect (viewBox y starts at -22), i.e. on the panel, so
            they need the theme-aware ink — they carry the V/div and time/div the student has to
            read to answer the question at all */}
        {p.vdiv != null && T(34, -9, str(p.vdiv, ''), ROSE, 11)}
        {p.tdiv != null && T(W - 36, -9, str(p.tdiv, ''), ROSE, 11)}
        <rect x={0} y={0} width={W} height={H} fill="#04120b" stroke="var(--color-border)" strokeWidth={1} />
        {grid}
        {traces.map((tr, i) => <path key={i} d={pathFor(tr)} stroke={col(str(tr.color, 'green'))} strokeWidth={2.2} fill="none" style={{ filter: `drop-shadow(0 0 2px ${col(str(tr.color, 'green'))})` }} />)}
        {cursors.map((c, i) => <line key={'c' + i} x1={c * D} y1={-4} x2={c * D} y2={H + 4} stroke="#FF3B4E" strokeWidth={1.3} />)}
      </svg>
    </div>
  )
}

// Wheatstone/RLC bridge, drawn like the classic textbook figure: a diamond A(top) B(right)
// C(bottom) D(left) with a rectangle (European) resistor on every arm, the supply E across the
// vertical A–C diagonal (routed outside on the left), and the detector G on the horizontal D–B
// diagonal. Arms: R1 = A–D, R3 = A–B, R2 = D–C (adjustable), Rx = B–C — so opposite-arm balance
// reads R1·Rx = R2·R3, matching the exercises.
function Bridge({ p }: { p: Params }) {
  const a = arr(p.arms); const L = (i: number, d: string) => str(a[i], d)
  const A: [number, number] = [165, 24], B: [number, number] = [255, 92], C: [number, number] = [165, 160], D: [number, number] = [75, 92]
  const CEN: [number, number] = [165, 92]
  const ac = str(p.src, 'dc') === 'ac'
  // one arm = wire + rectangle resistor at its midpoint + a label pushed outside the diamond
  const arm = (P1: [number, number], P2: [number, number], lab: string, col = WIRE, variable = false) => {
    const mx = (P1[0] + P2[0]) / 2, my = (P1[1] + P2[1]) / 2
    const len = Math.hypot(P2[0] - P1[0], P2[1] - P1[1])
    const ux = (P2[0] - P1[0]) / len, uy = (P2[1] - P1[1]) / len
    const ang = Math.atan2(P2[1] - P1[1], P2[0] - P1[0]) * 180 / Math.PI
    const half = 15
    // perpendicular, pointing away from the diamond centre so the label sits outside
    let px = -uy, py = ux
    if ((mx - CEN[0]) * px + (my - CEN[1]) * py < 0) { px = -px; py = -py }
    return <g key={lab}>
      <line x1={P1[0]} y1={P1[1]} x2={mx - ux * half} y2={my - uy * half} stroke={WIRE} strokeWidth={1.6} />
      <line x1={mx + ux * half} y1={my + uy * half} x2={P2[0]} y2={P2[1]} stroke={WIRE} strokeWidth={1.6} />
      <rect x={mx - 15} y={my - 6} width={30} height={12} rx={1} fill="var(--color-panel)" stroke={col} strokeWidth={1.6} transform={`rotate(${ang} ${mx} ${my})`} />
      {variable && <line x1={mx - 12} y1={my + 9} x2={mx + 12} y2={my - 9} stroke={col} strokeWidth={1.5} transform={`rotate(${ang} ${mx} ${my})`} markerEnd="" />}
      {variable && <path d={`M${mx + 12} ${my - 9} l-5 0 m5 0 l0 5`} stroke={col} strokeWidth={1.5} transform={`rotate(${ang} ${mx} ${my})`} />}
      {T(mx + px * 18, my + py * 18 + 3, lab, col, 12)}
    </g>
  }
  return (
    <Frame>
      {/* supply E across A–C, routed outside on the left so it never crosses the detector */}
      <path d={`M${A[0]} ${A[1]} H30 V${ac ? 82 : 84} M30 ${ac ? 102 : 100} V${C[1]} H${C[0]}`} stroke={WIRE} strokeWidth={1.6} fill="none" />
      {ac
        ? <g><circle cx={30} cy={92} r={11} fill="var(--color-panel)" stroke={AMBER} strokeWidth={1.6} />{T(30, 96, '∼', AMBER, 13)}</g>
        : <g stroke={WIRE}><line x1={16} y1={84} x2={44} y2={84} strokeWidth={1.4} /><line x1={23} y1={100} x2={37} y2={100} strokeWidth={3} />{T(9, 96, 'E', WIRE, 12)}{T(50, 82, '+', WIRE, 11)}{T(50, 104, '−', WIRE, 11)}</g>}
      {/* detector G across the horizontal D–B diagonal */}
      <line x1={D[0]} y1={D[1]} x2={148} y2={92} stroke={WIRE} strokeWidth={1.6} /><line x1={182} y1={92} x2={B[0]} y2={B[1]} stroke={WIRE} strokeWidth={1.6} />
      <circle cx={165} cy={92} r={15} fill="var(--color-panel)" stroke={ACCENT} strokeWidth={1.6} />{T(165, 97, str(p.detector, 'G'), ACCENT, 13)}
      {/* nodes */}
      {[A, B, C, D].map((n, i) => <circle key={i} cx={n[0]} cy={n[1]} r={2.6} fill={WIRE} stroke="none" />)}
      {/* arms: R1=A-D, R3=A-B, R2=D-C (adjustable), Rx=B-C */}
      {arm(A, D, L(0, 'R₁'))}
      {arm(A, B, L(2, 'R₃'))}
      {arm(D, C, L(1, 'R₂'), WIRE, str(p.fixed, '') !== 'yes')}
      {arm(B, C, L(3, 'Rx'), ACCENT)}
    </Frame>
  )
}

// ——— AC bridge (Wien / De Sauty) ———
// Diamond T(top) R(right) B(bottom) L(left): supply ∼ across the horizontal L–R diagonal (routed
// outside along the bottom), detector D across the vertical T–B diagonal. Edges are the 4 arms.
//  Wien:      L-T = C1—R1 (series),  T-R = R2,  L-B = R3∥C3,  B-R = R4   → f = 1/(2πRC)
//  De Sauty:  L-T = Cs,  T-R = R1,   L-B = Cx,  B-R = R2               → Cx = Cs·(R1/R2)
function AcBridge({ p }: { p: Params }) {
  const type = str(p.type, 'sauty')
  const Tn: V = [150, 30], R: V = [256, 102], B: V = [150, 174], Ln: V = [44, 102]
  type V = [number, number]
  const along = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
  const uperp = (a: V, b: V): [V, V] => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    const u: V = [(b[0] - a[0]) / len, (b[1] - a[1]) / len]
    return [u, [-u[1], u[0]]]
  }
  const wire = (a: V, b: V, col = WIRE) => <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={col} strokeWidth={1.6} />
  // a rectangle resistor centred on an arm at fraction t, rotated to the arm, label pushed outside
  const resT = (a: V, b: V, t: number, lab: string, col = WIRE, key = '') => {
    const m = along(a, b, t), [, per] = uperp(a, b)
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI
    let px = per[0], py = per[1]; if ((m[0] - 150) * px + (m[1] - 102) * py < 0) { px = -px; py = -py }
    return <g key={key || lab}><rect x={m[0] - 13} y={m[1] - 5.5} width={26} height={11} rx={1} fill="var(--color-panel)" stroke={col} strokeWidth={1.6} transform={`rotate(${ang} ${m[0]} ${m[1]})`} />{T(m[0] + px * 15, m[1] + py * 15 + 3, lab, col, 10)}</g>
  }
  // a capacitor (two plates across the arm) at fraction t. A mask hides the arm wire in the gap
  // between the plates, so the component reads as a break, not a short.
  const capT = (a: V, b: V, t: number, lab: string, col = ACCENT, key = '') => {
    const m = along(a, b, t), [u, per] = uperp(a, b)
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI
    let px = per[0], py = per[1]; if ((m[0] - 150) * px + (m[1] - 102) * py < 0) { px = -px; py = -py }
    const plate = (off: number): [V, V] => [
      [m[0] + u[0] * off + per[0] * 9, m[1] + u[1] * off + per[1] * 9],
      [m[0] + u[0] * off - per[0] * 9, m[1] + u[1] * off - per[1] * 9],
    ]
    const [a1, a2] = plate(-2.6), [b1, b2] = plate(2.6)
    return <g key={key || lab}>
      {/* mask only the inter-plate gap (±4): a wider mask would leave the leads visibly detached from the plates */}
      <rect x={m[0] - 4} y={m[1] - 11} width={8} height={22} fill="var(--color-panel)" stroke="none" transform={`rotate(${ang} ${m[0]} ${m[1]})`} />
      <g stroke={col} strokeWidth={2.4}><line x1={a1[0]} y1={a1[1]} x2={a2[0]} y2={a2[1]} /><line x1={b1[0]} y1={b1[1]} x2={b2[0]} y2={b2[1]} /></g>
      {T(m[0] + px * 15, m[1] + py * 15 + 3, lab, col, 10)}
    </g>
  }
  // a parallel R∥C sub-network occupying the middle of an arm
  const parallelRC = (a: V, b: V, rLab: string, cLab: string) => {
    const [u, per] = uperp(a, b)
    const s = along(a, b, 0.28), e = along(a, b, 0.72)
    const d = 10
    const sA: V = [s[0] + per[0] * d, s[1] + per[1] * d], eA: V = [e[0] + per[0] * d, e[1] + per[1] * d]
    const sB: V = [s[0] - per[0] * d, s[1] - per[1] * d], eB: V = [e[0] - per[0] * d, e[1] - per[1] * d]
    const midA = along(sA, eA, 0.5), midE = along(sB, eB, 0.5)
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI
    let px = per[0], py = per[1]; if ((s[0] - 150) * px + (s[1] - 102) * py < 0) { px = -px; py = -py }
    return <g>
      {wire(a, s)}{wire(e, b)}
      {wire(s, sA)}{wire(s, sB)}{wire(e, eA)}{wire(e, eB)}
      {wire(sA, [midA[0] - u[0] * 13, midA[1] - u[1] * 13])}{wire([midA[0] + u[0] * 13, midA[1] + u[1] * 13], eA)}
      <rect x={midA[0] - 13} y={midA[1] - 5.5} width={26} height={11} rx={1} fill="var(--color-panel)" stroke={WIRE} strokeWidth={1.6} transform={`rotate(${ang} ${midA[0]} ${midA[1]})`} />
      {wire(sB, [midE[0] - u[0] * 3, midE[1] - u[1] * 3], ACCENT)}{wire([midE[0] + u[0] * 3, midE[1] + u[1] * 3], eB, ACCENT)}
      <g stroke={ACCENT} strokeWidth={2.4}>
        <line x1={midE[0] - u[0] * 3 + per[0] * 7} y1={midE[1] - u[1] * 3 + per[1] * 7} x2={midE[0] - u[0] * 3 - per[0] * 7} y2={midE[1] - u[1] * 3 - per[1] * 7} />
        <line x1={midE[0] + u[0] * 3 + per[0] * 7} y1={midE[1] + u[1] * 3 + per[1] * 7} x2={midE[0] + u[0] * 3 - per[0] * 7} y2={midE[1] + u[1] * 3 - per[1] * 7} />
      </g>
      {T(midA[0] + px * 17, midA[1] + py * 17, rLab, WIRE, 10)}
      {T(midE[0] - px * 17, midE[1] - py * 17 + 3, cLab, ACCENT, 10)}
    </g>
  }
  let arms: React.ReactNode, caption: string
  if (type === 'wien') {
    caption = 'f = 1/(2·π·R·C)'
    arms = <>
      {/* L-T: C1 in series with R1 */}
      {wire(Ln, Tn)}{capT(Ln, Tn, 0.34, 'C1', ACCENT, 'c1')}{resT(Ln, Tn, 0.7, 'R1', WIRE, 'r1')}
      {/* T-R: R2 */}
      {wire(Tn, R)}{resT(Tn, R, 0.5, 'R2', WIRE, 'r2')}
      {/* L-B: R3 ∥ C3 (draws its own wires) */}
      {parallelRC(Ln, B, 'R3', 'C3')}
      {/* B-R: R4 */}
      {wire(B, R)}{resT(B, R, 0.5, 'R4', WIRE, 'r4')}
    </>
  } else {
    caption = 'Cx = Cs · (R1 / R2)'
    arms = <>
      {wire(Ln, Tn)}{capT(Ln, Tn, 0.5, 'Cs', ACCENT, 'cs')}
      {wire(Tn, R)}{resT(Tn, R, 0.5, 'R1', WIRE, 'r1')}
      {wire(Ln, B)}{capT(Ln, B, 0.5, 'Cx', ACCENT, 'cx')}
      {wire(B, R)}{resT(B, R, 0.5, 'R2', WIRE, 'r2')}
    </>
  }
  return (
    <Frame h={212}>
      {/* supply ∼ across L–R, routed outside along the bottom so it never crosses the detector */}
      <path d={`M${Ln[0]} ${Ln[1]} V190 H${R[0]} V${R[1]}`} stroke={WIRE} strokeWidth={1.6} fill="none" />
      <circle cx={150} cy={190} r={11} fill="var(--color-panel)" stroke={AMBER} strokeWidth={1.6} />{T(150, 194, '∼', AMBER, 13)}
      {arms}
      {/* detector across the vertical T–B diagonal */}
      <line x1={Tn[0]} y1={Tn[1]} x2={150} y2={89} stroke={WIRE} strokeWidth={1.6} /><line x1={150} y1={115} x2={B[0]} y2={B[1]} stroke={WIRE} strokeWidth={1.6} />
      <circle cx={150} cy={102} r={13} fill="var(--color-panel)" stroke={PHOS} strokeWidth={1.6} />{T(150, 106, 'G', PHOS, 12)}
      {[Tn, R, B, Ln].map((n, i) => <circle key={i} cx={n[0]} cy={n[1]} r={2.6} fill={WIRE} stroke="none" />)}
      {T(150, 208, caption, DIM, 9.5)}
    </Frame>
  )
}

// ——— branch-current phasor diagram (parallel R–C / R–L): U common, I₁ in phase, I₂ at 90°, I resultant ———
function PhasorBranch({ p }: { p: Params }) {
  const cap = str(p.type, 'c') !== 'l'   // capacitive branch ⇒ I₂ leads (drawn upward)
  const ox = 72, oy = cap ? 150 : 58
  const i1x = ox + 110, i2y = cap ? oy - 80 : oy + 80
  const head = (x0: number, y0: number, x: number, y: number, c: string) => {
    const a = Math.atan2(y - y0, x - x0), h = 9
    return <path d={`M${x} ${y} L${x + h * Math.cos(a + Math.PI - 0.42)} ${y + h * Math.sin(a + Math.PI - 0.42)} M${x} ${y} L${x + h * Math.cos(a + Math.PI + 0.42)} ${y + h * Math.sin(a + Math.PI + 0.42)}`} stroke={c} strokeWidth={2.4} />
  }
  const below = cap ? 18 : -10
  return (
    <Frame h={200}>
      {/* parallelogram construction */}
      <line x1={i1x} y1={oy} x2={i1x} y2={i2y} stroke={DIM} strokeWidth={0.9} strokeDasharray="3 3" />
      <line x1={ox} y1={i2y} x2={i1x} y2={i2y} stroke={DIM} strokeWidth={0.9} strokeDasharray="3 3" />
      {/* common voltage (reference axis) */}
      <line x1={ox} y1={oy} x2={ox + 178} y2={oy} stroke={ACCENT} strokeWidth={2.2} />{head(ox, oy, ox + 178, oy, ACCENT)}
      {T(ox + 150, oy + below, 'U₁ = U₂', ACCENT, 12)}
      {/* branch currents */}
      <line x1={ox} y1={oy} x2={i1x} y2={oy} stroke={PHOS} strokeWidth={2.6} />{head(ox, oy, i1x, oy, PHOS)}
      {T(ox + 56, oy + below, 'I₁', PHOS, 13)}
      <line x1={ox} y1={oy} x2={ox} y2={i2y} stroke={PHOS} strokeWidth={2.6} />{head(ox, oy, ox, i2y, PHOS)}
      {T(ox - 16, (oy + i2y) / 2 + 4, 'I₂', PHOS, 13)}
      {/* resultant */}
      <line x1={ox} y1={oy} x2={i1x} y2={i2y} stroke={AMBER} strokeWidth={2.6} />{head(ox, oy, i1x, i2y, AMBER)}
      {T(i1x + 14, i2y + (cap ? 2 : 6), 'I', AMBER, 14)}
    </Frame>
  )
}

function DataTable({ p, lang = 'ro' }: { p: Params; lang?: string }) {
  // cells may be a plain string (language-neutral, e.g. "20 V") or a {ro,en} pair — a header
  // must never show both languages at once ("τ_măsurat / τ_measured")
  //
  // A cell may also be a raw NUMBER, and `String(11.1)` is "11.1" in every language. Two exercises
  // supply their verification readings that way (12 decimals each), so the Romanian screen showed
  // "11.1" and "0.5" — a decimal point — while every other number in the app, and every number the
  // keypad lets the student type, uses the comma. Fixed here rather than in the content so that a
  // number stays a number: quoting it as "11,1" in the JSON would put a comma on the English screen
  // too. Deliberately NOT toLocaleString: ro-RO groups thousands with a dot ("1.100"), and this app
  // spends 15 prompts telling students not to write a thousands separator at all.
  const cell = (v: unknown) =>
    typeof v === 'number' ? (lang === 'ro' ? String(v).replace('.', ',') : String(v))
      : v && typeof v === 'object' ? loc(v, lang)
        : String(v)
  const headers = arr(p.headers).map(cell)
  const rows = arr(p.rows).map(r => arr(r).map(cell))
  return (
    <div className="mb-3 overflow-x-auto rounded-lg border border-border bg-panel p-2">
      <table className="w-full border-collapse font-mono text-xs tabular-nums">
        <thead><tr>{headers.map((h, i) => <th key={i} className="border-b border-border px-2 py-1 text-left font-semibold text-accent"><Formula>{h}</Formula></th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="border-b border-border/60 px-2 py-1 text-fg"><Formula>{c}</Formula></td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

function Concept(p: Params, lang: string) {
  const rel = loc(p.relation, lang)
  const note = loc(p.note, lang)
  return (
    <div className="mb-3 rounded-lg border border-border bg-panel p-3 text-center">
      {/* same typesetting as the theory recaps: real fractions and radicals, units and
          commentary kept as plain text, and several equations split at ";" */}
      {rel && <code className="block rounded-md bg-surface-2 px-3 py-2.5 text-center font-mono text-base text-primary" style={{ textShadow: '0 0 8px var(--color-phosphor-glow)' }}><FormulaMath center>{rel}</FormulaMath></code>}
      {note && <p className="mt-2 text-xs text-muted"><Formula>{note}</Formula></p>}
      {!rel && !note && <p className="text-xs text-faint">—</p>}
    </div>
  )
}

function Phasor({ p }: { p: Params }) {
  // `z` states the element and lets the physics set the angle: a capacitor makes the current lead
  // by 90°, an inductor makes it lag, a resistor keeps it in phase. Without this the one exercise
  // that supplies z fell through to the default +90° and was right only by coincidence — an
  // inductor question would have been handed the capacitor diagram.
  const z = str(p.z, '').toUpperCase()
  const zDeg = z === 'C' ? 90 : z === 'L' ? -90 : z === 'R' ? 0 : null
  const ref = str(p.ref, 'U'), vec = str(p.vec, 'I'), deg = num(p.deg, zDeg ?? 90)
  const ox = 130, oy = 92, len = 66
  const rad = -deg * Math.PI / 180 // screen y is down → a leading (ccw) vector points up
  const tx = ox + len * Math.cos(rad), ty = oy + len * Math.sin(rad)
  const ux = ox + len, uy = oy
  const head = (x0: number, y0: number, x: number, y: number, c: string) => {
    const a = Math.atan2(y - y0, x - x0), h = 9
    return <path d={`M${x} ${y} L${x + h * Math.cos(a + Math.PI - 0.42)} ${y + h * Math.sin(a + Math.PI - 0.42)} M${x} ${y} L${x + h * Math.cos(a + Math.PI + 0.42)} ${y + h * Math.sin(a + Math.PI + 0.42)}`} stroke={c} strokeWidth={2.4} />
  }
  return (
    <Frame h={180}>
      <line x1={ox - 100} y1={oy} x2={ox + 100} y2={oy} stroke={DIM} strokeWidth={0.7} strokeDasharray="2 3" />
      <line x1={ox} y1={oy - 74} x2={ox} y2={oy + 74} stroke={DIM} strokeWidth={0.7} strokeDasharray="2 3" />
      <path d={`M${ox + 24} ${oy} A24 24 0 0 ${deg > 0 ? 0 : 1} ${ox + 24 * Math.cos(rad)} ${oy + 24 * Math.sin(rad)}`} stroke={DIM} strokeWidth={1.1} fill="none" />
      {T(ox + 34 * Math.cos(rad / 2), oy + 34 * Math.sin(rad / 2) + 4, Math.round(Math.abs(deg)) + '°', DIM, 11)}
      <line x1={ox} y1={oy} x2={ux} y2={uy} stroke={ACCENT} strokeWidth={2.6} />{head(ox, oy, ux, uy, ACCENT)}
      {T(ux + 13, uy + 5, ref, ACCENT, 15)}
      <line x1={ox} y1={oy} x2={tx} y2={ty} stroke={PHOS} strokeWidth={2.6} />{head(ox, oy, tx, ty, PHOS)}
      {T(tx + (Math.cos(rad) >= 0 ? 13 : -13), ty + (Math.sin(rad) >= 0 ? 17 : -9), vec, PHOS, 15)}
    </Frame>
  )
}

// ——— capacitor ladder network (C1-7): C_ech = 2C ———
function CapNet() {
  const TY = 46, BY = 150, P = 34, A = 116, B = 190, C = 262, M = (TY + BY) / 2
  const capH = (x: number, y: number, label: string) => <g><line x1={x - 3.5} y1={y - 10} x2={x - 3.5} y2={y + 10} /><line x1={x + 3.5} y1={y - 10} x2={x + 3.5} y2={y + 10} />{T(x, y - 16, label, ACCENT, 12)}</g>
  const capV = (x: number, label: string) => <g><line x1={x - 10} y1={M - 3.5} x2={x + 10} y2={M - 3.5} /><line x1={x - 10} y1={M + 3.5} x2={x + 10} y2={M + 3.5} />{T(x + 22, M + 4, label, ACCENT, 12)}</g>
  const seg = (x1: number, x2: number, label: string) => { const m = (x1 + x2) / 2; return <g><line x1={x1} y1={TY} x2={m - 3.5} y2={TY} /><line x1={m + 3.5} y1={TY} x2={x2} y2={TY} />{capH(m, TY, label)}</g> }
  const vseg = (x: number, label: string) => <g><line x1={x} y1={TY} x2={x} y2={M - 3.5} /><line x1={x} y1={M + 3.5} x2={x} y2={BY} />{capV(x, label)}</g>
  return (
    <Frame>
      <line x1={P} y1={BY} x2={C} y2={BY} />
      {seg(P, A, '2C')}{seg(A, B, '2C')}{seg(B, C, '2C')}
      {vseg(P, 'C')}{vseg(A, 'C')}{vseg(B, 'C')}{vseg(C, '2C')}
      <circle cx={P} cy={TY} r={3.2} fill={WIRE} />{T(P - 13, TY + 4, 'A', DIM, 12)}
      <circle cx={P} cy={BY} r={3.2} fill={WIRE} />{T(P - 13, BY + 4, 'B', DIM, 12)}
    </Frame>
  )
}

// ——— resistor network (C1-6): E–R–[R ∥ 2R(via C) ∥ 2R] with a 2R·2R parallel top ———
function ResNet() {
  const BY = 152, TY = 52, UP = 28, sx = 30, A = 138, C = 232, PANEL = 'var(--color-panel)'
  return (
    <Frame>
      <line x1={sx} y1={TY} x2={sx} y2={88} /><line x1={sx} y1={116} x2={sx} y2={BY} />
      <circle cx={sx} cy={102} r={14} fill={PANEL} /><path d={`M${sx} 111 V93 M${sx - 4} 98 L${sx} 93 L${sx + 4} 98`} />{T(sx - 20, 106, 'E', DIM, 13)}
      <line x1={sx} y1={BY} x2={C} y2={BY} />
      <line x1={sx} y1={TY} x2={62} y2={TY} /><rect x={62} y={TY - 6} width={34} height={12} fill={PANEL} /><line x1={96} y1={TY} x2={A} y2={TY} />{T(79, TY - 11, 'R', ACCENT, 12)}
      <line x1={A} y1={TY} x2={A} y2={86} /><rect x={A - 6} y={86} width={12} height={34} fill={PANEL} /><line x1={A} y1={120} x2={A} y2={BY} />{T(A - 15, 106, 'R', ACCENT, 12)}
      <line x1={A} y1={TY} x2={168} y2={TY} /><rect x={168} y={TY - 6} width={34} height={12} fill={PANEL} /><line x1={202} y1={TY} x2={C} y2={TY} />{T(185, TY - 11, '2R', ACCENT, 12)}
      <line x1={A} y1={TY} x2={A} y2={UP} /><line x1={A} y1={UP} x2={168} y2={UP} /><rect x={168} y={UP - 6} width={34} height={12} fill={PANEL} /><line x1={202} y1={UP} x2={C} y2={UP} /><line x1={C} y1={UP} x2={C} y2={TY} />{T(185, UP - 9, '2R', ACCENT, 12)}
      <line x1={A} y1={TY} x2={190} y2={126} /><g transform="rotate(37 176 106)"><rect x={160} y={100} width={32} height={12} fill={PANEL} /></g><line x1={190} y1={126} x2={190} y2={BY} />{T(205, 104, '2R', ACCENT, 12)}
      <line x1={C} y1={TY} x2={C} y2={96} /><rect x={C - 6} y={96} width={12} height={34} fill={PANEL} /><line x1={C} y1={130} x2={C} y2={BY} />{T(C + 14, 116, 'R', ACCENT, 12)}
    </Frame>
  )
}

// ——— second resistor network (figure 70a1…) ———
// A–[R∥R]–B ; B–2R–F ; B–R–C–R–D ; B–2R(diag)–D ; F–[2R∥2R]–D ; G–R–F ; source E(A,G)
function ResNet2() {
  const P = 'var(--color-panel)'
  const box = (x: number, y: number, w: number, h: number, lab: string, lx: number, ly: number) => <g><rect x={x} y={y} width={w} height={h} rx={1.5} fill={P} stroke={ACCENT} strokeWidth={1.6} />{T(lx, ly, lab, ACCENT, 11)}</g>
  const dot = (x: number, y: number) => <circle cx={x} cy={y} r={2.6} fill={WIRE} />
  const Ax = 34, Bx = 150, Cx = 268, Dy = 172, top = 40, bot = 56
  return (
    <Frame h={200}>
      <g stroke={WIRE} strokeWidth={1.6} fill="none">
        {/* source E */}
        <line x1={Ax} y1={48} x2={Ax} y2={82} /><line x1={Ax} y1={122} x2={Ax} y2={Dy} />
        <circle cx={Ax} cy={102} r={15} fill={P} /><path d={`M${Ax} 111 V93 M${Ax - 4} 98 L${Ax} 93 L${Ax + 4} 98`} />{T(Ax - 20, 106, 'E', DIM, 13)}
        {/* A junction */}<line x1={Ax} y1={top} x2={Ax} y2={bot} /><line x1={Ax} y1={48} x2={Ax} y2={top} />
        {/* two parallel R (A→B) */}
        <line x1={Ax} y1={top} x2={70} y2={top} /><line x1={104} y1={top} x2={Bx} y2={top} />
        <line x1={Ax} y1={bot} x2={70} y2={bot} /><line x1={104} y1={bot} x2={Bx} y2={bot} />
        {/* B junction */}<line x1={Bx} y1={top} x2={Bx} y2={bot} />
        {/* B→F : 2R vertical */}<line x1={Bx} y1={bot} x2={Bx} y2={92} /><line x1={Bx} y1={126} x2={Bx} y2={Dy} />
        {/* B→C : R */}<line x1={Bx} y1={48} x2={186} y2={48} /><line x1={220} y1={48} x2={Cx} y2={48} />
        {/* C→D : R */}<line x1={Cx} y1={48} x2={Cx} y2={92} /><line x1={Cx} y1={126} x2={Cx} y2={Dy} />
        {/* B→D diagonal 2R */}<line x1={Bx} y1={54} x2={196} y2={104} /><line x1={222} y1={122} x2={Cx} y2={Dy} />
        {/* F→D two parallel 2R (bottom) */}
        <line x1={Bx} y1={146} x2={182} y2={146} /><line x1={216} y1={146} x2={Cx} y2={146} />
        <line x1={Bx} y1={Dy} x2={182} y2={Dy} /><line x1={216} y1={Dy} x2={Cx} y2={Dy} />
        <line x1={Bx} y1={146} x2={Bx} y2={Dy} /><line x1={Cx} y1={146} x2={Cx} y2={Dy} />
        {/* G→F : R */}<line x1={Ax} y1={Dy} x2={72} y2={Dy} /><line x1={106} y1={Dy} x2={Bx} y2={Dy} />
      </g>
      {box(70, top - 6, 34, 12, 'R', 87, top - 9)}
      {box(70, bot - 6, 34, 12, 'R', 87, bot + 18)}
      {box(Bx - 6, 92, 12, 34, '2R', Bx - 15, 112)}
      {box(186, 42, 34, 12, 'R', 203, 39)}
      {box(Cx - 6, 92, 12, 34, 'R', Cx + 14, 112)}
      <g transform="rotate(38 209 113)">{box(193, 107, 32, 12, '2R', 209, 104)}</g>
      {box(182, 140, 34, 12, '2R', 199, 137)}
      {box(182, 166, 34, 12, '2R', 199, 191)}
      {box(72, Dy - 6, 34, 12, 'R', 89, Dy + 18)}
      {[dot(Bx, top), dot(Bx, Dy), dot(Cx, 48), dot(Cx, Dy)].map((d, i) => <g key={i}>{d}</g>)}
    </Frame>
  )
}

// ——— oscilloscope FRONT PANEL with numbered, labelled controls (osc03 X-Y=18, osc07 coupling=11) ———
function ScopePanel({ lang = 'ro' }: { lang?: string }) {
  const labels = ['INTENS', 'FOCUS', 'POWER', 'CAL', 'CH1 V/div', 'CH1 POZ', 'CH1 GND', 'CH2 V/div', 'CH2 POZ', 'CH2 GND', 'AC/DC', 't/div', 't POZ', 'x10 MAG', 'TRIG NIV', 'TRIG MOD', 'TRIG SRC', 'X-Y', 'CH1/CH2', 'BALEIAJ']
  const cols = 5, cw = 54, x0 = 24, y0 = 100, rh = 30
  // all controls rendered neutrally — no button is highlighted, so the panel never reveals the answer
  const ctrls = labels.map((lab, i) => {
    const c = i % cols, r = Math.floor(i / cols), cx = x0 + c * cw + 12, cy = y0 + r * rh, n = i + 1
    return <g key={i}>
      <circle cx={cx} cy={cy} r={9} fill="var(--color-panel)" stroke={DIM} strokeWidth={1} />
      {T(cx, cy + 3.4, String(n), WIRE, 9)}
      {T(cx, cy + 18, lab, DIM, 6.5)}
    </g>
  })
  return (
    <Frame h={216}>
      <rect x={8} y={6} width={284} height={204} rx={8} fill="#0c1218" stroke="var(--color-border)" />
      <rect x={22} y={16} width={118} height={62} rx={4} fill="#04120b" stroke={DIM} />
      <ellipse cx={81} cy={47} rx={34} ry={20} fill="none" stroke={PHOS} strokeWidth={1.6} style={{ filter: 'drop-shadow(0 0 2px ' + PHOS + ')' }} />
      {T(210, 34, lang === 'en' ? 'OSCILLOSCOPE' : 'OSCILOSCOP', DIM, 12)}{T(210, 50, lang === 'en' ? 'front panel' : 'panou frontal', DIM, 8)}
      {ctrls}
    </Frame>
  )
}

// ——— shared graph helpers (plot box inside the 300×180 Frame) ———
const PX0 = 46, PY0 = 150, PX1 = 282, PY1 = 36 // origin (PX0,PY0) bottom-left; PX1 right; PY1 top
function Axes({ xlab, ylab }: { xlab: string; ylab: string }) {
  return (
    <g>
      <line x1={PX0} y1={PY0} x2={PX1} y2={PY0} stroke={DIM} strokeWidth={1.2} />
      <line x1={PX0} y1={PY0} x2={PX0} y2={PY1} stroke={DIM} strokeWidth={1.2} />
      <path d={`M${PX1 - 6} ${PY0 - 4} L${PX1} ${PY0} L${PX1 - 6} ${PY0 + 4}`} stroke={DIM} />
      <path d={`M${PX0 - 4} ${PY1 + 6} L${PX0} ${PY1} L${PX0 + 4} ${PY1 + 6}`} stroke={DIM} />
      {T(PX1 - 4, PY0 + 15, xlab, DIM, 11)}
      {T(PX0 - 2, PY1 - 4, ylab, DIM, 11)}
    </g>
  )
}
// map a normalized f:[0,1]->[0,vmax] onto the plot box
function plot(f: (t: number) => number, vmax = 1, n = 72) {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const x = PX0 + (PX1 - PX0 - 8) * t
    const y = PY0 - (PY0 - PY1) * Math.max(0, Math.min(1, f(t) / vmax))
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1)
  }
  return d
}
const px = (t: number) => PX0 + (PX1 - PX0 - 8) * t
const py = (v: number, vmax = 1) => PY0 - (PY0 - PY1) * Math.max(0, Math.min(1, v / vmax))

// ——— static transfer characteristic Y = f(X): linear / parabolic / hyperbolic / sigmoid / saturation / step ———
const SHAPES: Record<string, (t: number) => number> = {
  linear: t => t,
  parabolic: t => t * t,
  hyperbolic: t => 1 / (1 + 4 * t),
  sigmoid: t => 1 / (1 + Math.exp(-11 * (t - 0.5))),
  saturation: t => (t < 0.2 ? 0 : t > 0.8 ? 1 : (t - 0.2) / 0.6),
  step: t => (t < 0.34 ? 0.12 : t < 0.67 ? 0.5 : 0.88),
}
function CharCurve({ p }: { p: Params }) {
  const shape = str(p.shape, 'linear')
  const f = SHAPES[shape] ?? SHAPES.linear
  const expr = str(p.expr, '')
  return (
    <Frame>
      <Axes xlab="X" ylab="Y" />
      {expr && T(164, 22, expr, ACCENT, 13)}
      <path d={plot(f)} stroke={PHOS} strokeWidth={2.4} fill="none" style={{ filter: `drop-shadow(0 0 2px ${PHOS})` }} />
    </Frame>
  )
}

// ——— accuracy × precision target (shot pattern set by precision/accuracy params) ———
function Target({ p }: { p: Params }) {
  const hiP = str(p.precision, 'high') === 'high'
  const hiA = str(p.accuracy, 'high') === 'high'
  const cx = 150, cy = 92
  const spread = hiP ? 7 : 27
  const bx = hiA ? 0 : 26, by = hiA ? 0 : -16
  const shots = [[0, 0], [0.9, 0.5], [-0.6, 0.8], [0.4, -0.8], [-0.9, -0.3], [0.7, 0.9], [-0.4, -0.9], [0.85, -0.45]]
  return (
    <Frame h={190}>
      {/* The alternation used to be by colour, with the second ring a literal #2b4a3a. That reads
          9.8:1 on a white panel but only 1.66:1 on the DARK one — and dark is the default, so half
          the rings of the target, the bullseye among them, were all but gone. Alternating by
          stroke WIDTH instead keeps the major/minor reading of a real target face and leaves every
          ring at DIM's contrast in both themes (4.48 dark, 5.15 light). */}
      {[54, 40, 26, 12].map((r, i) => <circle key={i} cx={cx} cy={cy} r={r} stroke={DIM} strokeWidth={i % 2 ? 0.8 : 1.5} fill={i === 3 ? 'var(--color-panel)' : 'none'} />)}
      <line x1={cx - 60} y1={cy} x2={cx + 60} y2={cy} stroke={DIM} strokeWidth={0.6} />
      <line x1={cx} y1={cy - 60} x2={cx} y2={cy + 60} stroke={DIM} strokeWidth={0.6} />
      {shots.map(([sx, sy], i) => <circle key={i} cx={cx + bx + sx * spread} cy={cy + by + sy * spread} r={3.2} fill={ACCENT} stroke="none" />)}
    </Frame>
  )
}

// ——— order-1 step response y = 1 − e^(−t/τ), with τ / rise / settling markers ———
function StepResp({ p }: { p: Params }) {
  const mark = str(p.mark, 'tau')
  const f = (t: number) => 1 - Math.exp(-5 * t) // t axis spans ~5τ
  return (
    <Frame>
      <Axes xlab="t" ylab="y" />
      <line x1={PX0} y1={py(1)} x2={PX1 - 8} y2={py(1)} stroke={DIM} strokeWidth={0.8} strokeDasharray="3 3" />
      {mark === 'tau' && <>
        <line x1={PX0} y1={py(0.632)} x2={px(0.2)} y2={py(0.632)} stroke={AMBER} strokeWidth={0.9} strokeDasharray="3 3" />
        <line x1={px(0.2)} y1={PY0} x2={px(0.2)} y2={py(0.632)} stroke={AMBER} strokeWidth={0.9} strokeDasharray="3 3" />
        {T(px(0.2), PY0 + 14, 'τ', AMBER, 12)}{T(PX0 - 4, py(0.632) - 4, '63%', AMBER, 10)}
      </>}
      {mark === 'rise' && <>
        <line x1={PX0} y1={py(0.1)} x2={PX1 - 8} y2={py(0.1)} stroke={AMBER} strokeWidth={0.8} strokeDasharray="3 3" />
        <line x1={PX0} y1={py(0.9)} x2={PX1 - 8} y2={py(0.9)} stroke={AMBER} strokeWidth={0.8} strokeDasharray="3 3" />
        {T(PX1 - 22, py(0.9) - 4, '90%', AMBER, 10)}{T(PX1 - 22, py(0.1) - 4, '10%', AMBER, 10)}
        {Tsub(210, 26, 't_cr ≈ 2,2·τ', ACCENT, 12)}
      </>}
      {mark === 'settling' && <>
        <line x1={PX0} y1={py(0.98)} x2={PX1 - 8} y2={py(0.98)} stroke={AMBER} strokeWidth={0.8} strokeDasharray="3 3" />
        {T(PX1 - 26, py(0.98) - 4, '98%', AMBER, 10)}{Tsub(205, 26, 't_s ≈ 3,9·τ', ACCENT, 12)}
      </>}
      <path d={plot(f)} stroke={PHOS} strokeWidth={2.4} fill="none" style={{ filter: `drop-shadow(0 0 2px ${PHOS})` }} />
    </Frame>
  )
}

// ——— order-2 step response for the three damping regimes ———
function Damping({ p }: { p: Params }) {
  const VM = 1.4
  const under = (t: number) => 1 - Math.exp(-1.6 * 4 * t) * Math.cos(6.5 * t)
  const crit = (t: number) => 1 - (1 + 4.5 * t) * Math.exp(-4.5 * t)
  const over = (t: number) => 1 - Math.exp(-2.1 * t)
  const curve = (f: (t: number) => number, n = 90) => {
    let d = ''
    for (let i = 0; i <= n; i++) { const t = i / n; d += (i === 0 ? 'M' : 'L') + px(t).toFixed(1) + ' ' + py(f(t), VM).toFixed(1) }
    return d
  }
  const only = str(p.regime, '')
  const show = (k: string) => !only || only === k
  return (
    <Frame>
      <Axes xlab="t" ylab="y" />
      <line x1={PX0} y1={py(1, VM)} x2={PX1 - 8} y2={py(1, VM)} stroke={DIM} strokeWidth={0.8} strokeDasharray="3 3" />
      {show('under') && <path d={curve(under)} stroke={PHOS} strokeWidth={2.2} fill="none" />}
      {show('crit') && <path d={curve(crit)} stroke={AMBER} strokeWidth={2.2} fill="none" />}
      {/* ACCENT, not the literal #38D6E3 — that hex IS this theme's cyan-500, so writing it out
          froze the dark value and the curve came out at 1.77:1 on the light theme's white panel. */}
      {show('over') && <path d={curve(over)} stroke={ACCENT} strokeWidth={2.2} fill="none" />}
      {show('under') && T(232, 44, 'β<1', PHOS, 11)}
      {show('crit') && T(232, 60, 'β=1', AMBER, 11)}
      {show('over') && T(232, 76, 'β>1', ACCENT, 11)}
    </Frame>
  )
}

// ——— SI reference: 7 base units (+ rad, sr supplementary) ———
const SI_BASE: { q: { ro: string; en: string }; u: string; s: string }[] = [
  { q: { ro: 'Lungime', en: 'Length' }, u: 'metru', s: 'm' },
  { q: { ro: 'Masă', en: 'Mass' }, u: 'kilogram', s: 'kg' },
  { q: { ro: 'Timp', en: 'Time' }, u: 'secundă', s: 's' },
  { q: { ro: 'Intensitatea curentului', en: 'Electric current' }, u: 'amper', s: 'A' },
  { q: { ro: 'Temperatură', en: 'Temperature' }, u: 'kelvin', s: 'K' },
  { q: { ro: 'Cantitate de substanță', en: 'Amount of substance' }, u: 'mol', s: 'mol' },
  { q: { ro: 'Intensitate luminoasă', en: 'Luminous intensity' }, u: 'candelă', s: 'cd' },
]
function SIUnits({ lang }: { lang: string }) {
  const h = lang === 'en' ? ['Quantity', 'Unit', 'Symbol'] : ['Mărime', 'Unitate', 'Simbol']
  return (
    <div className="mb-3 overflow-x-auto rounded-lg border border-border bg-panel p-2">
      <table className="w-full border-collapse text-xs">
        <thead><tr>{h.map((c, i) => <th key={i} className="border-b border-border px-2 py-1 text-left font-semibold text-accent">{c}</th>)}</tr></thead>
        <tbody>
          {SI_BASE.map((r, i) => (
            <tr key={i}>
              <td className="border-b border-border/60 px-2 py-1 text-fg">{r.q[lang as 'ro' | 'en'] ?? r.q.ro}</td>
              <td className="border-b border-border/60 px-2 py-1 text-fg">{r.u}</td>
              <td className="border-b border-border/60 px-2 py-1 font-mono font-semibold text-primary">{r.s}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 px-2 text-[0.625rem] text-faint">{lang === 'en' ? 'Supplementary: radian (rad), steradian (sr)' : 'Suplimentare: radian (rad), steradian (sr)'}</p>
    </div>
  )
}

// ——— SI multiples / submultiples ladder ———
const PREFIXES: [string, string, string][] = [
  ['tera', 'T', '10¹²'], ['giga', 'G', '10⁹'], ['mega', 'M', '10⁶'], ['kilo', 'k', '10³'],
  ['—', '—', '10⁰'], ['mili', 'm', '10⁻³'], ['micro', 'µ', '10⁻⁶'], ['nano', 'n', '10⁻⁹'], ['pico', 'p', '10⁻¹²'],
]
function Prefixes({ lang }: { lang: string }) {
  const h = lang === 'en' ? ['Prefix', 'Symbol', 'Factor'] : ['Prefix', 'Simbol', 'Factor']
  return (
    <div className="mb-3 overflow-x-auto rounded-lg border border-border bg-panel p-2">
      <table className="w-full border-collapse text-xs">
        <thead><tr>{h.map((c, i) => <th key={i} className="border-b border-border px-2 py-1 text-left font-semibold text-accent">{c}</th>)}</tr></thead>
        <tbody>
          {PREFIXES.map((r, i) => (
            <tr key={i} className={r[0] === '—' ? 'opacity-60' : ''}>
              <td className="border-b border-border/60 px-2 py-1 text-fg">{r[0]}</td>
              <td className="border-b border-border/60 px-2 py-1 font-mono font-semibold text-primary">{r[1]}</td>
              <td className="border-b border-border/60 px-2 py-1 font-mono tabular-nums text-fg">{r[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ——— operational amplifier configurations (M11) ———
function OpAmp({ p }: { p: Params }) {
  const cfg = str(p.config, 'inverting')
  const minusTop = cfg !== 'noninverting'
  const NEG: [number, number] = minusTop ? [120, 66] : [120, 114] // − input
  const POS: [number, number] = minusTop ? [120, 114] : [120, 66] // + input
  const out: [number, number] = [214, 90]
  const box = (x: number, y: number, w: number, h: number, label: string) => <g><rect x={x} y={y} width={w} height={h} rx={1.5} fill="var(--color-panel)" stroke={ACCENT} strokeWidth={1.6} />{T(x + w / 2, y - 5, label, ACCENT, 11)}</g>
  // a vertical resistor centred at (cx, cy) on a vertical wire, label to the right
  const vbox = (cx: number, cy: number, label: string) => <g><rect x={cx - 6} y={cy - 15} width={12} height={30} rx={1.5} fill="var(--color-panel)" stroke={ACCENT} strokeWidth={1.6} />{T(cx + 15, cy + 4, label, ACCENT, 11)}</g>
  const gnd = (x: number, y: number) => <g stroke={DIM}><line x1={x} y1={y} x2={x} y2={y + 9} /><line x1={x - 6} y1={y + 9} x2={x + 6} y2={y + 9} /><line x1={x - 3} y1={y + 12.5} x2={x + 3} y2={y + 12.5} /></g>
  const triangle = <>
    <path d={`M120 44 L120 136 L${out[0]} ${out[1]} Z`} fill="var(--color-panel)" stroke={WIRE} strokeWidth={2} />
    {T(131, NEG[1] + 5, '−', DIM, 15)}{T(131, POS[1] + 5, '+', DIM, 15)}
  </>
  const outWire = <g stroke={WIRE} strokeWidth={1.6}><line x1={out[0]} y1={out[1]} x2={252} y2={out[1]} />{T(260, out[1] + 4, 'Vₒ', DIM, 12)}</g>
  let wires: React.ReactNode = null, formula = ''
  if (cfg === 'noninverting') {
    formula = 'A = 1 + R₂/R₁'
    wires = <g stroke={WIRE} strokeWidth={1.6}>
      <line x1={34} y1={POS[1]} x2={POS[0]} y2={POS[1]} />{T(26, POS[1] + 4, 'Vᵢ', DIM, 12)}
      <line x1={NEG[0]} y1={NEG[1]} x2={72} y2={NEG[1]} /><line x1={72} y1={NEG[1]} x2={72} y2={139} />{vbox(72, 154, 'R₁')}<line x1={72} y1={169} x2={72} y2={172} />{gnd(72, 172)}
      <line x1={236} y1={out[1]} x2={236} y2={150} /><line x1={236} y1={150} x2={100} y2={150} />{box(118, 144, 34, 12, 'R₂')}<line x1={100} y1={150} x2={100} y2={NEG[1]} /><line x1={100} y1={NEG[1]} x2={NEG[0]} y2={NEG[1]} />
    </g>
  } else if (cfg === 'buffer') {
    formula = 'A = 1  (repetor de tensiune)'
    wires = <g stroke={WIRE} strokeWidth={1.6}>
      <line x1={34} y1={POS[1]} x2={POS[0]} y2={POS[1]} />{T(26, POS[1] + 4, 'Vᵢ', DIM, 12)}
      <line x1={236} y1={out[1]} x2={236} y2={30} /><line x1={236} y1={30} x2={108} y2={30} /><line x1={108} y1={30} x2={108} y2={NEG[1]} /><line x1={108} y1={NEG[1]} x2={NEG[0]} y2={NEG[1]} />
    </g>
  } else if (cfg === 'differential') {
    formula = 'Vₒ = (R₂/R₁)·(U₂ − U₁)'
    wires = <g stroke={WIRE} strokeWidth={1.6}>
      <line x1={34} y1={NEG[1]} x2={NEG[0]} y2={NEG[1]} />{box(52, NEG[1] - 6, 30, 12, 'R₁')}{T(28, NEG[1] + 4, 'U₁', DIM, 12)}
      <line x1={34} y1={POS[1]} x2={POS[0]} y2={POS[1]} />{box(52, POS[1] - 6, 30, 12, 'R₃')}{T(28, POS[1] + 4, 'U₂', DIM, 12)}
      <line x1={100} y1={POS[1]} x2={100} y2={139} />{vbox(100, 154, 'R₄')}<line x1={100} y1={169} x2={100} y2={172} />{gnd(100, 172)}
      <line x1={236} y1={out[1]} x2={236} y2={32} /><line x1={236} y1={32} x2={100} y2={32} />{box(150, 26, 30, 12, 'R₂')}<line x1={100} y1={32} x2={100} y2={NEG[1]} /><line x1={100} y1={NEG[1]} x2={NEG[0]} y2={NEG[1]} />
    </g>
  } else {
    formula = 'A = − R₂/R₁'
    wires = <g stroke={WIRE} strokeWidth={1.6}>
      <line x1={34} y1={NEG[1]} x2={NEG[0]} y2={NEG[1]} />{box(52, NEG[1] - 6, 30, 12, 'R₁')}{T(28, NEG[1] + 4, 'Vᵢ', DIM, 12)}
      <line x1={POS[0]} y1={POS[1]} x2={96} y2={POS[1]} /><line x1={96} y1={POS[1]} x2={96} y2={148} />{gnd(96, 150)}
      <line x1={236} y1={out[1]} x2={236} y2={32} /><line x1={236} y1={32} x2={100} y2={32} />{box(150, 26, 30, 12, 'R₂')}<line x1={100} y1={32} x2={100} y2={NEG[1]} /><line x1={100} y1={NEG[1]} x2={NEG[0]} y2={NEG[1]} />
    </g>
  }
  return <Frame h={198}>{wires}{outWire}{triangle}{!p.hideFormula && T(150, 193, formula, PHOS, 12)}</Frame>
}

// ——— instrument transformer, current (TC) or voltage (TT) (M13) ———
function Transformer({ p, lang = 'ro' }: { p: Params; lang?: string }) {
  const isC = str(p.type, 'current') !== 'voltage'
  // "primar"/"secundar" were drawn as Romanian literals, so the English half of the app showed
  // them inside the figure while the prompt beside it was in English. Every other renderer that
  // draws words already takes `lang` (Meter, SerPar, DataTable, SIUnits) — this follows them.
  const prim = lang === 'en' ? 'primary' : 'primar'
  const sec = lang === 'en' ? 'secondary' : 'secundar'
  const coil = (cx: number, bulge: number) => {
    let d = ''
    for (let i = 0; i < 4; i++) { const y = 56 + i * 19; d += `M${cx} ${y} A9 9 0 0 ${bulge > 0 ? 1 : 0} ${cx} ${y + 19} ` }
    return <path d={d} stroke={ACCENT} strokeWidth={2} fill="none" />
  }
  return (
    <Frame h={182}>
      <line x1={146} y1={44} x2={146} y2={140} stroke={WIRE} strokeWidth={2.5} /><line x1={154} y1={44} x2={154} y2={140} stroke={WIRE} strokeWidth={2.5} />
      {coil(128, 1)}{T(101, 48, 'N₁', ACCENT, 12)}
      {coil(172, -1)}{T(199, 48, 'N₂', ACCENT, 12)}
      <g stroke={WIRE} strokeWidth={1.6}>
        <line x1={128} y1={56} x2={62} y2={56} /><line x1={128} y1={132} x2={62} y2={132} />
        <line x1={172} y1={56} x2={238} y2={56} /><line x1={172} y1={132} x2={238} y2={132} />
      </g>
      {T(70, 150, `${isC ? 'I₁' : 'U₁'} · ${prim}`, DIM, 11)}{T(210, 150, `${isC ? 'I₂' : 'U₂'} · ${sec}`, DIM, 11)}
      {isC ? Tsub(150, 176, 'K_In = N₂/N₁ = I₁/I₂', PHOS, 12) : Tsub(150, 176, 'K_Un = U₁/U₂', PHOS, 12)}
    </Frame>
  )
}

// ——— ADC quantization staircase (M12) ———
// The quantisation staircase. The SHAPE is the same for both directions of conversion — a run of
// equal steps against the ideal straight line — but the axes are not, and they are the whole point:
// an A/D converter maps a continuous voltage to a code, a D/A converter maps a code to a voltage.
// Drawn with the A/D labels on a D/A exercise, the figure shows the inverse of what is being asked,
// which is worse than no figure at all for a student building the mental model.
function AdcStair({ p }: { p: Params }) {
  const n = Math.max(3, Math.min(8, Math.round(num(p.steps, 6))))
  const dac = str(p.mode, 'adc') === 'dac'
  let d = `M${px(0)} ${py(0)}`
  for (let i = 1; i <= n; i++) d += `L${px(i / n)} ${py((i - 1) / n)}L${px(i / n)} ${py(i / n)}`
  return (
    <Frame>
      <Axes xlab={dac ? 'cod' : 'Vᵢₙ'} ylab={dac ? 'A' : 'cod'} />
      <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(1)} stroke={DIM} strokeWidth={0.9} strokeDasharray="3 3" />
      <path d={d} stroke={PHOS} strokeWidth={2.2} fill="none" style={{ filter: `drop-shadow(0 0 2px ${PHOS})` }} />
      {T(150, 22, dac ? 'A = N · A_ref / 2ⁿ' : 'q = FSR / 2ⁿ', ACCENT, 12)}
    </Frame>
  )
}

// ——— filter magnitude response (M10) ———
function Bode({ p }: { p: Params }) {
  const type = str(p.type, 'lowpass')
  const fc = 0.32, f0 = 0.5, Q = 3.2
  const H = (t: number): number => {
    const x = Math.max(0.001, t)
    if (type === 'highpass') return (x / fc) / Math.sqrt(1 + (x / fc) ** 2)
    if (type === 'bandpass') return 1 / Math.sqrt(1 + (Q * (x / f0 - f0 / x)) ** 2)
    if (type === 'bandstop') return 1 - 1 / Math.sqrt(1 + (Q * (x / f0 - f0 / x)) ** 2)
    return 1 / Math.sqrt(1 + (x / fc) ** 2)
  }
  return (
    <Frame>
      <Axes xlab="f" ylab="|H|" />
      <line x1={PX0} y1={py(0.707)} x2={PX1 - 8} y2={py(0.707)} stroke={AMBER} strokeWidth={0.8} strokeDasharray="3 3" />
      {T(PX1 - 26, py(0.707) - 4, '0,707', AMBER, 10)}
      <path d={plot(H)} stroke={PHOS} strokeWidth={2.4} fill="none" style={{ filter: `drop-shadow(0 0 2px ${PHOS})` }} />
    </Frame>
  )
}

// ——— power triangle P–Q–S (M14) ———
function PowerTri({ p }: { p: Params }) {
  void p
  const ox = 66, oy = 138, PW = 152, QH = 82
  const a = Math.atan2(QH, PW)
  return (
    <Frame h={182}>
      <line x1={ox} y1={oy} x2={ox + PW} y2={oy} stroke={PHOS} strokeWidth={2.6} />
      <line x1={ox + PW} y1={oy} x2={ox + PW} y2={oy - QH} stroke={ACCENT} strokeWidth={2.6} />
      <line x1={ox} y1={oy} x2={ox + PW} y2={oy - QH} stroke={AMBER} strokeWidth={2.6} />
      <path d={`M${ox + 34} ${oy} A34 34 0 0 0 ${ox + 34 * Math.cos(a)} ${oy - 34 * Math.sin(a)}`} stroke={DIM} strokeWidth={1.2} fill="none" />
      {T(ox + 46, oy - 9, 'φ', DIM, 13)}
      {T(ox + PW / 2, oy + 16, 'P  [W]', PHOS, 12)}
      {T(ox + PW + 26, oy - QH / 2, 'Q  [var]', ACCENT, 12)}
      {T(ox + PW / 2 - 20, oy - QH / 2 - 8, 'S  [VA]', AMBER, 12)}
      {T(150, 176, 'S² = P² + Q²   ;   cos φ = P/S', DIM, 11)}
    </Frame>
  )
}

function keywordKind(prompt: string): string | null {
  const p = prompt.toLowerCase()
  if (/osciloscop|oscilloscope|volts?\s*\/\s*div|time\s*\/\s*div|form[aă] de und|waveform|sinusoid/.test(p)) return 'scope'
  if (/\bșunt|\bsunt\b|extinderea domeniului|rezistor de sunt/.test(p)) return 'shunt'
  if (/punte|bridge|wheatstone|maxwell|schering|sauty|echilibr/.test(p)) return 'bridge'
  if (/amonte|aval|volt.?ampermetric|montaj/.test(p)) return 'circuit-av'
  if (/magnetoelectric|cadru mobil|ac indicator|pointer|deviat|indica[țt]ia acului|cadran|scar[aă] gradat|clas[aă] de/.test(p)) return 'meter'
  return null
}

// ——— electrodynamic wattmeter symbol: current coil (series) + voltage coil (shunt), 4 terminals ———
function Wattmeter({ lang = 'ro' }: { lang?: string }) {
  return (
    <Frame h={150}>
      <circle cx={150} cy={78} r={26} fill="var(--color-panel)" stroke={WIRE} strokeWidth={2} />{T(150, 84, 'W', WIRE, 20)}
      <line x1={38} y1={78} x2={124} y2={78} stroke={ACCENT} strokeWidth={3} /><line x1={176} y1={78} x2={262} y2={78} stroke={ACCENT} strokeWidth={3} />
      <circle cx={44} cy={78} r={3.2} fill={AMBER} stroke="none" />{T(44, 66, '∗', AMBER, 15)}
      {T(60, 98, lang === 'en' ? 'current coil' : 'bobină de curent', ACCENT, 9)}{T(255, 70, 'I', ACCENT, 11)}
      <line x1={150} y1={52} x2={150} y2={26} stroke={DIM} strokeWidth={1.6} /><line x1={150} y1={104} x2={150} y2={132} stroke={DIM} strokeWidth={1.6} />
      <circle cx={150} cy={26} r={3.2} fill={AMBER} stroke="none" />{T(166, 28, '∗ U', DIM, 11)}{T(160, 132, 'U', DIM, 11)}
      {T(150, 148, lang === 'en' ? 'voltage coil' : 'bobină de tensiune', DIM, 9)}
    </Frame>
  )
}

// ——— wattmeter connection schemes: single-phase / Aron 2-wattmeter / 3-wattmeter (4-wire) ———
// A wattmeter is a QUADRIPOLE (4 terminals): the current coil (thick) is in series on its line (2
// terminals, one in one out); the voltage coil (thin) is in PARALLEL — it leaves the circle at the
// bottom and runs to the reference (neutral/common line), and leaves at the top, up then left, back
// to the current-coil INPUT terminal. Same convention as the standalone Wattmeter figure.
function WattConn({ p, lang = 'ro' }: { p: Params; lang?: string }) {
  const v = str(p.type, 'single')
  const en = lang === 'en'
  // the caption under the three-phase diagrams states the connection rule the exercise turns on,
  // so it is the one drawn string here a student actually has to read — it cannot stay Romanian-only
  const capAron = en
    ? '3 wires (no neutral) → 2 wattmeters (Aron); line 2 = common'
    : '3 conductoare (fără nul) → 2 wattmetre (Aron); linia 2 = comună'
  const capThree = en ? '4 wires (with neutral) → 3 wattmeters' : '4 conductoare (cu nul) → 3 wattmetre'
  const load = (x0: number, y0: number, x1: number, y1: number) => <g><rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx={2} fill="var(--color-panel)" stroke={WIRE} strokeWidth={1.5} />{T((x0 + x1) / 2, (y0 + y1) / 2 + 4, 'Z', WIRE, 13)}</g>
  const rail = (y: number, x0: number, x1: number) => <line x1={x0} y1={y} x2={x1} y2={y} stroke={WIRE} strokeWidth={1.6} />
  const dot = (x: number, y: number) => <circle cx={x} cy={y} r={2.6} fill={WIRE} stroke="none" />
  // one complete wattmeter: current coil in series + voltage coil in parallel between the current
  // input node (inX) and the reference line at vto. vto below cy ⇒ the reference terminal exits the
  // bottom; above ⇒ it exits the top (Aron's lower wattmeter), the input terminal taking the other side.
  const wm = (cx: number, cy: number, lab: string, vto: number) => {
    const inX = cx - 30, s = vto > cy ? 1 : -1 // s: which way the reference terminal points
    const refY = cy + s * 13, inTopY = cy - s * 13, loopY = cy - s * 24
    return <g>
      {/* current coil (thick) in series on the line */}
      <line x1={inX} y1={cy} x2={cx - 13} y2={cy} stroke={ACCENT} strokeWidth={3.4} />
      <line x1={cx + 13} y1={cy} x2={cx + 30} y2={cy} stroke={ACCENT} strokeWidth={3.4} />
      <circle cx={cx} cy={cy} r={13} fill="var(--color-panel)" stroke={WIRE} strokeWidth={1.8} />{T(cx, cy + 5, 'W', WIRE, 13)}
      {/* voltage coil, reference terminal: out of the circle toward the reference line */}
      <line x1={cx} y1={refY} x2={cx} y2={vto} stroke={ACCENT} strokeWidth={1.4} />{dot(cx, vto)}
      {/* voltage coil, input terminal: out the other side, then across and back to the current input */}
      <path d={`M${cx} ${inTopY} V${loopY} H${inX} V${cy}`} stroke={ACCENT} strokeWidth={1.4} fill="none" />{dot(inX, cy)}
      {/* polarity ∗ marks at the input corner (current coil and voltage coil share it) */}
      {T(inX + 6, cy - s * 6, '∗', AMBER, 10)}{T(cx - 8, inTopY - s * 3, '∗', AMBER, 10)}
      {T(cx + 17, cy - s * 12, lab, ACCENT, 11)}
    </g>
  }

  if (v === 'aron') {
    // The common line (2) is drawn at the bottom so BOTH wattmeters connect it the same way:
    // the voltage-coil common terminal leaves the bottom of the circle straight down to line 2,
    // and the other terminal loops over the top back to the current-coil input (amonte).
    return (
      <Frame h={200}>
        {rail(44, 44, 214)}{T(30, 48, '1', DIM, 11)}{rail(88, 44, 214)}{T(30, 92, '3', DIM, 11)}{rail(158, 44, 214)}{T(30, 162, '2', DIM, 11)}
        {wm(100, 44, 'W₁', 158)}
        {wm(150, 88, 'W₂', 158)}
        {load(214, 34, 246, 168)}
        {T(150, 192, capAron, DIM, 8.5)}
      </Frame>
    )
  }
  if (v === 'three') {
    return (
      <Frame h={196}>
        {rail(34, 44, 206)}{T(30, 34, 'L1', DIM, 10)}{rail(72, 44, 206)}{T(30, 72, 'L2', DIM, 10)}{rail(110, 44, 206)}{T(30, 110, 'L3', DIM, 10)}{rail(164, 44, 206)}{T(32, 168, 'N', DIM, 10)}
        {wm(102, 34, 'W₁', 164)}
        {wm(140, 72, 'W₂', 164)}
        {wm(178, 110, 'W₃', 164)}
        {load(206, 28, 230, 170)}
        {T(150, 190, capThree, DIM, 9)}
      </Frame>
    )
  }
  // single-phase: current coil in series, voltage coil in parallel across the load (to the return)
  return (
    <Frame h={172}>
      <circle cx={26} cy={92} r={11} fill="var(--color-panel)" stroke={AMBER} strokeWidth={1.6} />{T(26, 96, '∼', AMBER, 13)}
      <line x1={26} y1={56} x2={244} y2={56} stroke={WIRE} strokeWidth={1.6} /><line x1={26} y1={128} x2={244} y2={128} stroke={WIRE} strokeWidth={1.6} />
      <line x1={26} y1={56} x2={26} y2={81} stroke={WIRE} strokeWidth={1.6} /><line x1={26} y1={103} x2={26} y2={128} stroke={WIRE} strokeWidth={1.6} />
      {wm(112, 56, 'W', 128)}
      {load(214, 52, 244, 132)}
      {T(150, 156, en ? 'current coil in series · voltage coil in parallel' : 'bobina de curent în serie · bobina de tensiune în paralel', DIM, 8.5)}
    </Frame>
  )
}

// What each figure shows, for someone who cannot see it. An unlabelled <svg> is the worst of the
// three options: a screen reader walks into it and reads the loose <text> glyphs inside — "R", "C",
// "U₁" — in DOM order, which is noise dressed as information. Hiding the figures instead would be
// wrong, because many prompts say "montajul din figură" and the drawing carries what the words do
// not. So each one is announced by TYPE. That is a label, not a description: a full description of
// every schematic is content only Iulian can write, and this at least turns noise into a landmark.
const FIGURE_LABEL: Record<string, { ro: string; en: string }> = {
  scope: { ro: 'ecran de osciloscop', en: 'oscilloscope screen' },
  scopepanel: { ro: 'panoul frontal al unui osciloscop', en: 'oscilloscope front panel' },
  meter: { ro: 'cadranul unui aparat analogic', en: 'analogue meter dial' },
  rangemeter: { ro: 'aparat cu mai multe domenii', en: 'multi-range meter' },
  bridge: { ro: 'punte de măsurare în curent continuu', en: 'd.c. measuring bridge' },
  acbridge: { ro: 'punte de măsurare în curent alternativ', en: 'a.c. measuring bridge' },
  'circuit-av': { ro: 'schemă de montaj amonte/aval', en: 'voltmeter–ammeter connection diagram' },
  circuit: { ro: 'schemă de circuit', en: 'circuit diagram' },
  serpar: { ro: 'grupare serie-paralel', en: 'series–parallel grouping' },
  shunt: { ro: 'șunt de extindere a domeniului', en: 'range-extension shunt' },
  resnet: { ro: 'rețea de rezistoare', en: 'resistor network' },
  opamp: { ro: 'montaj cu amplificator operațional', en: 'operational-amplifier circuit' },
  wattconn: { ro: 'schema de conectare a wattmetrului', en: 'wattmeter connection diagram' },
  wattmeter: { ro: 'wattmetru', en: 'wattmeter' },
  transformer: { ro: 'transformator de măsurare', en: 'measuring transformer' },
  phasor: { ro: 'diagramă fazorială', en: 'phasor diagram' },
  phasorbranch: { ro: 'diagramă fazorială pe laturi', en: 'branch phasor diagram' },
  powertri: { ro: 'triunghiul puterilor', en: 'power triangle' },
  charcurve: { ro: 'caracteristică de transfer', en: 'transfer characteristic' },
  stepresp: { ro: 'răspuns la semnal treaptă', en: 'step response' },
  risetime: { ro: 'măsurarea timpului de creștere', en: 'rise-time measurement' },
  damping: { ro: 'regim de amortizare', en: 'damping regime' },
  bode: { ro: 'caracteristică Bode', en: 'Bode plot' },
  adcstair: { ro: 'caracteristica în trepte a unui convertor analog-digital', en: 'ADC staircase characteristic' },
  target: { ro: 'precizie și justețe, ilustrate pe o țintă', en: 'precision and trueness on a target' },
  symbols: { ro: 'simboluri de aparate de măsură', en: 'measuring-instrument symbols' },
}

export function QuestionVisual(props: { visual?: { kind: string; params?: Params }; prompt: string; image?: string; alt?: string; lang?: string }) {
  const kind = props.visual?.kind ?? keywordKind(props.prompt)
  const drawn = QuestionFigure(props)
  const label = kind ? FIGURE_LABEL[kind] : undefined
  // A table stays a real <table> so its rows and columns can be navigated, and a formula card is
  // readable text — neither should be flattened into a single image.
  if (!drawn || !label || kind === 'table' || kind === 'concept' || kind === 'formula') return drawn
  const lang = props.lang ?? 'ro'
  // role="group", NOT role="img". These figures are not decorative pictures: they carry 130-odd
  // drawn labels — "2 V/div", "20 ms/div", R₁/R₂/Rₓ on a bridge, the needle's scale — and several
  // questions are answerable ONLY by reading them. role="img" collapses the whole subtree into a
  // single node whose entire accessible content is this one label, so every one of those values
  // became unreachable: a screen-reader user was told "Figure: oscilloscope screen" and denied the
  // numbers the question asks for. A labelled group announces the same sentence and leaves the
  // contents readable.
  return (
    <div role="group" aria-label={`${lang === 'en' ? 'Figure' : 'Figură'}: ${label[lang === 'en' ? 'en' : 'ro']}`}>
      {drawn}
    </div>
  )
}

function QuestionFigure({ visual, prompt, image, alt, lang = 'ro' }: { visual?: { kind: string; params?: Params }; prompt: string; image?: string; alt?: string; lang?: string }) {
  const kind = visual?.kind ?? keywordKind(prompt)
  const params = visual?.params ?? {}
  // A real figure (schematic / diagram) beats a generic formula card — show the
  // figure, keeping the formula below it as a hint.
  if (image && (!kind || kind === 'concept' || kind === 'formula')) {
    return (
      <>
        <img src={image} alt={alt ?? ''} loading="lazy" className="mb-3 max-h-72 w-full rounded-lg border border-border bg-black/20 object-contain" />
        {(kind === 'concept' || kind === 'formula') && Concept(params, lang)}
      </>
    )
  }
  if (kind === 'scope') return <Scope p={params} />
  if (kind === 'shunt') return <Shunt />
  if (kind === 'bridge') return <Bridge p={params} />
  if (kind === 'phasor') return <Phasor p={params} />
  if (kind === 'capnet') return <CapNet />
  if (kind === 'resnet') return <ResNet />
  if (kind === 'resnet2') return <ResNet2 />
  if (kind === 'scopepanel') return <ScopePanel lang={lang} />
  if (kind === 'charcurve') return <CharCurve p={params} />
  if (kind === 'target') return <Target p={params} />
  if (kind === 'stepresp') return <StepResp p={params} />
  if (kind === 'damping') return <Damping p={params} />
  if (kind === 'siunits') return <SIUnits lang={lang} />
  if (kind === 'prefixes') return <Prefixes lang={lang} />
  if (kind === 'opamp') return <OpAmp p={params} />
  if (kind === 'transformer') return <Transformer p={params} lang={lang} />
  if (kind === 'adcstair') return <AdcStair p={params} />
  if (kind === 'bode') return <Bode p={params} />
  if (kind === 'powertri') return <PowerTri p={params} />
  if (kind === 'wattmeter') return <Wattmeter lang={lang} />
  if (kind === 'acbridge') return <AcBridge p={params} />
  if (kind === 'wattconn') return <WattConn p={params} lang={lang} />
  if (kind === 'phasorbranch') return <PhasorBranch p={params} />
  if (kind === 'circuit-av' || kind === 'circuit') return <CircuitAV p={params} lang={lang} />
  if (kind === 'meter') return <Meter p={params} lang={lang} />
  if (kind === 'rangemeter') return <RangeMeter p={params} lang={lang} />
  if (kind === 'risetime') return <RiseTime p={params} />
  if (kind === 'serpar') return <SerPar p={params} lang={lang} />
  if (kind === 'symbols') return <Symbols p={params} />
  if (kind === 'table') return <DataTable p={params} lang={lang} />
  if (kind === 'concept' || kind === 'formula') return Concept(params, lang)
  if (image) return <img src={image} alt={alt ?? ''} loading="lazy" className="mb-3 max-h-72 w-full rounded-lg border border-border bg-black/20 object-contain" />
  return null
}
