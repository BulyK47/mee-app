import { useGame, localToday } from '../store'
import { useT, counted } from '../i18n'
import { CURRICULUM, isModuleComplete } from '../content/modules'
import { perfect as perfectLessons } from '../content/achievements'
import { levelInfo } from '../level'
import { Icon } from './icons'
import { useDismiss } from '../ui/useDismiss'
import { copyText, isAbort } from '../ui/clipboard'
import { readLocal, writeLocal } from '../storage'
import { useState, useEffect } from 'react'

// A certificate that unlocks when every module is complete; shows progress otherwise.
export default function Diploma({ onClose }: { onClose: () => void }) {
  const { completed, xp, best } = useGame()
  const { t, lang } = useT()
  useDismiss(onClose)
  const ro = lang === 'ro'
  const done = CURRICULUM.filter(m => isModuleComplete(m.id, completed)).length
  const total = CURRICULUM.length
  const complete = done >= total
  const lvl = levelInfo(xp).level
  const perfect = perfectLessons(best)
  const [notice, setNotice] = useState('')

  // The date is STAMPED ONCE, the first time the course is seen complete, and read back after that.
  // Reading `new Date()` at render time meant the certificate carried whatever day it happened to
  // be opened on: the same diploma showed a different date every visit, and the shared text went
  // out with it — two screenshots a week apart disagreed about when it was awarded. The wording is
  // "se acordă", so what belongs here is the issue date, which is exactly this. localToday(), not
  // toISOString(), because the app dates everything by the user's LOCAL calendar (see srs.ts) and
  // UTC would roll the day over early for a student working late.
  const [awarded, setAwarded] = useState(() => readLocal('meem_diploma_date') ?? '')
  useEffect(() => {
    if (!complete || awarded) return
    const d = localToday()
    writeLocal('meem_diploma_date', d)
    setAwarded(d)
  }, [complete, awarded])
  // en-GB gave "07/08/2026", which an English reader can just as reasonably take for 8 July as for
  // 7 August — both are real dates, so nothing in the string resolves it. On a lesson screen that
  // would be pedantry; on a CERTIFICATE, a document whose whole purpose is to be shown to someone
  // else, an ambiguous date is a defect. Spelling the month out removes the ambiguity entirely.
  // Romanian keeps ro-RO: "07.08.2026" with dots is unambiguously day-first by convention there.
  const date = awarded
    ? new Date(awarded + 'T00:00:00').toLocaleDateString(ro ? 'ro-RO' : 'en-GB',
      ro ? undefined : { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  // window.print() does nothing inside an Android WebView unless the host wires up the print
  // framework, so the certificate needs a second route that works everywhere.
  async function shareDiploma() {
    // counted(), not `${n} noun`: Romanian needs "1 lecție perfectă", "7 lecții perfecte" and
    // "20 de lecții perfecte", and the adjective has to travel with the noun form.
    const text = ro
      ? `Am terminat cursul Măsurări Electrice și Electronice — toate cele ${counted(total, 'ro', 'modul', 'module')}. Nivel ${lvl}, ${counted(perfect, 'ro', 'lecție perfectă', 'lecții perfecte')}. ${date}`
      : `I completed the Electrical and Electronic Measurements course — all ${counted(total, 'en', 'module', 'modules')}. Level ${lvl}, ${counted(perfect, 'en', 'perfect lesson', 'perfect lessons')}. ${date}`
    if (navigator.share) {
      try { await navigator.share({ text }); return } catch (e) { if (isAbort(e)) return }
    }
    const ok = await copyText(text)
    setNotice(ok ? t('copied') : text)
    setTimeout(() => setNotice(''), 2600)
  }

  // The comment above says window.print() is a no-op inside an Android WebView, and the answer to
  // that was "make sure it isn't the only way out". But the button itself still said nothing when
  // it did nothing: on the Play Store build a student taps Printează and the screen simply does not
  // react. Elsewhere this app insists that every path ends in something visible, so this one leaves
  // a line pointing at the route that does work. On desktop the dialog opens first and the notice
  // is merely redundant, which is why it is worded as a condition rather than an apology.
  function printDiploma() {
    try { window.print() } catch { /* a WebView with no print handler can throw rather than no-op */ }
    setNotice(ro ? 'Dacă nu s-a deschis dialogul de printare, folosește „Distribuie diploma".'
                 : 'If no print dialog opened, use "Share the diploma" instead.')
    setTimeout(() => setNotice(''), 4200)
  }

  return (
    <div className="anim-sheet fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-bg" role="dialog" aria-modal="true" aria-labelledby="dlg-diploma">
      <header className="no-print flex items-center justify-between border-b border-border px-5 py-3">
        <h2 id="dlg-diploma" className="font-display text-base font-semibold text-fg">{ro ? 'Diploma mea' : 'My diploma'}</h2>
        <button onClick={onClose} className="relative grid h-10 w-10 place-items-center rounded-full text-faint hover:bg-surface-2 hover:text-fg before:absolute before:-inset-0.5 before:content-['']" aria-label={t('close')}><Icon name="close" size={20} /></button>
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="diploma-print rounded-2xl border-2 p-6 text-center" style={{ borderColor: complete ? 'var(--color-volt-400)' : 'var(--color-border)', background: 'var(--color-surface)' }}>
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full" style={{ background: complete ? 'var(--color-volt-400)' : 'var(--color-panel)', color: complete ? '#1a1200' : 'var(--color-faint)' }}>
            <Icon name={complete ? 'certificate' : 'lock'} size={34} />
          </div>
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.25em] text-faint">{ro ? 'Diplomă' : 'Certificate'}</p>
          <h1 className="mt-1 font-display text-xl font-bold text-fg">Măsurări Electrice și Electronice</h1>
          {complete ? (
            <>
              {/* the count comes from CURRICULUM, not from a literal "15" that would quietly start
                  lying the day a module is added */}
              <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted">{ro ? `Se acordă pentru finalizarea integrală a cursului — toate cele ${counted(total, 'ro', 'modul', 'module')} parcurse.` : `Awarded for fully completing the course — all ${counted(total, 'en', 'module', 'modules')} finished.`}</p>
              <div className="mt-4 flex items-center justify-center gap-4 font-mono text-xs tabular-nums text-fg">
                <span className="flex items-center gap-1 text-rank"><Icon name="star" size={14} /> Lv {lvl}</span>
                {/* the noun travels with the number, exactly as in the shared text below: the
                    adjective alone gives "3 perfecte" in Romanian, which reads as shorthand, but
                    "3 perfect" in English, which is not a phrase at all */}
                <span className="flex items-center gap-1 text-primary"><Icon name="check" size={14} /> {counted(perfect, ro ? 'ro' : 'en', ro ? 'lecție perfectă' : 'perfect lesson', ro ? 'lecții perfecte' : 'perfect lessons')}</span>
              </div>
              <p className="mt-4 border-t border-border/60 pt-3 text-[0.6875rem] text-faint">{date}</p>
            </>
          ) : (
            <>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted">{ro ? 'Diploma se deblochează după finalizarea tuturor modulelor.' : 'The diploma unlocks after you complete every module.'}</p>
              <div className="mx-auto mt-4 max-w-[220px]">
                <div className="mb-1 flex justify-between font-mono text-xs tabular-nums text-muted"><span>{done}/{total} {ro ? 'module' : 'modules'}</span><span>{Math.round((done / total) * 100)}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-panel"><div className="h-full rounded-full bg-primary" style={{ width: `${(done / total) * 100}%` }} /></div>
              </div>
            </>
          )}
        </div>
        {complete && (
          <>
            {/* sharing works on every device; printing is the desktop/iOS route and is a no-op
                inside an Android WebView, so it must not be the only way out */}
            <button onClick={shareDiploma} className="no-print mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-fg hover:brightness-110">
              <Icon name="share" size={16} /> {ro ? 'Distribuie diploma' : 'Share the diploma'}
            </button>
            <button onClick={printDiploma} className="no-print mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-semibold text-muted hover:text-fg">
              <Icon name="certificate" size={16} /> {ro ? 'Printează / Salvează PDF' : 'Print / Save PDF'}
            </button>
          </>
        )}
      </div>
      <div role="status" aria-live="polite">
        {notice && (
          <div className="anim-slideup fixed inset-x-6 bottom-10 z-[70] mx-auto max-w-xs rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-center text-sm text-fg">{notice}</div>
        )}
      </div>
    </div>
  )
}
