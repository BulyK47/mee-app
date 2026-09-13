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

// Capacitor's SystemBars plugin ships inside @capacitor/core, but calling it on the web throws
// "not implemented" — so this is a no-op anywhere but the packaged app, and the import is dynamic
// to keep the plugin out of the first paint.
function setNativeBarStyle(light: boolean) {
  import('@capacitor/core')
    .then(({ Capacitor, SystemBars, SystemBarsStyle }) => {
      if (!Capacitor.isNativePlatform()) return
      return SystemBars.setStyle({ style: light ? SystemBarsStyle.Light : SystemBarsStyle.Dark })
    })
    .catch(() => { /* cosmetic: the bars keep the system's own contrast */ })
}

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
  // The walkthrough replayed on demand from Settings. It is a separate flag rather than a reset of
  // the persisted `onboarded` one: clearing that would put the app back into the first-launch gate,
  // which asks for the language again and cannot be dismissed — wrong on both counts for somebody
  // who only wanted to re-read the tour.
  const [tour, setTour] = useState(false)

  // "Sistem" is the one theme setting whose answer lives outside the app, so it is resolved here
  // rather than stored: `meem_theme` keeps the PREFERENCE ('dark' | 'light' | 'system') and this
  // turns it into the palette actually painted. The subscription matters as much as the first
  // reading — Android flips to its dark theme on a schedule and at sunset, and an app that only
  // looked once sits in yesterday's palette until it is restarted.
  //
  // The default stays 'dark'. Making 'system' the default would repaint the app for every existing
  // student who never opened the theme setting, and most phones are in light mode — that is a
  // change to what the app looks like, not a new option, and it is not one to make on their behalf.
  const pref = game?.theme ?? 'dark'
  const [sysLight, setSysLight] = useState(() => {
    try { return !!window.matchMedia?.('(prefers-color-scheme: light)').matches } catch { return false }
  })
  useEffect(() => {
    if (pref !== 'system') return
    let mq: MediaQueryList
    try { mq = window.matchMedia('(prefers-color-scheme: light)') } catch { return }
    const read = () => setSysLight(mq.matches)
    read()
    // addListener is the pre-Chrome-79 spelling. The minimum WebView here is old enough to need it,
    // and a missing listener is invisible: the theme simply stops following the phone.
    if (mq.addEventListener) { mq.addEventListener('change', read); return () => mq.removeEventListener('change', read) }
    mq.addListener(read); return () => mq.removeListener(read)
  }, [pref])
  const theme = pref === 'system' ? (sysLight ? 'light' : 'dark') : pref

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
    // The meta tag above is what a browser reads; the packaged app ignores it. There, the app now
    // paints under the transparent status bar itself (see the safe-area block in index.css), so the
    // clock and the battery icon sit on the app's own background — and Capacitor picks their colour
    // from the PHONE's light/dark setting, not from this app's theme. A dark app on a phone in light
    // mode therefore got dark icons on a near-black strip: invisible. 'DARK' means "the bar is dark,
    // draw light icons", so the value tracks our theme rather than the system's.
    setNativeBarStyle(theme === 'light')
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
    <div className="safe-area mx-auto flex h-full max-w-md flex-col">
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
        {settings && <Settings onClose={() => setSettings(false)} onDiploma={() => { setSettings(false); setDiploma(true) }} onIntro={() => { setSettings(false); setTour(true) }} />}
        {recap && <RecapCard recap={recap} onClose={() => setRecap(null)} />}
        {memorator && <Memorator onClose={() => setMemorator(false)} />}
        {exam && <ExamPlayer key={examRun} exercises={exam} onClose={() => setExam(null)} onRetry={startExam} />}
        {diploma && <Diploma onClose={() => setDiploma(false)} />}
        {(!onboarded || tour) && <Onboarding tourOnly={onboarded} onDone={() => { setOnboarded(); setTour(false) }} />}
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
