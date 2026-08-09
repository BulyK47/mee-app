import type { Exercise, Tolerance, Lang } from './types'

// Accept both decimal comma (RO: 2,5) and point (2.5).
export function parseNum(input: string): number | null {
  if (input == null) return null
  const s = String(input).trim().replace(/\s+/g, '').replace(',', '.')
  if (s === '' || !/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s)) return null
  const n = parseFloat(s)
  return Number.isNaN(n) ? null : n
}

export function tolValue(answer: number, tol?: Tolerance): number {
  if (!tol) return 0
  if (tol.abs != null) return Math.abs(tol.abs)
  // The fallback is for answer === 0, where a PERCENTAGE band is meaningless: 5% of nothing is
  // nothing, and only the exact string "0" would ever be accepted. It used to trigger on the
  // BAND being small (v > 1e-9) rather than on the ANSWER being zero, which is the same test only
  // when the answer is zero. For a small non-zero answer it inverted the intent: with answer 5e-9
  // (a leakage current in amperes) and tol 5%, the real band is 2.5e-10, not > 1e-9, so the
  // fallback handed back 0.05 — ten million times the answer itself, accepting "0", "0,01" and
  // "-0,04" alike. No exercise in the bank is that small today, which is exactly why this had to
  // be keyed on the condition it means rather than on a threshold that happens to coincide.
  if (tol.pct != null) return answer === 0 ? Math.abs(tol.pct) / 100 : Math.abs(answer) * Math.abs(tol.pct) / 100
  return 0
}

export function gradeNumeric(input: string, answer: number, tol?: Tolerance, integerOnly?: boolean): boolean {
  const v = parseNum(input)
  if (v === null) return false
  if (integerOnly && !Number.isInteger(v)) return false
  return Math.abs(v - answer) <= tolValue(answer, tol) + 1e-9
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const s = new Set(a)
  return b.every(x => s.has(x))
}

// `answer` carries the selection: string[] for mcq/multi, the typed string for numeric,
// 'true'/'false' for truefalse.
export function isCorrect(ex: Exercise, answer: string[] | string): boolean {
  switch (ex.type) {
    case 'numeric':
      return typeof answer === 'string' && ex.answer != null && gradeNumeric(answer, ex.answer, ex.tolerance, ex.integerOnly)
    case 'truefalse':
      return String(answer) === String(ex.correct)
    case 'mcq':
    case 'multi': {
      const sel = Array.isArray(answer) ? answer : [answer]
      const correct = Array.isArray(ex.correct) ? ex.correct : []
      return sameSet(sel, correct)
    }
    default:
      return false
  }
}

// Human-readable correct answer for the feedback drawer.
export function correctText(ex: Exercise, lang: Lang): string {
  if (ex.type === 'numeric') {
    const t = ex.tolerance
    const tolStr = t?.abs != null ? ` ±${t.abs}` : t?.pct != null ? ` ±${t.pct}%` : ''
    return `${ex.answer}${tolStr}${ex.unit ? ' ' + ex.unit : ''}`
  }
  if (ex.type === 'truefalse') return String(ex.correct)
  const correct = Array.isArray(ex.correct) ? ex.correct : []
  return (ex.choices || [])
    .filter(c => correct.includes(c.id))
    .map(c => c.label[lang] ?? c.label.ro)
    .join(' · ')
}
