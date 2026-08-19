import { useState, useEffect, lazy, Suspense } from 'react'
import { COURSE, findExercise, EXAM_POOL, EXAM_QUESTIONS } from './content/course'
import { recapFor, type Recap } from './content/recaps'
import type { Lesson, Exercise } from './types'
import { useT } from './i18n'
import { useGame, localToday } from './store'
import { dueRefs } from './srs'
import Hud from './components/Hud'
import LearnTab from './components/LearnTab'
import { Icon, type IconName } from './components/icons'

// Code-split the heavy overlays / second tab so the first paint (Learn) stays lean.
const LabTab = lazy(() => import('./components/LabTab'))
const LessonPlayer = lazy(() => import('./components/LessonPlayer'))
const Settings = lazy(() => import('./components/Settings'))
const RecapCard = lazy(() => import('./components/RecapCard'))
const Memorator = lazy(() => import('./components/Memorator'))
const ExamPlayer = lazy(() => import('./components/ExamPlayer'))
const Onboarding = lazy(() => import('./components/Onboarding'))
const Diploma = lazy(() => import('./components/Diploma'))

export default function App() {
  const { t } = useT()
  const game = useGame()
  const [tab, setTab] = useState<'learn' | 'lab'>('learn')
  const [active, setActive] = useState<Lesson | null>(null)
  const [review, setReview] = useState<Lesson | null>(null)
  const [settings, setSettings] = useState(false)
  const [recap, setRecap] = useState<Recap | null>(null)
  const [memorator, setMemorator] = useState(false)
  const [exam, setExam] = useState<Exercise[] | null>(null)
  const [examRun, setExamRun] = useState(0) // bumped on each new exam so ExamPlayer remounts fresh
  const [diploma, setDiploma] = useState(false)
  const theme = game?.theme ?? 'dark'

  useEffect(() => {
    const root = document.documentElement
    // Any element whose transition covers background-color keeps its OLD background when the
    // theme flips — the transition machinery latches the value it had and never repaints, so
    // after switching to light the progress bars and the Settings toggles stayed phosphor green
    // until the app was reloaded. Suppressing transitions across the swap, with a forced reflow
    // in between so the new values latch while they are off, fixes every such element at once
    // instead of hunting them one by one.
    root.classList.add('theme-switching')
    root.dataset.theme = theme
    void root.offsetHeight
    const t = setTimeout(() => root.classList.remove('theme-switching'), 60)
    const m = document.querySelector('meta[name="theme-color"]')
    if (m) m.setAttribute('content', theme === 'light' ? '#F4F7F5' : '#0A0E12')
    return () => clearTimeout(t)
  }, [theme])

  // Root guard: during Vite HMR the store module can be re-evaluated, briefly making the
  // context null; return nothing until it recovers. In production the synchronous provider
  // makes this branch unreachable, so it never blanks the real app.
  if (!game) return null
  const { liveMistakes, srs, onboarded, setOnboarded } = game

  function startReview() {
    // Prefer the cards due today; if nothing is due, allow practising the whole backlog.
    const due = dueRefs(liveMistakes, srs, localToday())
    const refs = due.length ? due : liveMistakes
    const exercises: Exercise[] = []
    for (const r of refs) {
      const e = findExercise(r.lessonId, r.exId)
      if (e) exercises.push({ ...e, origin: r })
    }
    if (!exercises.length) return
    setReview({ id: '__review__', order: 0, title: { ro: 'Greșelile mele', en: 'My Mistakes' }, xp: 0, coins: 0, exercises })
  }

  function startExam() {
    // A mock multiple-choice exam: up to 10 random single/multiple-choice questions from any module.
    // EXAM_POOL / EXAM_QUESTIONS live in course.ts so the card that advertises the exam and the
    // picker that builds it cannot drift apart — see the note there.
    const pool: Exercise[] = EXAM_POOL
    // Fisher-Yates, not sort(() => Math.random() - 0.5). A random comparator is not a shuffle:
    // the sort algorithm only makes the comparisons it needs, so elements drift a little from
    // where they started instead of being placed uniformly. Measured on this pool (173 questions,
    // 40 000 draws) it pulled 8.2% of picks from the first sixth and 3.1% from the last — the exam
    // over-tested M01-M02 and under-tested M14-M15, which is backwards for a whole-course mock.
    //
    // The shuffle is uniform now, but the POOL is not evenly spread across the course, so a
    // question is still six times likelier to come from M04 (31 in the pool) than from M11 or M13
    // (5 each). Over 200 000 simulated papers that leaves M11 and M13 absent from ~74% of them.
    // Left as is deliberately: how heavily each module should be weighted is a decision about the
    // real exam, not about this code. Balancing it means stratifying the draw across modules.
    const shuffled = [...pool]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const picked = shuffled.slice(0, EXAM_QUESTIONS)
    if (picked.length) { setExam(picked); setExamRun(n => n + 1) }
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <Hud onSettings={() => setSettings(true)} onMemorator={() => setMemorator(true)} />
      <main className="flex-1 overflow-y-auto">
        {tab === 'learn'
          ? <LearnTab course={COURSE} onStart={setActive} onReview={startReview} onRecap={wid => { const r = recapFor(wid); if (r) setRecap(r) }} onExam={startExam} />
          : <Suspense fallback={null}><LabTab /></Suspense>}
      </main>
      <nav className="grid grid-cols-2 border-t border-border bg-surface">
        <TabBtn active={tab === 'learn'} onClick={() => setTab('learn')} label={t('learn')} icon="learn" />
        <TabBtn active={tab === 'lab'} onClick={() => setTab('lab')} label={t('lab')} icon="lab" />
      </nav>
      <Suspense fallback={null}>
        {active && <LessonPlayer lesson={active} onExit={() => setActive(null)} onGoLab={() => { setActive(null); setTab('lab') }} />}
        {review && <LessonPlayer lesson={review} isReview onExit={() => setReview(null)} onGoLab={() => setReview(null)} />}
        {settings && <Settings onClose={() => setSettings(false)} onDiploma={() => { setSettings(false); setDiploma(true) }} />}
        {recap && <RecapCard recap={recap} onClose={() => setRecap(null)} />}
        {memorator && <Memorator onClose={() => setMemorator(false)} />}
        {exam && <ExamPlayer key={examRun} exercises={exam} onClose={() => setExam(null)} onRetry={startExam} />}
        {diploma && <Diploma onClose={() => setDiploma(false)} />}
        {!onboarded && <Onboarding onDone={setOnboarded} />}
      </Suspense>
    </div>
  )
}

function TabBtn({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: IconName }) {
  // Which of the two tabs you are on was carried by `text-primary` and nothing else — colour alone,
  // invisible to a screen reader and to anyone who cannot separate those two greens. aria-current
  // is the right attribute here rather than aria-pressed: these are not toggles, they are the two
  // destinations of the app's own navigation, and only one is ever current.
  return (
    <button onClick={onClick} aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center gap-1 py-2 text-xs font-medium transition ${active ? 'text-primary' : 'text-faint hover:text-muted'}`}>
      <Icon name={icon} size={22} />
      {label}
    </button>
  )
}
