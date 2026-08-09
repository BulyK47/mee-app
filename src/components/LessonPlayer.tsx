import { useEffect, useRef, useState } from 'react'
import type { Lesson } from '../types'
import { useGame, HEART_REFILL_COST, MAX_HEARTS } from '../store'
import { useT, L } from '../i18n'
import { isCorrect, parseNum } from '../grader'
import { Icon } from './icons'
import { Formula } from '../ui/Formula'
import { playCorrect, playWrong, playLevelUp, playChest } from '../ui/audio'
import { vibrate } from '../ui/haptics'
import { useCountUp } from '../ui/motion'
import { useDismiss } from '../ui/useDismiss'
import { ConfirmDialog } from '../ui/Confirm'
import { levelInfo } from '../level'
import { Keypad } from '../ui/Keypad'
import { QuestionVisual } from '../visuals/QuestionVisual'
import { COURSE } from '../content/course'
import { moduleDef } from '../content/modules'
import { EQUIPMENT } from '../content/equipment'

export default function LessonPlayer({ lesson, onExit, onGoLab, isReview = false }: { lesson: Lesson; onExit: () => void; onGoLab: () => void; isReview?: boolean }) {
  const { t, lang } = useT()
  const { finishLesson, gradeMistake, loseHeart, studyMode, hearts, sound, haptics, xp: curXp, plays, completed, inventory, coins, buyHearts, setStudyMode } = useGame()
  const [idx, setIdx] = useState(0)
  const [sel, setSel] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [hinted, setHinted] = useState(false)
  const [eliminated, setEliminated] = useState<string[]>([])
  const [hintTip, setHintTip] = useState<string | null>(null)
  const [solved, setSolved] = useState(false)
  const [lastWrong, setLastWrong] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [finished, setFinished] = useState(false)
  const [totals, setTotals] = useState({ xp: 0, coins: 0, perfect: false, leveled: false, level: 1, replay: false, unlocked: '' })
  const [comboBadge, setComboBadge] = useState<{ n: number; k: number } | null>(null)
  const [wrongK, setWrongK] = useState(0)
  const [askQuit, setAskQuit] = useState(false)

  const earnedXp = useRef(0), earnedCoins = useRef(0), combo = useRef(0), penalized = useRef(0), fxK = useRef(0)

  const ex = lesson.exercises[idx]
  const total = lesson.exercises.length
  const correct = Array.isArray(ex.correct) ? ex.correct : []
  // "there is a number in the box", not "the box is not empty". Pressing ± on an empty readout
  // leaves a lone "-", which used to arm Verifică; grading it cost a heart, logged an SRS lapse
  // and capped the eventual XP at 40% — three penalties for something that is not an answer.
  // Partial entries still count: "12," parses as 12, so the button stays live while typing.
  const hasAnswer = ex.type === 'numeric' ? parseNum(input) !== null : sel.length > 0
  const progress = ((idx + (solved ? 1 : 0)) / total) * 100
  const wrongRemaining = (ex.choices ?? []).filter(c => !correct.includes(c.id) && !eliminated.includes(c.id)).length
  const canHint = !solved && (ex.hint ? !hinted : ex.type === 'mcq' || ex.type === 'multi' ? wrongRemaining > 1 : ex.type === 'numeric' ? !hinted : false)
  const ro = lang === 'ro'

  // Leaving part-way through throws away the whole run: finishLesson only fires on the last
  // question, so the XP, the Volți and the completion all go, and on a phone the ✕ sits under the
  // thumb right next to the answers while Android's Back is one reflex away. So ask first — but
  // only when there is something to lose. Nothing is at risk before the first answer, on the
  // results screen, or at the out-of-hearts wall where the run has already ended, and asking there
  // would just be a door that sticks.
  const outOfHearts = !studyMode && hearts <= 0
  // `lastWrong` belongs here too: a first answer that was wrong is still an answer. Without it the
  // student who has just been told "Mai încearcă" taps ✕ and the lesson vanishes without a word,
  // which is neither what was asked for nor what the behaviour was described as.
  const atRisk = !finished && !outOfHearts && (idx > 0 || solved || lastWrong)
  const quit = () => (atRisk ? setAskQuit(true) : onExit())
  useDismiss(quit)

  function numericTip() {
    const p: string[] = []
    if (ex.integerOnly) p.push(ro ? 'Răspuns întreg.' : 'Whole number.')
    if (ex.unit) p.push((ro ? 'Unitate: ' : 'Unit: ') + ex.unit)
    if (ex.tolerance?.abs != null) p.push('±' + ex.tolerance.abs)
    return p.join('  ·  ')
  }
  // Method hint — points to the formula / calculation logic, never toward the answer value.
  //
  // It used to end with "Vezi 📖 Recapitulare pentru formule", which is advice the student cannot
  // act on: the recap and the formula sheet both live behind the HUD, and the lesson covers it, so
  // the only way there is to abandon the run. Unreachable today anyway — every one of the 305
  // exercises has an authored hint and both call sites prefer it — but it stands as the fallback
  // for the first numeric exercise added without one, and a fallback should not send anyone
  // somewhere they cannot go. The advice is self-contained now, and numericTip() still appends the
  // unit and tolerance, which is the concrete part.
  function methodHint() {
    const base = ro
      ? 'Pornește de la relația de calcul și verifică unitățile — nu ghici valoarea.'
      : "Start from the formula and check the units — don't guess the value."
    const tip = numericTip()
    return tip ? `${base}  ·  ${tip}` : base
  }

  function useHint() {
    if (!canHint) return
    setHinted(true)
    if (ex.hint) { setHintTip(L(ex.hint, lang)); return }
    if (ex.type === 'mcq' || ex.type === 'multi') {
      const w = (ex.choices ?? []).find(c => !correct.includes(c.id) && !eliminated.includes(c.id))
      if (w) setEliminated(e => [...e, w.id])
      setHintTip(ro ? 'Am eliminat o variantă greșită.' : 'Removed one wrong option.')
    } else if (ex.type === 'numeric') {
      setHintTip(methodHint())
    }
  }

  // `solved` and `finished` are state, so two taps inside one tick both read the old value and both
  // run. Measured on the last question: three taps on Continuă gave 255 XP instead of 85, 132 Volți
  // instead of 44, counted three plays, and finished the whole day's quests from one lesson. These
  // refs flip synchronously, so the second tap finds the door already shut.
  // The latch is a ref so check() can test it synchronously within one tick, and ALSO state so the
  // button can look the way it behaves. Without the state half, a numeric answer that was graded
  // wrong left the input in place: hasAnswer stayed true, Verifică kept its full active styling,
  // and pressing it did nothing — no sound, no message, no heart. Being inert is the correct
  // behaviour there (the student has to change the answer first, and touching it calls reopen);
  // looking live while inert is not.
  const gradingRef = useRef(false)
  const [graded, setGraded] = useState(false)
  const finishedRef = useRef(false)

  function check() {
    if (gradingRef.current) return   // a repeated tap on Verifică would grade the same answer twice:
    gradingRef.current = true        // double XP when right, two hearts for one mistake when wrong
    setGraded(true)
    const answer = ex.type === 'numeric' ? input : ex.type === 'truefalse' ? sel[0] : sel
    const ok = isCorrect(ex, answer as string | string[])
    const ref = ex.origin ?? { lessonId: lesson.id, exId: ex.id }
    if (ok) {
      const pen = hinted
      if (!pen) { setCorrectCount(c => c + 1); combo.current += 1 } else { combo.current = 0; penalized.current += 1 }
      const gained = pen ? Math.round(ex.points * 0.4) : ex.points
      const bonus = !pen && combo.current % 5 === 0 ? 5 : 0
      earnedXp.current += gained + bonus
      earnedCoins.current += Math.round(gained / 2)
      if (!pen) gradeMistake(ref, true)
      if (sound) playCorrect()
      if (haptics) vibrate([12, 40, 12])
      if (!pen && combo.current >= 2) setComboBadge({ n: combo.current, k: ++fxK.current })
      setSolved(true); setLastWrong(false); setHintTip(null)
    } else {
      setHinted(true); combo.current = 0
      gradeMistake(ref, false)
      if (!studyMode) loseHeart()
      if (sound) playWrong()
      if (haptics) vibrate([25, 40, 25])
      setWrongK(k => k + 1)
      if (ex.type === 'mcq' || ex.type === 'multi') {
        const wrongPicked = sel.filter(id => !correct.includes(id))
        if (wrongPicked.length) setEliminated(e => Array.from(new Set([...e, ...wrongPicked])))
        setSel([])
        setHintTip(ex.hint ? L(ex.hint, lang) : ro ? 'Nu e corect. Am tăiat varianta aleasă — mai încearcă.' : 'Not right. Crossed out your pick — try again.')
      } else if (ex.type === 'numeric') {
        setHintTip(ex.hint ? L(ex.hint, lang) : methodHint())
      } else {
        // truefalse. The selection is cleared for the same reason the mcq branch clears it: while
        // it survives, `hasAnswer` stays true, so Verifică renders in its full active styling — but
        // `gradingRef` is still latched and only `reopen()` releases it, and reopen runs on a
        // CHANGE of answer. With two options and the wrong one still selected, "change your answer"
        // and "press the button again" look equally reasonable, and pressing does nothing at all:
        // no sound, no heart, no message. A button that looks live and is inert is worse than a
        // disabled one, which at least says so. Clearing puts it back in its dimmed state and
        // makes the next tap on either option the thing that moves the exercise forward.
        setSel([])
        setHintTip(ex.hint ? L(ex.hint, lang) : ro ? 'Mai gândește-te.' : 'Think again.')
      }
      setLastWrong(true)
    }
  }

  function next() {
    if (idx + 1 < total) {
      reopen()
      setIdx(idx + 1); setSel([]); setInput(''); setSolved(false); setLastWrong(false); setHinted(false); setEliminated([]); setHintTip(null)
    } else {
      if (finishedRef.current) return   // the tap that ends the lesson must only land once
      finishedRef.current = true
      const perfect = penalized.current === 0
      // Anti-farm: each replay of a lesson gives 75% less XP than the previous one
      // (0.25^n) and no Volți / no chest, so replay XP quickly becomes irrelevant.
      const priorPlays = plays[lesson.id] || 0
      const replay = !isReview && priorPlays > 0
      let xp = earnedXp.current + (perfect ? 15 : 0)
      let coins = earnedCoins.current + (perfect ? 10 : 0)
      if (replay) { xp = Math.round(xp * Math.pow(0.25, priorPlays)); coins = 0 }
      const accuracy = Math.round((correctCount / total) * 100)
      const level = levelInfo(curXp + xp).level
      const leveled = !isReview && level > levelInfo(curXp).level
      // If this lesson is the one that completes its module, surface the free instrument
      // it unlocks — otherwise the reward lands in My Lab silently and goes unnoticed.
      let unlocked = ''
      const world = COURSE.worlds.find(w => w.lessons.some(l => l.id === lesson.id))
      const mod = world ? moduleDef(world.id) : undefined
      if (!isReview && world && mod?.reward && !inventory.includes(mod.reward)) {
        const was = world.lessons.every(l => completed.includes(l.id))
        const now = world.lessons.every(l => l.id === lesson.id || completed.includes(l.id))
        const eq = EQUIPMENT.find(e => e.id === mod.reward)
        if (!was && now && eq) unlocked = L(eq.name, lang)
      }
      if (!isReview) finishLesson(lesson.id, xp, coins, accuracy)
      setTotals({ xp, coins, perfect, leveled, level, replay, unlocked })
      setFinished(true)
    }
  }

  // Changing the answer re-opens the gate. Releasing it at the end of check() instead would defeat
  // the guard entirely — both taps of a same-tick pair would still get through — and a retry always
  // requires touching the answer first anyway: a wrong multiple-choice pick is cleared, so Verifică
  // is disabled until something is selected again.
  const reopen = () => { gradingRef.current = false; setGraded(false) }

  function toggle(id: string) {
    if (solved || eliminated.includes(id)) return
    reopen()
    setLastWrong(false)
    if (ex.type === 'multi') setSel(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))
    else setSel([id])
  }

  if (finished) {
    const accuracy = Math.round((correctCount / total) * 100)
    return <ResultsScreen isReview={isReview} accuracy={accuracy} xp={totals.xp} coins={totals.coins} perfect={totals.perfect} leveled={totals.leveled} level={totals.level} replay={totals.replay} unlocked={totals.unlocked} onGoLab={onGoLab} onExit={onExit} />
  }

  // Out of hearts: the run really stops here. Rendering this instead of the question is what makes
  // the mechanic mean anything — otherwise the counter hits zero and the lesson simply carries on.
  if (!studyMode && hearts <= 0) {
    return <OutOfHearts coins={coins} onBuy={buyHearts} onStudyMode={() => setStudyMode(true)} onExit={onExit} />
  }

  return (
    <div className="anim-sheet fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-bg" role="dialog" aria-modal="true"
      aria-label={isReview ? (lang === 'ro' ? 'Greșelile mele' : 'My mistakes') : L(lesson.title, lang)}>
      {comboBadge && (
        <div key={comboBadge.k} onAnimationEnd={() => setComboBadge(null)}
          className="anim-combo pointer-events-none absolute left-1/2 top-16 z-30 rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-fg" style={{ boxShadow: '0 0 16px -2px var(--color-phosphor-glow)' }}>
          {ro ? 'Serie' : 'Combo'} ×{comboBadge.n}
        </div>
      )}
      <header className="flex items-center gap-3 px-4 py-3">
        <button onClick={quit} className="relative -ml-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-faint hover:bg-surface-2 hover:text-fg before:absolute before:-inset-0.5 before:content-['']" aria-label={t('exit')}><Icon name="close" size={20} /></button>
        <ConfirmDialog open={askQuit} danger
          message={isReview
            ? (ro ? 'Închizi recapitularea? Progresul din această sesiune se pierde.' : 'Quit the review? Your progress in this session will be lost.')
            : (ro ? 'Închizi lecția? Progresul din această lecție se pierde.' : 'Quit the lesson? Your progress in this lesson will be lost.')}
          confirmLabel={t('exit')} onConfirm={onExit} onCancel={() => setAskQuit(false)} />
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-panel">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%`, boxShadow: '0 0 8px -1px var(--color-phosphor-glow)' }} />
        </div>
        {/* Counted and localised, same as the HUD: these icons carry no text, so aria-label="hearts"
            told a screen-reader user the row existed and nothing else. This is the copy that
            matters most — it is the one on screen while the hearts are actually being spent, and
            the hard-coded 5 below is MAX_HEARTS by another name. */}
        {!studyMode && (
          <span className="flex items-center gap-0.5 text-danger" role="img"
            aria-label={lang === 'ro' ? `${hearts} din ${MAX_HEARTS} inimi` : `${hearts} of ${MAX_HEARTS} hearts`}>
            {Array.from({ length: MAX_HEARTS }).map((_, i) => <Icon key={i} name="heart" size={13} className={i < hearts ? '' : 'opacity-25'} />)}
          </span>
        )}
        <span className="font-mono text-xs tabular-nums text-faint">{idx + 1}/{total}</span>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <p className="mb-2 mt-2 text-base font-medium leading-relaxed text-fg"><Formula>{L(ex.prompt, lang)}</Formula></p>
        {ex.type === 'multi' && <p className="mb-3 text-xs font-medium text-accent">{t('selectAll')}</p>}
        {ex.type === 'mcq' && <p className="mb-3 text-xs text-faint">{t('selectOne')}</p>}
        <QuestionVisual visual={ex.visual} prompt={L(ex.prompt, lang)} image={ex.media?.image} alt={ex.media?.alt ? L(ex.media.alt, lang) : ''} lang={lang} />


        {ex.type === 'numeric' ? (
          <Keypad value={input} onChange={v => { reopen(); setInput(v) }} unit={ex.unit} disabled={solved} tone={solved ? 'ok' : lastWrong ? 'bad' : 'idle'} integerOnly={ex.integerOnly} />
        ) : ex.type === 'truefalse' ? (
          <div className="mt-2 grid grid-cols-2 gap-3">
            {[['true', t('trueL')], ['false', t('falseL')]].map(([val, label]) => (
              <ChoiceBtn key={val} state={cState(solved, sel.includes(val), false)} onClick={() => toggle(val)} label={label} />
            ))}
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-2.5">
            {(ex.choices ?? []).map(c => (
              <ChoiceBtn key={c.id} state={cState(solved, sel.includes(c.id), eliminated.includes(c.id))} onClick={() => toggle(c.id)} label={L(c.label, lang)} />
            ))}
          </div>
        )}

        {/* The wrapper is always in the DOM and empty until there is something to say: a live
            region that appears together with its text is routinely missed, because the screen
            reader has nothing to watch at the moment the text arrives. */}
        <div role="status" aria-live="polite">
          {hintTip && <div className="mt-3 rounded-xl border border-warn/40 bg-surface-2 px-3 py-2 text-sm text-warn"><Formula>{hintTip}</Formula></div>}
        </div>
        {/* The hint text was a 20 px-tall target — under half a thumb — and it is what a student
            reaches for when already stuck. The ::before extends the tap area to 44 px without
            taking any space, so nothing on the screen moves. */}
        {/* The cost is spelled out because pressing this is a real trade and nothing said so: a hint
            caps the question at 40% of its points, breaks the combo, drops the answer out of the
            accuracy count and forfeits the perfect-lesson bonus. The button appears only BEFORE the
            first attempt (a wrong answer sets `hinted` too and reveals the hint anyway), so this is
            exactly the moment the student is choosing between guessing and asking — the app states
            every other condition out loud ("Volți insuficienți", "Inimi complete"); this was the
            one button that quietly charged for itself. */}
        {canHint && (
          <button onClick={useHint} className="relative mt-3 flex items-center gap-1 text-sm font-medium text-warn hover:brightness-110 before:absolute before:-inset-y-3 before:-inset-x-2 before:content-['']">
            <Icon name="learn" size={16} /> {t('hint')}
            <span className="text-xs font-normal text-faint">· {ro ? 'punctaj redus' : 'reduced score'}</span>
          </button>
        )}
      </div>

      <footer className="border-t border-border">
        {/* The verdict is the whole point of pressing Verifică — it has to be spoken, not only
            shown. One persistent region holds whichever of the two applies. */}
        <div role="status" aria-live="polite">
          {solved && (
            <div className="anim-slideup bg-surface-2 px-5 py-3">
              <p className="text-sm font-semibold text-primary">{t('correct')}</p>
              {ex.explanation && <p className="mt-1 text-xs text-muted"><Formula>{L(ex.explanation, lang)}</Formula></p>}
            </div>
          )}
          {!solved && lastWrong && (
            <div key={wrongK} className="anim-shake bg-surface-2 px-5 py-2"><p className="text-sm font-semibold text-danger">{t('wrong')}</p></div>
          )}
        </div>
        <div className="px-5 py-3">
          {solved ? (
            <button onClick={next} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-fg hover:brightness-110">{t('cont')}</button>
          ) : (
            <button onClick={check} disabled={!hasAnswer || graded} className={`w-full rounded-xl py-3 font-semibold ${hasAnswer && !graded ? 'bg-primary text-primary-fg hover:brightness-110' : 'cursor-not-allowed bg-panel text-faint'}`}>{t('check')}</button>
          )}
        </div>
      </footer>
    </div>
  )
}

type CState = 'idle' | 'sel' | 'correct' | 'elim'
function cState(solved: boolean, selected: boolean, eliminated: boolean): CState {
  if (eliminated) return 'elim'
  if (solved && selected) return 'correct'
  if (selected) return 'sel'
  return 'idle'
}

// No a)/b)/c) label: the tick box carries the selection and the text carries the meaning, which is
// all a student needs to answer. The letters existed only so that explanations could say "Varianta
// d e falsă" — a coupling that cost more than it gave. It let explanations drift out of sync with
// their own key unnoticed — one named two options for a key that held a different pair, another
// described the wrong option as the correct one — because a letter is a pointer with nothing
// checking it. Explanations now name the option by its TEXT, which cannot drift: if the wording is
// wrong it is wrong on its face. (No exercise id or key is quoted here on purpose: this file is
// published, the question bank is not, and option ids stay in display order.)
function ChoiceBtn({ state, onClick, label }: { state: CState; onClick: () => void; label: string }) {
  const cls = {
    idle: 'border-border bg-surface text-fg hover:border-accent',
    sel: 'border-accent bg-accent/10 text-fg',
    correct: 'border-primary bg-primary/10 text-primary',
    elim: 'border-border bg-surface-2 text-faint line-through',
  }[state]
  return (
    <button onClick={onClick} disabled={state === 'elim'} aria-pressed={state === 'sel' || state === 'correct'}
      className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm transition ${cls}`}>
      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${state === 'idle' ? 'border-border-strong' : 'border-current'}`}>
        {state === 'correct' ? <Icon name="check" size={13} /> : state === 'elim' ? <Icon name="close" size={13} /> : state === 'sel' ? '•' : ''}
      </span>
      <span><Formula>{label}</Formula></span>
    </button>
  )
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="min-w-[64px] rounded-xl border border-border bg-surface px-3 py-2">
      <div className={`font-mono text-lg font-semibold tabular-nums ${color}`}>{value}</div>
      <div className="text-xs text-faint">{label}</div>
    </div>
  )
}

// These two panels REPLACE the question sheet rather than opening on top of it, so the overlay
// stack useDismiss watches never changes and its focus capture never re-runs. Measured: focus was
// left on the Verifică button that had just unmounted and fell to <body>, the new dialog carried no
// accessible name (only an unreferenced <h2>), and there was no live region — so the run ending was
// announced to a screen reader not at all. Taking focus on mount is what makes the panel speak, and
// aria-labelledby is what gives it something to say.
function useEndPanel() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.focus({ preventScroll: true }) }, [])
  return ref
}

// Shown in place of the question when the hearts run out, with the two ways forward:
// pay for a refill with earned Volți, or drop the challenge and practise unlimited.
function OutOfHearts({ coins, onBuy, onStudyMode, onExit }: { coins: number; onBuy: () => boolean; onStudyMode: () => void; onExit: () => void }) {
  const { t } = useT()
  const canBuy = coins >= HEART_REFILL_COST
  const panel = useEndPanel()
  return (
    <div ref={panel} tabIndex={-1} aria-labelledby="lp-hearts-title"
      className="anim-sheet fixed inset-0 z-50 mx-auto flex max-w-md flex-col items-center justify-center gap-4 bg-bg px-7 text-center outline-none" role="dialog" aria-modal="true">
      <div className="anim-pop grid h-20 w-20 place-items-center rounded-full bg-surface-2 text-danger"><Icon name="heart" size={40} /></div>
      <h2 id="lp-hearts-title" className="font-display text-xl font-bold text-fg">{t('heartsOut')}</h2>
      <p className="text-sm leading-relaxed text-muted">{t('heartsOutBody')}</p>
      <div className="mt-2 flex w-full flex-col gap-2">
        <button onClick={onBuy} disabled={!canBuy}
          className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-fg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
          {t('heartsBuy')} · {HEART_REFILL_COST} {t('coins')}
        </button>
        {!canBuy && <p className="-mt-1 text-xs text-faint">{t('notEnough')} — {coins}/{HEART_REFILL_COST}</p>}
        <button onClick={onStudyMode} className="w-full rounded-xl border border-border py-3 text-sm font-semibold text-muted hover:text-fg">{t('heartsToStudy')}</button>
        <button onClick={onExit} className="w-full rounded-xl py-2.5 text-sm font-medium text-faint hover:bg-surface-2">{t('exit')}</button>
      </div>
    </div>
  )
}

function ResultsScreen({ isReview, accuracy, xp, coins, perfect, leveled, level, replay, unlocked, onGoLab, onExit }: { isReview: boolean; accuracy: number; xp: number; coins: number; perfect: boolean; leveled: boolean; level: number; replay: boolean; unlocked: string; onGoLab: () => void; onExit: () => void }) {
  const { t, lang } = useT()
  const { sound, haptics, addCoins, setFreezes } = useGame()
  const accV = useCountUp(accuracy, 650, 0)
  const xpV = useCountUp(xp, 650, 0)
  const coinV = useCountUp(coins, 650, 0)
  const panel = useEndPanel()
  const [chest] = useState(() => !isReview && !replay && Math.random() < 0.25)
  const [reward, setReward] = useState<string | null>(null)
  const openedRef = useRef(false)
  useEffect(() => {
    if (sound) ((perfect || leveled) && !isReview && !replay ? playLevelUp : playCorrect)()
    if (perfect && !isReview && !replay) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      if (!reduce) import('canvas-confetti').then(m => m.default({ particleCount: 120, spread: 72, startVelocity: 42, origin: { y: 0.42 }, colors: ['#2BF5A0', '#38D6E3', '#FFB020'] })).catch(() => { /* ignore */ })
    }
    // The reward is CREDITED here, immediately, not after a delay. It used to be a 750 ms timer
    // whose cleanup ran on unmount — so leaving the results screen before it elapsed cancelled the
    // payout, and the full-width "Mergi la Laboratorul meu →" button sits right there inviting
    // exactly that. The comment claimed the timer existed "so the reward is never lost"; it was the
    // one way to lose it. openChest is idempotent (openedRef), so the button below can still be
    // pressed — it just finds the chest already open, which is what the animation is for.
    if (chest) openChest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  function openChest() {
    // Same shape as the money buttons: `reward` is state, so the click guard and the 750 ms
    // auto-open could both fire, or two taps could, and the chest would pay out twice.
    if (openedRef.current) return
    openedRef.current = true
    if (Math.random() < 0.3) { setFreezes(f => f + 1); setReward(lang === 'ro' ? '❄ Înghețare serie' : '❄ Streak Freeze') }
    else { const v = 20 + Math.floor(Math.random() * 31); addCoins(v); setReward('+' + v + ' Volți') }
    if (sound) playChest()
    if (haptics) vibrate([12, 30, 12])
  }
  return (
    <div ref={panel} tabIndex={-1} aria-labelledby="lp-results-title"
      className="anim-sheet fixed inset-0 z-50 mx-auto flex max-w-md flex-col items-center justify-center gap-5 bg-bg px-8 text-center outline-none" role="dialog" aria-modal="true">
      <div className={`anim-pop grid h-20 w-20 place-items-center rounded-full bg-surface-2 ${isReview ? 'text-danger' : perfect ? 'text-warn' : 'text-primary'}`} style={{ boxShadow: '0 0 24px -6px var(--color-phosphor-glow)' }}>
        <Icon name={isReview ? 'mistakes' : perfect ? 'trophy' : 'check'} size={40} />
      </div>
      <h2 id="lp-results-title" className="font-display text-xl font-semibold">{isReview ? t('reviewDone') : t('lessonDone')}</h2>
      {leveled && (
        <div className="anim-pop rounded-full border border-rank/50 bg-surface-2 px-4 py-1.5 text-sm font-bold text-rank" style={{ boxShadow: '0 0 18px -4px #F5D03399' }}>
          ⚡ {lang === 'ro' ? 'Nivel' : 'Level'} {level}!
        </div>
      )}
      {!isReview && perfect && !replay && <p className="-mt-2 text-sm font-medium text-primary">{t('perfect')}</p>}
      <div className="flex gap-3">
        <Stat value={accV + '%'} label={t('accuracy')} color="text-fg" />
        {!isReview && <Stat value={'+' + xpV} label={t('xp')} color="text-xp" />}
        {!isReview && <Stat value={'+' + coinV} label={t('coins')} color="text-coin" />}
      </div>
      {replay && <p className="-mt-2 text-xs text-faint">{t('replayNote')}</p>}
      {chest && (
        <button onClick={() => !reward && openChest()} disabled={!!reward}
          className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-volt-400/50 bg-surface-2 py-3.5 transition hover:brightness-110">
          <Icon name="reference" size={34} className="text-warn" />
          {reward
            ? <span className="font-mono text-sm font-bold text-warn">{reward}</span>
            : <span className="text-sm font-semibold text-warn">{lang === 'ro' ? 'Deschide cufărul!' : 'Open the chest!'}</span>}
        </button>
      )}
      {/* A free instrument just unlocked — say so, and point at where to equip it. */}
      {unlocked && (
        <div className="anim-pop w-full rounded-xl border border-primary/50 bg-primary/10 px-4 py-3 text-sm leading-relaxed">
          <span className="font-semibold text-primary">{t('unlockedEquip')} {unlocked}!</span>{' '}
          <span className="text-muted">{t('equipInLab')}</span>
        </div>
      )}
      {/* Explain what the Volts are actually for, so My Lab makes sense. */}
      {!isReview && (coins > 0 || !!reward) && <p className="-mt-1 px-1 text-xs leading-relaxed text-faint">{t('voltsHint')}</p>}
      <div className="flex w-full flex-col gap-2">
        {!isReview && (
          <button onClick={onGoLab} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-fg hover:brightness-110">{t('goToLab')} →</button>
        )}
        <button onClick={onExit} className="w-full rounded-xl py-2.5 text-sm font-medium text-muted hover:bg-surface-2">{isReview ? t('cont') : t('exit')}</button>
      </div>
    </div>
  )
}
