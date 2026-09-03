import { useState } from 'react'
import { useDismiss } from '../ui/useDismiss'
import { useT, counted } from '../i18n'
import { Icon, type IconName } from './icons'
import { CURRICULUM } from '../content/modules'
import { EXAM_QUESTIONS } from '../content/course'
import { MAX_HEARTS, HEART_REFILL_COST } from '../store'
import type { Lang } from '../types'

type Row = { icon: IconName; ro: string; en: string; roD: string; enD: string }
type Slide = { title: { ro: string; en: string }; lead: { ro: string; en: string }; rows: Row[] }

// The three tour cards. Ordered by what a student needs in the first five minutes, not by what the
// app is proudest of: what it is, then the three counters, then how to move through the course.
//
// The middle card is the reason this became a carousel at all. Hearts, XP and Volts are the three
// things every new reader gets wrong — XP and Volts sit side by side in the header looking like the
// same kind of number, one is spendable and the other is not, and nothing on screen said so. It
// used to be one line inside a four-row list, where it read as a feature rather than as a rule.
const SLIDES: Slide[] = [
  {
    title: { ro: 'Bine ai venit!', en: 'Welcome!' },
    lead: {
      ro: 'Măsurări Electrice și Electronice — învață jucându-te.',
      en: 'Electrical & Electronic Measurements — learn by playing.',
    },
    rows: [
      // the count comes from CURRICULUM: the same hard-coded "15" was already caught lying in wait
      // on the diploma, and a welcome screen that overstates the course is the worst place for it
      { icon: 'learn', ro: 'Învață pas cu pas', en: 'Learn step by step', roD: `${counted(CURRICULUM.length, 'ro', 'modul', 'module')}, de la noțiuni fundamentale la subiecte avansate.`, enD: `${counted(CURRICULUM.length, 'en', 'module', 'modules')}, from fundamentals to advanced topics.` },
      { icon: 'certificate', ro: 'Simulare de examen', en: 'Exam simulation', roD: `${EXAM_QUESTIONS} grile cronometrate, punctate ca la examenul real.`, enD: `${EXAM_QUESTIONS} timed multiple-choice questions, scored like the real exam.` },
      { icon: 'lab', ro: 'Laboratorul meu', en: 'My Lab', roD: 'Lecțiile îți aduc Volți; aici cumperi instrumente și le vezi pe bancul tău de lucru.', enD: 'Lessons earn you Volts; here you buy instruments and see them on your workbench.' },
    ],
  },
  {
    title: { ro: 'Inimi, XP și Volți', en: 'Hearts, XP and Volts' },
    lead: {
      ro: 'Trei numere în antet. Doar unul se cheltuie.',
      en: 'Three numbers in the header. Only one of them is spent.',
    },
    rows: [
      { icon: 'heart', ro: 'Inimi', en: 'Hearts', roD: `Un răspuns greșit costă o inimă; ai ${MAX_HEARTS}. Revin a doua zi, le poți reumple cu ${HEART_REFILL_COST} Volți, iar în Mod Studiu nu se folosesc deloc.`, enD: `A wrong answer costs one heart; you have ${MAX_HEARTS}. They come back the next day, you can refill them for ${HEART_REFILL_COST} Volts, and Study Mode does not use them at all.` },
      { icon: 'bolt', ro: 'XP', en: 'XP', roD: 'Arată cât ai învățat: ridică nivelul și umple ținta zilnică. Nu se cheltuie niciodată.', enD: 'Shows how much you have learned: it raises your level and fills the daily goal. It is never spent.' },
      { icon: 'coin', ro: 'Volți', en: 'Volts', roD: 'Moneda. Se cheltuie doar în Laboratorul meu — pe instrumente și pe reumplerea inimilor.', enD: 'The currency. Spent only in My Lab — on instruments and on refilling hearts.' },
    ],
  },
  {
    title: { ro: 'Cum se parcurge cursul', en: 'How the course works' },
    lead: {
      ro: 'Nimic nu stă blocat în spatele unui modul întreg.',
      en: 'Nothing is locked behind a whole module.',
    },
    rows: [
      { icon: 'learn', ro: 'Toate modulele sunt deschise', en: 'Every module is open', roD: 'Începe de unde vrei. Doar lecțiile din interiorul unui modul se deblochează pe rând, în ordine.', enD: 'Start wherever you like. Only the lessons inside a module unlock one after another, in order.' },
      { icon: 'recap', ro: 'Teorie și memorator', en: 'Theory & formula sheet', roD: 'Butonul Teorie, de lângă titlul modulului, deschide recapitularea. Iconița din antet deschide memoratorul, cu toate formulele la un loc.', enD: 'The Theory button next to a module title opens its recap. The header icon opens the formula sheet, with every formula in one place.' },
      { icon: 'settings', ro: 'Setări', en: 'Settings', roD: 'Sus în dreapta: limba, tema, Modul Studiu, ținta zilnică și copia de siguranță a progresului.', enD: 'Top right: language, theme, Study Mode, the daily goal and the backup of your progress.' },
    ],
  },
]

// Shown once on first launch (gated on the meem_onboarded flag), and again on demand from Settings.
// Two stages: pick the language, then the tour. The language step comes first so the tour itself is
// already in the student's language — and so nobody has to hunt for the RO/EN toggle in the header
// to get started. `tourOnly` is the replay: the language is already chosen, so that step is skipped.
export default function Onboarding({ onDone, tourOnly = false }: { onDone: () => void; tourOnly?: boolean }) {
  const { t, lang, setLang } = useT()
  const [picked, setPicked] = useState(tourOnly)
  const [step, setStep] = useState(0)
  const ro = lang === 'ro'
  // This was the one overlay in the app that declared aria-modal="true" without backing it: the
  // whole app renders behind it (App.tsx keeps it as a sibling), so 121 controls — the header
  // toggles, every module, every lesson — stayed in the tab order, and nothing was focused when
  // it opened. useDismiss with an empty close is the rest of the app's own answer: it focuses the
  // container, wraps Tab inside it, and holds the history entry so Android's Back no longer finds
  // an empty stack and closes the whole application on the very first screen.
  //
  // The close is empty ONLY on first launch — that is a one-time gate, so Escape and Back should do
  // nothing rather than skip it. A replay opened from Settings is an ordinary overlay and closes
  // like every other one, which is also what Android's Back button has to do there.
  useDismiss(tourOnly ? onDone : () => {})

  const shell = (children: React.ReactNode) => (
    <div className="anim-sheet fixed inset-0 z-[60] mx-auto flex max-w-md flex-col overflow-y-auto bg-bg pt-[calc(2rem+var(--sa-top))] pr-[calc(1.5rem+var(--sa-right))] pb-[calc(2rem+var(--sa-bottom))] pl-[calc(1.5rem+var(--sa-left))]" role="dialog" aria-modal="true"
      aria-label={ro ? 'Configurare inițială' : 'Initial setup'}>
      {/* The inner m-auto wrapper, rather than justify-center on the root, is what lets this
          gate scroll. A justify-center flex column whose content overflows puts the top of that
          content out of reach — the scroll origin clamps at the start edge — and this screen is
          the one nobody can dismiss: useDismiss is given an empty close on purpose. With the
          system-bar insets now taken out of the available height, the language step on a short
          phone was the case that could hide its own buttons. */}
      <div className="m-auto flex w-full flex-col">{children}</div>
    </div>
  )

  if (!picked) {
    // the browser's own preference only pre-highlights a choice; it never decides for the student
    const suggested: Lang = navigator.language?.toLowerCase().startsWith('ro') ? 'ro' : 'en'
    const options: { id: Lang; label: string; native: string; badge: string }[] = [
      { id: 'ro', label: 'Română', native: 'Continuă în română', badge: 'RO' },
      { id: 'en', label: 'English', native: 'Continue in English', badge: 'EN' },
    ]
    return shell(
      <>
        <div className="mb-7 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary" style={{ boxShadow: '0 0 28px -6px var(--color-phosphor-glow)' }}><Icon name="bolt" size={34} /></div>
          <h1 className="font-display text-2xl font-bold text-fg">Alege limba</h1>
          <p className="mt-1 text-sm text-muted">Choose your language</p>
        </div>
        <div className="flex flex-col gap-3">
          {options.map(o => (
            <button key={o.id} onClick={() => { setLang(o.id); setPicked(true) }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-colors hover:border-primary hover:bg-panel">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-panel font-display text-sm font-bold text-accent">{o.badge}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-fg">{o.label}</span>
                <span className="block text-xs text-muted">{o.native}</span>
              </span>
              {o.id === suggested && <span className="ml-auto shrink-0 text-faint"><Icon name="check" size={18} /></span>}
            </button>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-faint">O poți schimba oricând din Setări · You can change it anytime in Settings</p>
      </>,
    )
  }

  const slide = SLIDES[step]
  const last = step === SLIDES.length - 1
  const stepLabel = ro ? `Pasul ${step + 1} din ${SLIDES.length}` : `Step ${step + 1} of ${SLIDES.length}`

  return shell(
    <>
      {/* The way out sits at the top, where it is looked for, and it is on every card including the
          last: somebody who has decided they are done reading should not have to page through the
          rest to leave. On a replay it says "Închide" instead — there is nothing left to skip, the
          walkthrough being the whole reason the overlay is open. */}
      <div className="mb-4 flex items-center justify-end">
        <button onClick={onDone} className="-mr-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted hover:text-fg">
          {tourOnly ? t('close') : ro ? 'Sari peste' : 'Skip'}
        </button>
      </div>

      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary" style={{ boxShadow: '0 0 28px -6px var(--color-phosphor-glow)' }}><Icon name="bolt" size={34} /></div>
        <h1 className="font-display text-2xl font-bold text-fg">{ro ? slide.title.ro : slide.title.en}</h1>
        <p className="mt-1 text-sm text-muted">{ro ? slide.lead.ro : slide.lead.en}</p>
      </div>

      <div className="flex flex-col gap-3">
        {slide.rows.map((r, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-panel text-accent"><Icon name={r.icon} size={20} /></span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-fg">{ro ? r.ro : r.en}</div>
              <div className="text-xs text-muted">{ro ? r.roD : r.enD}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Dots, plus the same information in words for anyone who cannot see them. They are a
          position readout, not controls: three cards do not need a jump target each, and a dot is
          far below any usable tap size. */}
      <div className="mt-6 flex items-center justify-center gap-2" role="img" aria-label={stepLabel} title={stepLabel}>
        {SLIDES.map((_, i) => (
          <span key={i} aria-hidden className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-primary' : 'w-1.5 bg-border-strong'}`} />
        ))}
      </div>

      <button onClick={() => (last ? onDone() : setStep(step + 1))}
        className="mt-4 w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-fg hover:brightness-110">
        {last ? (tourOnly ? (ro ? 'Gata' : 'Done') : ro ? 'Începe' : 'Start') : t('cont')}
      </button>
      {step > 0 && (
        <button onClick={() => setStep(step - 1)} className="mt-2 w-full py-2 text-sm text-muted hover:text-fg">
          {ro ? 'Înapoi' : 'Back'}
        </button>
      )}
    </>,
  )
}
