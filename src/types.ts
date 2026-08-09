export type Lang = 'ro' | 'en'
export interface Loc { ro: string; en: string }
export interface Choice { id: string; label: Loc }
export interface Tolerance { abs?: number; pct?: number }

export interface Exercise {
  id: string
  type: 'mcq' | 'multi' | 'truefalse' | 'numeric'
  points: number
  prompt: Loc
  explanation?: Loc
  hint?: Loc
  choices?: Choice[]
  correct?: string[] | boolean
  answer?: number
  unit?: string
  integerOnly?: boolean
  tolerance?: Tolerance
  source?: string
  tags?: string[]
  media?: { hasImage?: boolean; image?: string; alt?: Loc; note?: string }
  visual?: { kind: string; params?: Record<string, unknown> }
  /** Set on synthetic review exercises so mistakes can be cleared against the original lesson/exercise. */
  origin?: { lessonId: string; exId: string }
}

export interface Lesson {
  id: string
  unitId?: string
  order: number
  title: Loc
  objective?: Loc
  xp: number
  coins: number
  exercises: Exercise[]
}

export interface World {
  id: string
  order: number
  title: Loc
  lessons: Lesson[]
}

export interface Course {
  worlds: World[]
}

/** Legacy single-unit shape (the pilot draft). */
export interface Unit {
  unitId: string
  unitTitle: Loc
  lessons: Lesson[]
}
