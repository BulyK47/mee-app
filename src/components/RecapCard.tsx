import type { Recap } from '../content/recaps'
import { useT, L } from '../i18n'
import { Icon } from './icons'
import { Formula } from '../ui/Formula'
import { FormulaMath } from '../ui/FormulaMath'
import { useDismiss } from '../ui/useDismiss'

export default function RecapCard({ recap, onClose }: { recap: Recap; onClose: () => void }) {
  const { t, lang } = useT()
  useDismiss(onClose)
  return (
    <div className="anim-sheet fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-bg" role="dialog" aria-modal="true" aria-labelledby="dlg-recap">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 id="dlg-recap" className="flex items-center gap-2 font-display text-base font-semibold text-fg"><Icon name="recap" size={18} className="text-accent" /> {t('recap')}</h2>
        <button onClick={onClose} className="relative grid h-10 w-10 place-items-center rounded-full text-faint hover:bg-surface-2 hover:text-fg before:absolute before:-inset-0.5 before:content-['']" aria-label={t('close')}><Icon name="close" size={20} /></button>
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <h3 className="mb-3 font-display text-lg font-semibold text-fg">{L(recap.title, lang)}</h3>
        <ul className="flex flex-col gap-2">
          {recap.items.map((it, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-muted">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <span><Formula>{L(it, lang)}</Formula></span>
            </li>
          ))}
        </ul>
        {recap.formulas && recap.formulas.length > 0 && (
          <div className="mt-5">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">{lang === 'ro' ? 'Formule' : 'Formulas'}</h4>
            <div className="flex flex-col gap-2">
              {recap.formulas.map((f, i) => (
                <code key={i} className="block break-words rounded-lg border border-border bg-panel px-3 py-2 font-mono text-sm text-primary">
                  {/* Theory recaps typeset clean formulas with native MathML; FormulaMath falls
                      back to <Formula> for lines that mix in units, commentary or several equations. */}
                  <FormulaMath>{L(f, lang)}</FormulaMath>
                </code>
              ))}
            </div>
          </div>
        )}
      </div>
      <footer className="border-t border-border px-5 py-3">
        <button onClick={onClose} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-fg hover:brightness-110">{t('cont')}</button>
      </footer>
    </div>
  )
}
