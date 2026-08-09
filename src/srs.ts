// Lightweight SM-2-style spaced repetition for missed exercises.
// A card is created/reset the moment an exercise is answered wrong (due today),
// and each spaced success pushes its due date further out. After GRADUATE_REPS
// successful reviews the card is considered mastered and leaves the queue.

export interface SrsCard { ease: number; interval: number; reps: number; due: string; lapses: number }

export const GRADUATE_REPS = 4

const pad = (n: number) => String(n).padStart(2, '0')
const dayStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Date-only arithmetic in the user's LOCAL calendar (matches store.today()).
export const addDays = (date: string, n: number): string => {
  const t = new Date(date + 'T00:00:00'); t.setDate(t.getDate() + n); return dayStr(t)
}
export const daysBetween = (from: string, to: string): number =>
  Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86400000)

export const freshCard = (today: string): SrsCard => ({ ease: 2.5, interval: 0, reps: 0, due: today, lapses: 0 })

// Ease is stepped by 0.1 and 0.2, neither of which is exact in binary, so it accumulates noise:
// 2.4 - 0.2 stores as 2.1999999999999997. Measured over the 23 reachable values, 19 drift, and in
// three cases the drift changes a scheduled interval by a whole day (25 × 2.3000000000000007 rounds
// to 58 instead of 57). It also lands verbatim in the exported progress file. Snapped to 2 decimals
// at every step, which is more precision than a 0.1 grade increment can carry anyway.
const ease2 = (v: number) => Math.round(v * 100) / 100

// Successful review: grow the interval (1d → 3d → interval·ease) and nudge ease up.
export const gradeUp = (c: SrsCard, today: string): SrsCard => {
  const reps = c.reps + 1
  const interval = c.reps === 0 ? 1 : c.reps === 1 ? 3 : Math.max(1, Math.round(c.interval * ease2(c.ease)))
  const ease = ease2(Math.min(2.8, c.ease + 0.1))
  return { ease, interval, reps, due: addDays(today, interval), lapses: c.lapses }
}
// Lapse: reset to due-today and shrink ease so it comes back sooner in future.
export const gradeDown = (c: SrsCard, today: string): SrsCard => ({
  ease: ease2(Math.max(1.3, c.ease - 0.2)), interval: 0, reps: 0, due: today, lapses: c.lapses + 1,
})

// A card is due when its due date is today or in the past; a missing card counts as due.
export const isDue = (c: SrsCard | undefined, today: string): boolean => !c || daysBetween(today, c.due) <= 0

export const srsKey = (r: { lessonId: string; exId: string }): string => `${r.lessonId}:${r.exId}`

// Filter a list of mistake refs down to the ones due for review today.
export function dueRefs<T extends { lessonId: string; exId: string }>(refs: T[], cards: Record<string, SrsCard>, today: string): T[] {
  return refs.filter(r => isDue(cards[srsKey(r)], today))
}

// Soonest upcoming due date among not-yet-due cards for the given refs (or null).
export function nextDue<T extends { lessonId: string; exId: string }>(refs: T[], cards: Record<string, SrsCard>, today: string): string | null {
  let best: string | null = null
  for (const r of refs) {
    const c = cards[srsKey(r)]
    if (!c || daysBetween(today, c.due) <= 0) continue
    if (best === null || c.due < best) best = c.due
  }
  return best
}
