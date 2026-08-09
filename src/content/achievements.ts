import type { Loc } from '../types'
import type { IconName } from '../components/icons'
import { ALL_LESSONS } from './course'
import { CURRICULUM, isModuleComplete, earnedEquip } from './modules'
import { levelInfo } from '../level'

// Achievements are DERIVED from persisted state — no extra tracking needed.
export interface AchState { xp: number; completed: string[]; best: Record<string, number>; inventory: string[]; streak: number }
export interface Achievement { id: string; icon: IconName; title: Loc; desc: Loc; done: (s: AchState) => boolean }

// Keyed by lesson id, so it needs the same guard `doneLessons` below already has: an id left over
// from a renamed or removed lesson stays in `best` forever (and arrives whole through a backup
// import), and counting it handed out "5 perfect lessons" for lessons the course no longer has.
// The sibling case was already fixed for `completed`; this was the half of it left behind.
// Exported so the diploma counts the same way. It used to have its own line —
// `Object.values(best).filter(v => v >= 100).length`, without the filter — and the two screens
// disagreed for the same student: rename one lesson id in a content update and Achievements says
// 15 perfect lessons while the certificate says 16, naming one that no longer exists. Two counters
// for one quantity is the defect; sharing this one is the fix.
export const perfect = (b: Record<string, number>) =>
  Object.entries(b).filter(([id, v]) => v >= 100 && ALL_LESSONS.some(l => l.id === id)).length
// Owning a piece of gear means the same thing here as everywhere else in the app: bought OR won
// by finishing its module. LabTab and LearnTab both test `inventory ∪ earnedEquip`, and 14 of the
// 15 modules hand out a free instrument — so counting only `inventory` left a student who had
// completed eight modules looking at eight instruments on their bench and a locked badge that
// said "Own 5 pieces of gear".
const ownedCount = (s: AchState) => new Set([...s.inventory, ...earnedEquip(s.completed)]).size
const doneLessons = (c: string[]) => c.filter(id => ALL_LESSONS.some(l => l.id === id)).length

export const ACHIEVEMENTS: Achievement[] = [
  // doneLessons, not completed.length: every other achievement here counts lessons that still
  // exist, and this one awarding "first step" for an id left over from a renamed lesson was the
  // odd one out.
  { id: 'first', icon: 'star', title: { ro: 'Primul pas', en: 'First step' }, desc: { ro: 'Termină prima lecție', en: 'Finish your first lesson' }, done: s => doneLessons(s.completed) >= 1 },
  { id: 'ten', icon: 'learn', title: { ro: 'Studios', en: 'Diligent' }, desc: { ro: 'Termină 10 lecții', en: 'Finish 10 lessons' }, done: s => doneLessons(s.completed) >= 10 },
  { id: 'perfect1', icon: 'check', title: { ro: 'Fără greșeală', en: 'Flawless' }, desc: { ro: 'O lecție 100%', en: 'A 100% lesson' }, done: s => perfect(s.best) >= 1 },
  { id: 'perfect5', icon: 'target', title: { ro: 'Precizie', en: 'Precision' }, desc: { ro: '5 lecții perfecte', en: '5 perfect lessons' }, done: s => perfect(s.best) >= 5 },
  { id: 'streak7', icon: 'flame', title: { ro: 'O săptămână', en: 'One week' }, desc: { ro: 'Serie de 7 zile', en: '7-day streak' }, done: s => s.streak >= 7 },
  { id: 'streak30', icon: 'flame', title: { ro: 'O lună', en: 'One month' }, desc: { ro: 'Serie de 30 de zile', en: '30-day streak' }, done: s => s.streak >= 30 },
  { id: 'module', icon: 'trophy', title: { ro: 'Maestru de modul', en: 'Module master' }, desc: { ro: 'Termină un modul întreg', en: 'Complete a whole module' }, done: s => CURRICULUM.some(m => isModuleComplete(m.id, s.completed)) },
  { id: 'collector', icon: 'lab', title: { ro: 'Colecționar', en: 'Collector' }, desc: { ro: 'Deține 5 echipamente', en: 'Own 5 pieces of gear' }, done: s => ownedCount(s) >= 5 },
  { id: 'level10', icon: 'bolt', title: { ro: 'Nivel 10', en: 'Level 10' }, desc: { ro: 'Ajunge la nivelul 10', en: 'Reach level 10' }, done: s => levelInfo(s.xp).level >= 10 },
  { id: 'half', icon: 'ruler', title: { ro: 'La jumătate', en: 'Halfway' }, desc: { ro: 'Jumătate din curs', en: 'Half the course' }, done: s => ALL_LESSONS.length > 0 && doneLessons(s.completed) >= ALL_LESSONS.length / 2 },
  { id: 'all', icon: 'gauge', title: { ro: 'Curs complet', en: 'Course complete' }, desc: { ro: 'Toate lecțiile terminate', en: 'All lessons done' }, done: s => ALL_LESSONS.length > 0 && ALL_LESSONS.every(l => s.completed.includes(l.id)) },
]

export const achievedCount = (s: AchState) => ACHIEVEMENTS.filter(a => a.done(s)).length
