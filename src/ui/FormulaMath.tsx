import { createElement, type ReactNode } from 'react'
import { Formula } from './Formula'

// EXPERIMENT (currently wired only into the M01 recap): typeset a linear formula with
// native MathML, so the radical bar scales over the whole radicand and a/b becomes a real
// stacked fraction. No dependency — the browser does the typesetting.
// Anything we cannot parse confidently falls back to the plain <Formula> renderer.

type Tok = { t: 'num' | 'id' | 'op'; v: string }
const OPS = '(){}|+-−·*/=^_≈⇒→≤≥,'

function lex(s: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (/\s/.test(c)) { i++; continue }
    if (c === '√') { out.push({ t: 'op', v: '√' }); i++; continue }
    if (/[0-9]/.test(c)) { let v = ''; while (i < s.length && /[0-9.,]/.test(s[i])) v += s[i++]; out.push({ t: 'num', v }); continue }
    if (OPS.includes(c)) { out.push({ t: 'op', v: c }); i++; continue }
    let v = ''
    while (i < s.length && !/\s/.test(s[i]) && !OPS.includes(s[i]) && s[i] !== '√' && !/[0-9]/.test(s[i])) v += s[i++]
    if (!v) v = s[i++]
    out.push({ t: 'id', v })
  }
  return out
}

let uid = 0
const E = (tag: string, children?: ReactNode | ReactNode[], props?: Record<string, unknown>) =>
  createElement(tag, { key: 'm' + uid++, ...props }, children as ReactNode)
const row = (kids: ReactNode[]): ReactNode => (kids.length === 1 ? kids[0] : E('mrow', kids))

// Unicode sub/superscripts are cramped when left as literal glyphs — turn them into real
// MathML scripts so "∫₀ᵀ" gets proper limits and "x²" a proper exponent.
const SUB: Record<string, string> = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', 'ₐ': 'a', 'ₑ': 'e', 'ₒ': 'o', 'ₓ': 'x', 'ₕ': 'h', 'ₖ': 'k', 'ₗ': 'l', 'ₘ': 'm', 'ₙ': 'n', 'ₚ': 'p', 'ₛ': 's', 'ₜ': 't' }
const SUP: Record<string, string> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', 'ᵀ': 'T', 'ᵃ': 'a', 'ᵇ': 'b', 'ᶜ': 'c', 'ᵈ': 'd', 'ᵉ': 'e', 'ⁿ': 'n', 'ᵐ': 'm', 'ᵏ': 'k', 'ᵖ': 'p' }
const BIGOP = '∫∑∏∮'

// A unicode superscript run right after a digit ("2ⁿ", "2⁸", "2¹²") is not attached to the number
// by the lexer, so it renders as a tiny raised glyph. Rewrite it to real "^{…}" so it becomes a
// proper exponent (msup). Identifier scripts (X², ∫₀ᵀ) are already handled by mkIdent.
const SUPRUN = new RegExp('([0-9])((?:[' + Object.keys(SUP).join('') + '])+)', 'gu')
const digitSup = (s: string) => s.replace(SUPRUN, (_, d, run) => d + '^{' + [...run].map((c: string) => SUP[c]).join('') + '}')

// MathML italicises a single-letter <mi> and leaves multi-letter ones upright. A letter carrying a
// combining mark ("X̄") is two code points, so it came out upright next to an italic "X" — same
// variable, two styles on one card. Measure the length without the marks.
const oneLetter = (s: string) => [...s.replace(/\p{M}/gu, '')].length === 1
const leaf = (s: string) =>
  /^[0-9]+([.,][0-9]+)?$/.test(s) ? E('mn', s)
    : BIGOP.includes(s) ? E('mo', s)
      : E('mi', s, oneLetter(s) && /\p{M}/u.test(s) ? { mathvariant: 'italic' } : undefined)

function mkIdent(v: string): ReactNode {
  let base = '', sub = '', sup = ''
  for (const ch of v) {
    if (SUB[ch] !== undefined) sub += SUB[ch]
    else if (SUP[ch] !== undefined) sup += SUP[ch]
    else base += ch
  }
  if (!base) return leaf(v)
  const b = leaf(base)
  if (sub && sup) return E('msubsup', [b, leaf(sub), leaf(sup)])
  if (sup) return E('msup', [b, leaf(sup)])
  if (sub) return E('msub', [b, leaf(sub)])
  return b
}

type P = { i: number; bar?: number }
// atom → [rendered node, paren-free inner node]
function atom(t: Tok[], p: P): [ReactNode, ReactNode] {
  const tk = t[p.i]
  if (!tk) throw new Error('eof')
  if (tk.t === 'op' && tk.v === '(') {
    p.i++
    const inner = expr(t, p)
    if (t[p.i]?.v !== ')') throw new Error('unbalanced')
    p.i++
    // a stacked fraction (or radical) already reads as one unit — the parentheses only add noise
    const kind = (inner as { type?: string } | null)?.type
    if (kind === 'mfrac' || kind === 'msqrt') return [inner, inner]
    return [row([E('mo', '('), inner, E('mo', ')')]), inner]
  }
  // "{…}" is a source-notation group (t_{90%}, e^{-t/τ}) — it groups without printing brackets
  if (tk.t === 'op' && tk.v === '{') {
    p.i++
    const inner = expr(t, p)
    if (t[p.i]?.v !== '}') throw new Error('unbalanced {')
    p.i++
    return [inner, inner]
  }
  if (tk.t === 'op' && tk.v === '|') {
    // "|" is both the opening and the closing bar, so while we are inside one it must not be
    // mistaken for the start of another factor (see the juxtaposition rule in term())
    p.i++; p.bar = (p.bar ?? 0) + 1
    const inner = expr(t, p)
    p.bar = (p.bar ?? 1) - 1
    if (t[p.i]?.v !== '|') throw new Error('unbalanced |')
    p.i++
    const n = row([E('mo', '|'), inner, E('mo', '|')])
    return [n, n]
  }
  if (tk.t === 'num') { p.i++; const n = E('mn', tk.v); return [n, n] }
  if (tk.t === 'id') { p.i++; const n = mkIdent(tk.v); return [n, n] }
  throw new Error('unexpected ' + tk.v)
}

// explicit scripts written in source notation: "X_L", "t_{90%}", "e^{-t/τ}", "R^2"
function script(t: Tok[], p: P): [ReactNode, ReactNode] {
  let [node, inner] = atom(t, p)
  while (t[p.i]?.v === '_' || t[p.i]?.v === '^') {
    const tag = t[p.i].v === '_' ? 'msub' : 'msup'
    p.i++
    const [, sInner] = atom(t, p)
    node = E(tag, [inner, sInner])
    inner = node
  }
  return [node, inner]
}

// returns [rendered, paren-free inner] so fraction/radical operands can drop redundant brackets
function unary(t: Tok[], p: P): [ReactNode, ReactNode] {
  if (t[p.i]?.v === '√') { p.i++; const [, inner] = script(t, p); const n = E('msqrt', inner); return [n, n] }
  // leading sign, e.g. the exponent of "e^{−t/τ}"
  if (t[p.i]?.v === '-' || t[p.i]?.v === '−') { p.i++; const [n] = unary(t, p); const r = row([E('mo', '−'), n]); return [r, r] }
  return script(t, p)
}

// '/' binds tighter than '·' so "1/T·x" reads as (1/T)·x, matching how the source is written.
// The fraction bar already groups its operands, so "(R₁+R₂)" loses its parentheses.
function frac(t: Tok[], p: P): ReactNode {
  let [node, inner] = unary(t, p)
  while (t[p.i]?.v === '/') {
    p.i++
    const [, rInner] = unary(t, p)
    node = E('mfrac', [inner, rInner])
    inner = node
  }
  return node
}

function term(t: Tok[], p: P): ReactNode {
  const kids: ReactNode[] = [frac(t, p)]
  while (t[p.i]) {
    const tk = t[p.i]
    if (tk.v === '·' || tk.v === '*') { p.i++; kids.push(E('mo', '·'), frac(t, p)); continue }
    // juxtaposition, e.g. "∫₀ᵀ x dt" — implicit product, just a thin gap
    if (tk.t === 'id' || tk.t === 'num' || tk.v === '(' || tk.v === '√' || (tk.v === '|' && !p.bar)) {
      kids.push(E('mspace', null, { width: '0.18em' }), frac(t, p)); continue
    }
    break
  }
  return row(kids)
}

const REL = ['+', '-', '−', '=', '≈', '⇒', '→', '≤', '≥', ',']

function expr(t: Tok[], p: P): ReactNode {
  const kids: ReactNode[] = []
  // a chunk may open with a relational operator or a comma when a prose label / unit was split off
  // before it, e.g. "…[Ω]" + ", X_C = 1/(ω·C)" (two equations on one line separated by a comma)
  if (t[p.i] && ['=', '≈', '⇒', '→', '≤', '≥', ','].includes(t[p.i].v)) kids.push(E('mo', t[p.i++].v))
  kids.push(term(t, p))
  while (t[p.i] && REL.includes(t[p.i].v)) {
    const op = t[p.i].v; p.i++
    kids.push(E('mo', op === '-' ? '−' : op), term(t, p))
  }
  return row(kids)
}

// ——— splitting a recap line into maths / units / prose ———
// A recap line usually mixes three things:
//     G_ech = a·b/c   [u.m.]   (mărimea echivalentă, b și c în unități SI)
// the maths, the unit in brackets and a comment. Splitting them apart lets EVERY formula in
// every module be typeset the same way, instead of only the handful that are pure maths.
// The example is deliberately synthetic: a real recap line copied in here is a sentence from
// content-private/, and check-not-staged.mjs stops the push over it — correctly.

// A parenthesised run is prose (a comment) rather than grouping when it reads like a sentence.
// Word LENGTH is not the signal — "(X_max/X_citit)" is maths. Prose is marked by Romanian
// diacritics, by two plain words separated only by a space, or by a function word.
const STOPWORD = /\b(in|of|the|for|with|where|per|and|counts|approx|rev|ex|adica|sau|resp)\b/i
// A subscript is a name, not prose: "X_măsurat − X_referință" is maths even though the indices
// carry diacritics, so the scripts are dropped before the sentence test.
const bare = (s: string) => s.replace(/[_^]\{[^}]*\}/g, '').replace(/[_^][\p{L}\p{N}]+/gu, '')
const isProse = (s: string) => {
  const t = bare(s)
  return /[ăâîșțĂÂÎȘȚ]/.test(t) || /\b\p{L}{2,}\s+\p{L}{2,}\b/u.test(t) || STOPWORD.test(t)
}

type Chunk = { math: boolean; s: string }

function chunks(src: string): Chunk[] {
  const out: Chunk[] = []
  let buf = ''
  const flush = () => { if (buf.trim()) out.push({ math: true, s: buf.trim() }); buf = '' }
  for (let i = 0; i < src.length;) {
    const c = src[i]
    if (c === '[') {                                   // a unit: "[Ω]", "[Wh]"
      const j = src.indexOf(']', i)
      if (j > 0) { flush(); out.push({ math: false, s: src.slice(i, j + 1) }); i = j + 1; continue }
    }
    if (c === '(') {                                   // grouping, or a trailing comment
      let d = 0, j = i
      for (; j < src.length; j++) { if (src[j] === '(') d++; else if (src[j] === ')') { d--; if (!d) break } }
      if (j < src.length) {
        if (isProse(src.slice(i + 1, j))) { flush(); out.push({ math: false, s: src.slice(i, j + 1) }); i = j + 1; continue }
        buf += src.slice(i, j + 1); i = j + 1; continue
      }
    }
    buf += c; i++
  }
  flush()
  return out
}

function typeset(body: string): ReactNode | null {
  try {
    const toks = lex(body)
    if (!toks.length) return null
    const p: P = { i: 0 }
    const tree = expr(toks, p)
    if (p.i !== toks.length) return null
    return createElement('math', { key: 'math' + uid++, style: { fontSize: '1.15em' } }, tree)
  } catch { return null }
}

export function FormulaMath({ children, center = false }: { children: string; center?: boolean }) {
  const src = children ?? ''
  // "Valoarea medie: X̄ = ..."  → keep the label as ordinary text. A label is prose, so it must
  // not contain maths — otherwise a colon inside a trailing comment swallows the whole formula.
  const m = src.match(/^([^:=/·√+[\]]{2,40}:)\s*([\s\S]+)$/)
  const label = m ? m[1] : ''
  const rest = digitSup((m ? m[2] : src).replace(/×/g, '·'))

  // Several independent equations share one line, separated by ";". A fraction must never reach
  // across the separator — "T = 1/f ; ω = 2·π·f" is two formulas, not one over "f ; ω". Split only
  // at TOP-LEVEL ";", so a ";" inside a trailing comment "(rezoluția; ex…)" doesn't break the paren.
  const parts: string[] = []
  { let depth = 0, cur = ''
    for (const c of rest) {
      if (c === '(' || c === '[') depth++
      else if (c === ')' || c === ']') depth = Math.max(0, depth - 1)
      if (c === ';' && depth === 0) { parts.push(cur); cur = '' } else cur += c
    }
    parts.push(cur) }
  const out: ReactNode[] = []
  let typesetAny = false

  parts.forEach((part, pi) => {
    if (pi > 0) out.push(<span key={'sep' + pi} className="mx-1.5 text-faint">;</span>)
    for (const ch of chunks(part)) {
      // prose never goes through MathML (italicised words read as a product of variables) — but it
      // still goes through <Formula>, or a stray "X_max" in a comment shows its underscore raw
      if (!ch.math || isProse(ch.s)) { out.push(<span key={'t' + uid++} className="text-muted"><Formula>{ch.s}</Formula></span>); continue }
      const node = typeset(ch.s)
      // MathML said no (an unbalanced bracket, a token the grammar has no rule for). The chunk is
      // still a formula, so hand it to <Formula> in DISPLAY mode: its own renderer still stacks a
      // top-level a/b. Passing it inline — which is what happened until this line grew its flag —
      // dropped the fraction too, degrading twice for one parse failure. This is also the only
      // caller of display mode; without it that half of Formula.tsx is unreachable.
      if (!node) { out.push(<span key={'f' + uid++}><Formula display>{ch.s}</Formula></span>); continue }
      typesetAny = true
      // inline-block + its own line-height so the taller maths (fractions, radicals) grows the
      // line box instead of overflowing and colliding with the neighbouring row
      out.push(
        <span key={'m' + uid++} style={{ display: 'inline-block', verticalAlign: 'middle', lineHeight: 'normal' }}>{node}</span>,
      )
    }
  })

  // Nothing typeset at all: hand back the ORIGINAL line untouched rather than the reassembled
  // chunks, so a line that is really prose ("citirea se face pe scara de jos") keeps its own
  // spacing. Deliberately not display mode, unlike the per-chunk fallback above — `src` here is
  // unsplit, so a fraction bar could land on the "/" of "și/sau" or "10 ms/div".
  if (!typesetAny) return <Formula>{src}</Formula>
  return (
    <span className={`flex flex-wrap items-center gap-x-1.5 ${center ? 'justify-center' : ''}`} style={{ lineHeight: 1.15 }}>
      {label && <span>{label}</span>}
      {out}
    </span>
  )
}
