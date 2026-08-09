import { useState, useMemo } from 'react'
import type { Loc } from '../types'
import { CURRICULUM } from '../content/modules'
import { recapFor } from '../content/recaps'
import { useT, L } from '../i18n'
import { Formula } from '../ui/Formula'
import { FormulaMath } from '../ui/FormulaMath'
import { Icon } from './icons'
import { useDismiss } from '../ui/useDismiss'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

// A single searchable reference of every module's key formulas + notions,
// aggregated from the theory recaps, in course order.
export default function Memorator({ onClose }: { onClose: () => void }) {
  const { t, lang } = useT()
  useDismiss(onClose)
  const [q, setQ] = useState('')
  const nq = norm(q.trim())

  const data = useMemo(() => CURRICULUM.map(m => {
    const r = recapFor(m.id)
    if (!r) return null
    return { id: m.id, order: m.order, title: L(m.title, lang), formulas: r.formulas ?? [], items: r.items ?? [] }
  }).filter(Boolean) as { id: string; order: number; title: string; formulas: Loc[]; items: Loc[] }[], [lang])

  const filtered = data.map(m => {
    if (!nq) return m
    if (norm(m.title).includes(nq)) return m
    const formulas = m.formulas.filter(f => norm(`${f.ro} ${f.en}`).includes(nq))
    const items = m.items.filter(it => norm(L(it, lang)).includes(nq))
    return (formulas.length || items.length) ? { ...m, formulas, items } : null
  }).filter(Boolean) as typeof data

  return (
    <div className="anim-sheet fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-bg" role="dialog" aria-modal="true" aria-labelledby="dlg-memorator">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 id="dlg-memorator" className="flex items-center gap-2 font-display text-base font-semibold text-fg"><Icon name="recap" size={18} /> {lang === 'ro' ? 'Memorator' : 'Formula sheet'}</h2>
        <button onClick={onClose} className="relative grid h-10 w-10 place-items-center rounded-full text-faint hover:bg-surface-2 hover:text-fg before:absolute before:-inset-0.5 before:content-['']" aria-label={t('close')}><Icon name="close" size={20} /></button>
      </header>
      <div className="border-b border-border px-4 py-2">
        <input value={q} onChange={e => setQ(e.target.value)} autoFocus
          aria-label={lang === 'ro' ? 'Caută în memorator' : 'Search the formula sheet'}
          placeholder={lang === 'ro' ? 'Caută formulă sau noțiune…' : 'Search formula or notion…'}
          // py-3: the search box was 38 px tall, the one control in this sheet still under the
          // 44 px target. It is full width, so the extra padding costs nothing.
          className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-fg placeholder:text-faint focus:border-primary focus:outline-none" />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {filtered.length === 0 && <p className="mt-8 text-center text-sm text-faint">{lang === 'ro' ? 'Nimic găsit.' : 'Nothing found.'}</p>}
        {filtered.map(m => (
          <section key={m.id} className="mb-5">
            <h3 className="mb-2 text-sm font-semibold text-accent">{m.order}. {m.title}</h3>
            {m.formulas.length > 0 && (
              <div className="mb-2 flex flex-col gap-1.5">
                {/* same typesetter as the Teorie cards and the question boxes, so a fraction is a
                    fraction everywhere in the app and not "a/b" only on this screen */}
                {m.formulas.map((f, i) => (
                  <code key={i} className="block rounded-md bg-surface-2 px-3 py-1.5 font-mono text-sm text-primary"><FormulaMath>{L(f, lang)}</FormulaMath></code>
                ))}
              </div>
            )}
            {m.items.length > 0 && (
              <ul className="ml-4 list-disc space-y-1">
                {m.items.map((it, i) => <li key={i} className="text-xs leading-relaxed text-muted"><Formula>{L(it, lang)}</Formula></li>)}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
