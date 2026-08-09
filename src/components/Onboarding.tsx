import { useState } from 'react'
import { useDismiss } from '../ui/useDismiss'
import { useT, counted } from '../i18n'
import { Icon, type IconName } from './icons'
import { CURRICULUM } from '../content/modules'
import type { Lang } from '../types'

// Shown once on first launch (gated on the meem_onboarded flag). Two steps: pick the language,
// then a short tour. The language step comes first so the tour itself is already in the student's
// language — and so nobody has to hunt for the RO/EN toggle in the header to get started.
export default function Onboarding({ onDone }: { onDone: () => void }) {
  const { lang, setLang } = useT()
  const [picked, setPicked] = useState(false)
  const ro = lang === 'ro'
  // This was the one overlay in the app that declared aria-modal="true" without backing it: the
  // whole app renders behind it (App.tsx keeps it as a sibling), so 121 controls — the header
  // toggles, every module, every lesson — stayed in the tab order, and nothing was focused when
  // it opened. useDismiss with an empty close is the rest of the app's own answer: it focuses the
  // container, wraps Tab inside it, and holds the history entry so Android's Back no longer finds
  // an empty stack and closes the whole application on the very first screen. The close is empty
  // on purpose — this is a one-time gate, so Escape and Back should do nothing rather than skip it.
  useDismiss(() => {})

  const shell = (children: React.ReactNode) => (
    <div className="anim-sheet fixed inset-0 z-[60] mx-auto flex max-w-md flex-col justify-center bg-bg px-6 py-8" role="dialog" aria-modal="true"
      aria-label={ro ? 'Configurare inițială' : 'Initial setup'}>
      {children}
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

  const rows: { icon: IconName; ro: string; en: string; roD: string; enD: string }[] = [
    // the count comes from CURRICULUM: the same hard-coded "15" was already caught lying in wait
    // on the diploma, and a welcome screen that overstates the course is the worst place for it
    { icon: 'learn', ro: 'Învață pas cu pas', en: 'Learn step by step', roD: `${counted(CURRICULUM.length, 'ro', 'modul', 'module')}, de la noțiuni fundamentale la subiecte avansate.`, enD: `${counted(CURRICULUM.length, 'en', 'module', 'modules')}, from fundamentals to advanced topics.` },
    { icon: 'certificate', ro: 'Simulare de examen', en: 'Exam simulation', roD: 'Grile cronometrate, punctate ca la examenul real.', enD: 'Timed multiple-choice, scored like the real exam.' },
    { icon: 'recap', ro: 'Teorie și memorator', en: 'Theory & formula sheet', roD: 'Recapitulări pe module și toate formulele într-un loc.', enD: 'Per-module recaps and every formula in one place.' },
    { icon: 'lab', ro: 'Laboratorul meu', en: 'My Lab', roD: 'Lecțiile îți aduc Volți; aici cumperi instrumente și le echipezi pe bancul tău de lucru.', enD: 'Lessons earn you Volts; here you buy instruments and equip them on your workbench.' },
  ]
  return shell(
    <>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary" style={{ boxShadow: '0 0 28px -6px var(--color-phosphor-glow)' }}><Icon name="bolt" size={34} /></div>
        <h1 className="font-display text-2xl font-bold text-fg">{ro ? 'Bine ai venit!' : 'Welcome!'}</h1>
        <p className="mt-1 text-sm text-muted">{ro ? 'Măsurări Electrice și Electronice — învață jucându-te.' : 'Electrical & Electronic Measurements — learn by playing.'}</p>
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-panel text-accent"><Icon name={r.icon} size={20} /></span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-fg">{ro ? r.ro : r.en}</div>
              <div className="text-xs text-muted">{ro ? r.roD : r.enD}</div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onDone} className="mt-7 w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-fg hover:brightness-110">{ro ? 'Începe' : 'Start'}</button>
    </>,
  )
}
