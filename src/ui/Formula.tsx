// Render plain-text math properly:
//   X_ref → X<sub>ref</sub>,  X^2 → X<sup>2</sup>,  X_{max} / X^{2} for multi-char groups,
//   "sqrt" spelled out → the √ glyph (the drawn radical with a bar over the radicand is
//   FormulaMath's msqrt — here the glyph simply sits in front of the parenthesised radicand),
//   and, in `display` mode (pure-formula contexts), a/b as a stacked fraction.
// Inline/prose mode never builds fractions, so "10 ms/div" or "și/sau" stay untouched.
// Display mode has exactly one caller: FormulaMath's per-chunk fallback, for a chunk it has
// already classified as maths but could not typeset.
const WORD = /[\p{L}\p{N}]/u
// denominators that are plainly units — keep those inline, not as a stacked fraction
const UNIT_DEN = /^(div|kwh|wh|rot|s|sec|min|h|hz|v|a|w|va|var|ω|ohm|m|cm|mm|km|k|kg|j|f|imp)$/i

function normalize(s: string): string {
  return s
    .replace(/\bsqrt\s*\(/g, '√(').replace(/\bsqrt\b/g, '√')
    .replace(/\bomega\b/g, 'ω').replace(/\bpi\b/g, 'π').replace(/\bDelta\b/g, 'Δ')
    .replace(/<=/g, '≤').replace(/>=/g, '≥').replace(/!=/g, '≠')
    .replace(/=>/g, '⇒').replace(/->/g, '→')
    .replace(/×/g, '·')                       // one multiplication sign everywhere
    .replace(/\s\*\s/g, ' · ').replace(/\*/g, '·')
}

// index of the ')' matching the '(' at position i (-1 if unbalanced)
function matchParen(s: string, i: number): number {
  let d = 0
  for (let j = i; j < s.length; j++) {
    if (s[j] === '(') d++
    else if (s[j] === ')') { d--; if (d === 0) return j }
  }
  return -1
}

// split at top-level (outside parentheses) occurrences of any char in `set`
function splitTop(s: string, set: string): { parts: string[]; seps: string[] } {
  const parts: string[] = []; const seps: string[] = []
  let d = 0, cur = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '(') d++
    else if (c === ')') d--
    if (d === 0 && set.includes(c)) { parts.push(cur); seps.push(c); cur = '' } else cur += c
  }
  parts.push(cur)
  return { parts, seps }
}

function unwrap(s: string): string {
  const t = s.trim()
  return t.startsWith('(') && matchParen(t, 0) === t.length - 1 ? t.slice(1, -1).trim() : t
}

type K = { n: number }

// subscripts, superscripts and radicals — safe for prose
function inline(s: string, k: K): React.ReactNode[] {
  const out: React.ReactNode[] = []
  let buf = ''
  const flush = () => { if (buf) { out.push(<span key={k.n++}>{buf}</span>); buf = '' } }
  for (let i = 0; i < s.length;) {
    const ch = s[i]
    if (ch === '_' || ch === '^') {
      flush(); i++
      let content = ''
      if (s[i] === '{') { i++; while (i < s.length && s[i] !== '}') content += s[i++]; i++ }
      else { while (i < s.length && WORD.test(s[i])) content += s[i++] }
      if (content) out.push(ch === '_'
        ? <sub key={k.n++} className="text-[0.7em]">{content}</sub>
        : <sup key={k.n++} className="text-[0.7em]">{content}</sup>)
      else buf += ch
    } else { buf += ch; i++ }
  }
  flush()
  return out
}

// one side of a relation: becomes a stacked fraction when it is a single top-level a/b
function segment(s: string, k: K): React.ReactNode {
  const { parts, seps } = splitTop(s, '/')
  if (parts.length === 2 && seps.length === 1) {
    const num = parts[0].trim(), den = parts[1].trim()
    const denWord = den.replace(/[^\p{L}]/gu, '')
    // "600 rot/kWh" or "10 ms/div" is a quantity-per-unit, not a fraction; but a bare
    // symbol over a symbol ("P / S") is — so only the numbered form is kept inline.
    const perUnit = /\d/.test(num) && UNIT_DEN.test(denWord)
    if (num && den && !perUnit) {
      return (
        <span key={k.n++} className="mx-1 inline-flex flex-col items-center text-center align-middle">
          <span className="px-1 leading-tight">{inline(unwrap(num), k)}</span>
          <span className="w-full border-t border-current px-1 leading-tight">{inline(unwrap(den), k)}</span>
        </span>
      )
    }
  }
  return <span key={k.n++}>{inline(s, k)}</span>
}

export function Formula({ children, display = false }: { children: string; display?: boolean }) {
  const s = normalize(children ?? '')
  const k: K = { n: 0 }
  if (!display) return <>{inline(s, k)}</>
  const { parts, seps } = splitTop(s, '=≈⇒→≤≥')
  const out: React.ReactNode[] = []
  parts.forEach((p, i) => {
    out.push(segment(p.trim(), k))
    if (i < seps.length) out.push(<span key={k.n++} className="mx-1">{seps[i]}</span>)
  })
  return <>{out}</>
}
