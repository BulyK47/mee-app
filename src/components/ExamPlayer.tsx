import { useState, useRef, useEffect } from 'react'
import type { Exercise } from '../types'
import { useT, L } from '../i18n'
import { useGame } from '../store'
import { isCorrect, correctText } from '../grader'
import { QuestionVisual } from '../visuals/QuestionVisual'
import { Icon } from './icons'
import { Formula } from '../ui/Formula'
import { ConfirmDialog } from '../ui/Confirm'
import { useDismiss } from '../ui/useDismiss'

const PER_Q = 60 // seconds per question

export default function ExamPlayer({ exercises, onClose, onRetry }: { exercises: Exercise[]; onClose: () => void; onRetry: () => void }) {
  const { t, lang } = useT()
  const [idx, setIdx] = useState(0)
  const [sel, setSel] = useState<string[]>([])
  const [answers, setAnswers] = useState<Record<number, string[]>>({})
  const [done, setDone] = useState(false)
  const [timeLeft, setTimeLeft] = useState(PER_Q)
  const [askQuit, setAskQuit] = useState(false)
  // Back must not drop a running exam silently: mid-exam it raises the same confirmation the ✕
  // does, and only on the results screen does it close outright.
  useDismiss(() => (done ? onClose() : setAskQuit(true)))
  const { finishExam } = useGame()
  const selRef = useRef<string[]>([])
  selRef.current = sel
  const total = exercises.length
  const ex = exercises[idx]

  // Report the score once, when the exam ends, for the post-course "≥ 70%" quest. In an effect and
  // behind a ref rather than in the results branch: that branch is a render, and a store write
  // during render would loop, while StrictMode's double-invoke would report the attempt twice.
  const reported = useRef(false)
  useEffect(() => {
    if (!done || reported.current) return
    reported.current = true
    const right = exercises.reduce((n, e, i) => n + (isCorrect(e, answers[i] || []) ? 1 : 0), 0)
    finishExam(total ? Math.round((right / total) * 100) : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  function advance() {
    setAnswers(a => ({ ...a, [idx]: selRef.current }))
    setSel([])
    if (idx + 1 < total) setIdx(idx + 1)
    else setDone(true)
  }
  const advRef = useRef(advance)
  advRef.current = advance

  // Each question gets a fresh budget; this ref is what carries the remainder across a pause.
  // Declared before the countdown effect so that on a question change it is reset first.
  const leftRef = useRef(PER_Q)
  useEffect(() => { leftRef.current = PER_Q }, [idx])

  // 60s countdown per question; auto-advance on timeout. Frozen while the quit confirmation is up:
  // that dialog is the app's own safety prompt, not answering time. Letting the clock run through
  // it meant a student who pressed ✕ near 0:00 had the question auto-advance BEHIND the dialog, so
  // choosing "Cancel" dropped them onto a different question with the previous one already
  // submitted. Measured before the fix: 0:37 → 0:32 over five seconds with the prompt open.
  useEffect(() => {
    if (done || askQuit) return
    const budget = leftRef.current
    setTimeLeft(budget)
    const started = Date.now()
    const timer = setInterval(() => {
      const left = budget - Math.floor((Date.now() - started) / 1000)
      leftRef.current = Math.max(0, left)
      if (left <= 0) { clearInterval(timer); timedOutRef.current = true; advRef.current() }
      else setTimeLeft(left)
    }, 250)
    return () => clearInterval(timer)
  }, [idx, done, askQuit])

  // The exam is the only surface in the app that changes on its own: when the minute runs out the
  // whole question is swapped underneath the student. Measured: zero live regions here, so that was
  // completely silent — while the lesson announces "Mai încearcă" and its hint, and Settings its
  // notices. The countdown is signalled only by `low ? 'text-danger'` and a pulsing icon, i.e. by
  // colour and motion, which is the same gap seen from the other side.
  const timedOutRef = useRef(false)
  const warnedRef = useRef(false)
  const [announce, setAnnounce] = useState('')
  useEffect(() => {
    if (done) return
    warnedRef.current = false
    const q = lang === 'ro' ? `Întrebarea ${idx + 1} din ${total}.` : `Question ${idx + 1} of ${total}.`
    setAnnounce((timedOutRef.current ? (lang === 'ro' ? 'Timpul a expirat. ' : 'Time is up. ') : '') + q)
    timedOutRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, done])
  // one warning per question as the last ten seconds start — the point at which the colour changes
  useEffect(() => {
    if (done || askQuit || warnedRef.current || timeLeft > 10 || timeLeft <= 0) return
    warnedRef.current = true
    setAnnounce(lang === 'ro' ? 'Zece secunde rămase.' : 'Ten seconds left.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, done, askQuit])

  function toggle(id: string) {
    if (ex.type === 'multi') setSel(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))
    else setSel([id])
  }
  // no window.confirm here: browsers suppress repeated native dialogs and WebViews ignore them,
  // which silently turned this button into a no-op and trapped the student inside the exam
  const quit = () => setAskQuit(true)

  if (done) {
    const score = exercises.reduce((n, e, i) => n + (isCorrect(e, answers[i] || []) ? 1 : 0), 0)
    const pct = Math.round((score / total) * 100)
    const color = pct >= 70 ? 'text-primary' : pct >= 50 ? 'text-warn' : 'text-danger'
    return (
      <div className="anim-sheet fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-bg" role="dialog" aria-modal="true" aria-labelledby="dlg-exam-result">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 id="dlg-exam-result" className="font-display text-base font-semibold text-fg">{lang === 'ro' ? 'Rezultat' : 'Result'}</h2>
          <button onClick={onClose} className="relative grid h-10 w-10 place-items-center rounded-full text-faint hover:bg-surface-2 hover:text-fg before:absolute before:-inset-0.5 before:content-['']" aria-label={t('close')}><Icon name="close" size={20} /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-4 rounded-2xl border border-border bg-surface p-5 text-center">
            <div className={`font-mono text-4xl font-bold tabular-nums ${color}`}>{score}<span className="text-xl text-faint">/{total}</span></div>
            <div className={`mt-1 text-sm font-semibold ${color}`}>{pct}%</div>
            <div className="mt-1 text-xs text-muted">{pct >= 70 ? (lang === 'ro' ? 'Foarte bine!' : 'Great job!') : pct >= 50 ? (lang === 'ro' ? 'Se poate mai bine.' : 'Room to improve.') : (lang === 'ro' ? 'Mai exersează.' : 'Keep practising.')}</div>
          </div>
          <div className="flex flex-col gap-2">
            {exercises.map((e, i) => {
              const ok = isCorrect(e, answers[i] || [])
              return (
                <details key={i} className="rounded-xl border border-border bg-surface px-3 py-2">
                  <summary className="flex cursor-pointer items-center gap-2 text-sm">
                    {/* The whole point of this list is which ones you got wrong, and that was a
                        tick-or-cross glyph in green-or-red — the icon is aria-hidden, so the
                        verdict existed only as colour and shape. Named, so it is spoken. */}
                    <span role="img"
                      aria-label={ok ? (lang === 'ro' ? 'Corect' : 'Correct') : (lang === 'ro' ? 'Greșit' : 'Wrong')}
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${ok ? 'bg-primary/15 text-primary' : 'bg-fault-500/15 text-danger'}`}><Icon name={ok ? 'check' : 'close'} size={14} /></span>
                    <span className="min-w-0 flex-1 truncate text-fg">{i + 1}. <Formula>{L(e.prompt, lang)}</Formula></span>
                  </summary>
                  <div className="mt-2 border-t border-border/60 pt-2 text-xs">
                    <p className="text-muted"><span className="text-faint">{lang === 'ro' ? 'Răspunsul tău: ' : 'Your answer: '}</span><Formula>{(answers[i] || []).map(id => e.choices?.find(c => c.id === id)?.label ? L(e.choices.find(c => c.id === id)!.label, lang) : id).join(' · ') || (lang === 'ro' ? '(niciunul)' : '(none)')}</Formula></p>
                    <p className="mt-0.5 text-primary"><span className="text-faint">{lang === 'ro' ? 'Corect: ' : 'Correct: '}</span><Formula>{correctText(e, lang)}</Formula></p>
                    {e.explanation && <p className="mt-1 leading-relaxed text-muted"><Formula>{L(e.explanation, lang)}</Formula></p>}
                  </div>
                </details>
              )
            })}
          </div>
        </div>
        <footer className="border-t border-border px-5 py-3">
          <button onClick={onRetry} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-fg hover:brightness-110">{lang === 'ro' ? 'Simulare nouă' : 'New exam'}</button>
          {/* Named for where it goes, not "Închide" — which is already the accessible name of the
              ✕ in the header above. Two distinct controls carrying one name is what a screen-reader
              user hears as "Închide, button … Închide, button", with nothing to choose between
              them; they do the same thing here, so nothing breaks, but the list of controls on the
              one screen a student reads carefully becomes unreadable. Saying the destination also
              answers the question the button actually raises after a result: where do I land. */}
          <button onClick={onClose} className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium text-muted hover:bg-surface-2">{lang === 'ro' ? 'Înapoi la Învață' : 'Back to Learn'}</button>
        </footer>
      </div>
    )
  }

  const low = timeLeft <= 10
  return (
    <div className="anim-sheet fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-bg" role="dialog" aria-modal="true"
      aria-label={lang === 'ro' ? 'Simulare de examen' : 'Exam simulation'}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <button onClick={quit} className="relative grid h-9 w-9 place-items-center rounded-full text-faint hover:bg-surface-2 hover:text-fg before:absolute before:-inset-1 before:content-['']" aria-label={t('exit')}><Icon name="close" size={18} /></button>
      <ConfirmDialog open={askQuit} danger message={lang === 'ro' ? 'Închizi simularea de examen? Progresul din această simulare se pierde.' : 'Quit the exam simulation? This attempt will be lost.'} confirmLabel={t('exit')} onConfirm={onClose} onCancel={() => setAskQuit(false)} />
        <span className="font-mono text-xs font-semibold tabular-nums text-muted">{idx + 1} / {total}</span>
        <span className={`flex items-center gap-1 font-mono text-sm font-bold tabular-nums ${low ? 'text-danger' : 'text-fg'}`}>
          <Icon name="target" size={14} className={low ? 'animate-pulse' : ''} />{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
        </span>
      </header>
      <div className="h-1 bg-panel">
        <div className={`h-full transition-[width] duration-200 ${low ? 'bg-danger' : 'bg-primary'}`} style={{ width: `${(timeLeft / PER_Q) * 100}%` }} />
      </div>
      <div role="status" aria-live="polite" className="sr-only">{announce}</div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* question first, figure second — the same order as the lesson player. The other way round
            the student reads a floating statement before knowing what is being asked. */}
        <p className="mb-2 text-base font-semibold leading-snug text-fg"><Formula>{L(ex.prompt, lang)}</Formula></p>
        {/* A `concept` figure is not a figure: it carries no measurement, no circuit and no trace —
            only `note` and sometimes `relation`, written to TEACH beside the question in a lesson.
            Shown here it hands the answer over. Measured on the bank: 121 of the 173 questions in
            the exam pool carry one, and in the worst cases the note states the phase relationship,
            or the missing torque, that the correct option is then chosen for — the note IS the
            answer, reworded. (The examples are not quoted here on purpose: a sentence copied out of
            content-private/ into a published source file is the leak check-not-staged.mjs exists to
            stop, and it does — this comment tripped it once already.) The simulation is advertised
            as "punctate ca la examenul real", so a score inflated by hints is worse than a low one:
            it tells the student they are ready when they are not.
            Only this kind is withheld. Every other kind — scope, meter, bridge, table, charcurve,
            phasor, bode, opamp… — carries the DATA the question is asked about and must stay.
            Checked before withholding it: no exam-pool concept question refers to a figure in its
            prompt, and none has an attached image, so nothing here is left unanswerable. */}
        <QuestionVisual visual={ex.visual?.kind === 'concept' ? undefined : ex.visual} prompt={L(ex.prompt, lang)} image={ex.media?.image} alt={ex.media?.alt ? L(ex.media.alt, lang) : ''} lang={lang} />
        <p className="mb-3 text-xs font-medium text-faint">{ex.type === 'multi' ? t('selectAll') : t('selectOne')}</p>
        <div className="flex flex-col gap-2">
          {(ex.choices || []).map(c => {
            const on = sel.includes(c.id)
            return (
              // aria-pressed, as on the lesson player's ChoiceBtn: without it the tick box is an
              // <svg> with no text and the tint is the only difference between chosen and not, so
              // all four options announce identically and flatten to identical in forced-colours
              <button key={c.id} onClick={() => toggle(c.id)} aria-pressed={on}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${on ? 'border-primary bg-primary/10 text-fg' : 'border-border bg-surface text-muted hover:text-fg'}`}>
                <span className={`grid h-5 w-5 shrink-0 place-items-center ${ex.type === 'multi' ? 'rounded-md' : 'rounded-full'} border ${on ? 'border-primary bg-primary text-primary-fg' : 'border-border-strong'}`}>{on && <Icon name="check" size={13} />}</span>
                <span><Formula>{L(c.label, lang)}</Formula></span>
              </button>
            )
          })}
        </div>
      </div>
      <footer className="border-t border-border px-5 py-3">
        <button onClick={advance} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-fg hover:brightness-110">
          {idx + 1 < total ? t('cont') : (lang === 'ro' ? 'Termină examenul' : 'Finish exam')}
        </button>
      </footer>
    </div>
  )
}
