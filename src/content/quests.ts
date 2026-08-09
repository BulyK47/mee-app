import type { Loc } from '../types'
import type { IconName } from '../components/icons'
// Deliberately no runtime imports here. scripts/check-content.mjs loads this file directly with
// Node to validate the quest strings, and Node cannot resolve anything that reaches ./course —
// that module uses import.meta.glob. So the caller decides whether the course is finished.

// Daily quests are DERIVED from the persisted `quests` counter — no per-quest tracking.
// The counter resets when the stored date is not today (see store.finishLesson).
export interface QuestState { date: string; lessons: number; xp: number; perfect: number; reviews: number; exam: number; claimed: string[] }
export interface QuestDef { id: string; icon: IconName; title: Loc; target: number; field: 'lessons' | 'xp' | 'perfect' | 'reviews' | 'exam'; reward: number }

export const DAILY_QUESTS: QuestDef[] = [
  { id: 'lessons3', icon: 'learn', title: { ro: 'Termină 3 lecții', en: 'Finish 3 lessons' }, target: 3, field: 'lessons', reward: 20 },
  { id: 'xp40', icon: 'bolt', title: { ro: 'Câștigă 40 XP', en: 'Earn 40 XP' }, target: 40, field: 'xp', reward: 20 },
  { id: 'perfect1', icon: 'target', title: { ro: 'O lecție perfectă', en: 'A perfect lesson' }, target: 1, field: 'perfect', reward: 15 },
]

// Once every lesson is finished, two of the three daily quests can never be completed again:
// finishLesson deliberately refuses to advance "finish 3 lessons" and "a perfect lesson" on a
// REPLAY, so the card would sit there permanently unclaimable. Only "earn 40 XP" survives, because
// replays still pay decayed XP. These take over at that point, and they ask for what a student who
// has finished the course should actually be doing: keeping the review queue down and rehearsing
// the exam. Both counters come from things the app already knows.
export const REVIEW_QUESTS: QuestDef[] = [
  { id: 'rev5', icon: 'loop', title: { ro: 'Revizuiește 5 greșeli', en: 'Review 5 mistakes' }, target: 5, field: 'reviews', reward: 20 },
  { id: 'xp40', icon: 'bolt', title: { ro: 'Câștigă 40 XP', en: 'Earn 40 XP' }, target: 40, field: 'xp', reward: 20 },
  { id: 'exam70', icon: 'certificate', title: { ro: 'Simulare de examen ≥ 70%', en: 'Exam simulation at 70%+' }, target: 70, field: 'exam', reward: 25 },
]

// Which set the card shows. `xp40` is deliberately in both — it is the one quest that keeps working
// either way, so the whole card does not change out from under the student on the day they finish.
export const questsFor = (courseIsComplete: boolean): QuestDef[] =>
  (courseIsComplete ? REVIEW_QUESTS : DAILY_QUESTS)

// Progress toward a quest for `today`; a stale (non-today) counter reads as 0.
export const questProgress = (q: QuestState, def: QuestDef, today: string): number =>
  q.date === today ? Math.min(def.target, q[def.field] ?? 0) : 0

export const questClaimed = (q: QuestState, id: string, today: string): boolean =>
  q.date === today && q.claimed.includes(id)
