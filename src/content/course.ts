import type { Course, World, Lesson, Exercise } from '../types'

// Auto-discover every world file dropped into ./worlds (the instructor adds a JSON file, no code
// change). Two locations are scanned:
//   ./worlds/*.json                    — the public demo bank that ships with the source repo
//   ../../content-private/worlds/*.json — the real question bank, kept out of the public repo
// The private folder is absent in a plain clone, and an empty glob is not an error, so the app
// builds and runs either way. A world marked "demo" is dropped as soon as a real one exists.
const files = {
  ...import.meta.glob('./worlds/*.json', { eager: true }),
  ...import.meta.glob('../../content-private/worlds/*.json', { eager: true }),
} as Record<string, unknown>

function fromModules(): World[] {
  return Object.values(files)
    .map(m => {
      const mod = m as { default?: unknown } & Record<string, unknown>
      return (mod.default ?? mod) as Record<string, unknown>
    })
    .filter(w => Array.isArray(w.lessons) && (w.lessons as unknown[]).length > 0)
    .map((w): World & { demo: boolean } => ({
      id: String(w.worldId),
      order: typeof w.order === 'number' ? w.order : 99,
      title: w.worldTitle as World['title'],
      // Each LESSON is checked too, not just the world. The documented authoring flow is "drop in a
      // JSON file, no code change", so a half-written lesson — `"exercises": []`, saved mid-edit —
      // is a normal thing to have on disk. The world-level test above passes it (the world does have
      // lessons), the cast then asserts a shape nobody verified, and the lesson renders in LearnTab
      // as a tappable "0 ex." node whose player opens on exercise 0 of an empty array. Dropping it
      // here means an unfinished lesson is simply not offered, which is what an author would expect.
      lessons: (w.lessons as unknown[]).filter(
        (l): l is Lesson => !!l && typeof l === 'object'
          && Array.isArray((l as Lesson).exercises) && (l as Lesson).exercises.length > 0,
      ),
      demo: w.demo === true,
    }))
    // …and a world whose every lesson was dropped is no longer a world
    .filter(w => w.lessons.length > 0)
    // a demo world is a placeholder: it disappears the moment the real bank supplies that module
    .filter((w, _i, list) => !w.demo || !list.some(o => !o.demo && o.id === w.id))
    .sort((a, b) => a.order - b.order)
}

// No hard-coded fallback unit: the committed demo world already covers the "no content" case, and a
// fallback file would have shipped real exercises inside the public repository.
export const COURSE: Course = { worlds: fromModules() }
export const ALL_LESSONS: Lesson[] = COURSE.worlds.flatMap(w => w.lessons)

// The mock exam draws single/multiple-choice questions from the whole course, up to ten. Both the
// picker and the card that advertises it read this, because they used to disagree: the card said
// "10 grile" as a literal while the picker took `slice(0, 10)` of whatever existed. With the full
// bank that is 173 questions and the two agree by luck; a plain clone of the public repository runs
// on the demo module alone, where the pool is FOUR — so the card promised ten and delivered four.
export const EXAM_POOL: Exercise[] =
  ALL_LESSONS.flatMap(l => l.exercises).filter(e => e.type === 'mcq' || e.type === 'multi')
export const EXAM_QUESTIONS = Math.min(10, EXAM_POOL.length)

export function findLesson(lessonId: string): Lesson | undefined {
  return ALL_LESSONS.find(l => l.id === lessonId)
}

export function findExercise(lessonId: string, exId: string): Exercise | undefined {
  return findLesson(lessonId)?.exercises.find(e => e.id === exId)
}
