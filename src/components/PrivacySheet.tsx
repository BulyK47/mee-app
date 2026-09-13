import { useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import source from '../../PRIVACY.md?raw'
import { useT } from '../i18n'
import { Icon } from './icons'
import { useDismiss } from '../ui/useDismiss'
import { prefersReduced } from '../ui/motion'

// The privacy policy, read inside the app.
//
// It was already written, already bilingual, and already the URL Play points at — but it lived only
// on GitHub, which is where a student never goes. A tester report in September listed "no privacy
// policy reachable in the app" as a finding, and it was right about the reachable half.
//
// The text is imported from PRIVACY.md at build time rather than retyped here. That is the whole
// design: there is ONE policy, the one in the repository and on the store listing, so the screen and
// the published document cannot drift into saying different things — which is the failure that
// makes a privacy notice worse than none. It also means the policy travels inside the bundle and
// opens with no connection, like everything else in this app.
//
// `check-invariants.mjs` holds PRIVACY.md to the small Markdown subset the renderer below
// understands, so a table or a link added to it fails the build instead of vanishing from view.

type Block =
  | { k: 'h1' | 'h2' | 'p' | 'em'; text: string }
  | { k: 'ul'; items: string[] }
  | { k: 'hr' }

function parse(md: string): Block[] {
  const out: Block[] = []
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  let para: string[] = []
  let list: string[] = []
  // Paragraphs in the source are hard-wrapped at about a hundred columns, so consecutive non-empty
  // lines are ONE paragraph and have to be rejoined; rendering them as written would put a break
  // after every wrapped line.
  const flushPara = () => { if (para.length) { out.push({ k: 'p', text: para.join(' ') }); para = [] } }
  const flushList = () => { if (list.length) { out.push({ k: 'ul', items: list }); list = [] } }
  const flush = () => { flushPara(); flushList() }
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) { flush(); continue }
    if (line === '---') { flush(); out.push({ k: 'hr' }); continue }
    if (line.startsWith('## ')) { flush(); out.push({ k: 'h2', text: line.slice(3) }); continue }
    if (line.startsWith('# ')) { flush(); out.push({ k: 'h1', text: line.slice(2) }); continue }
    if (line.startsWith('- ')) { flushPara(); list.push(line.slice(2)); continue }
    flushList()
    if (/^_.+_$/.test(line)) { flushPara(); out.push({ k: 'em', text: line.slice(1, -1) }); continue }
    para.push(line)
  }
  flush()
  return out
}

// A scanner rather than a regex with look-around: `**bold**`, `*italic*` and `` `code` `` are the
// only three markers the document uses, and telling `**` from `*` is the whole difficulty. Walking
// the string keeps that decision in one obvious place and needs nothing from the JavaScript engine.
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = []
  let plain = ''
  let i = 0
  const push = (node: ReactNode) => { if (plain) { out.push(plain); plain = '' } out.push(node) }
  while (i < text.length) {
    const two = text.slice(i, i + 2)
    if (two === '**') {
      const end = text.indexOf('**', i + 2)
      if (end > i + 1) { push(<strong key={`${key}-${i}`} className="font-semibold text-fg">{text.slice(i + 2, end)}</strong>); i = end + 2; continue }
    } else if (text[i] === '*') {
      const end = text.indexOf('*', i + 1)
      if (end > i) { push(<em key={`${key}-${i}`}>{text.slice(i + 1, end)}</em>); i = end + 1; continue }
    } else if (text[i] === '`') {
      const end = text.indexOf('`', i + 1)
      if (end > i) { push(<code key={`${key}-${i}`} className="rounded bg-panel px-1 font-mono text-[0.9em] text-accent">{text.slice(i + 1, end)}</code>); i = end + 1; continue }
    }
    plain += text[i]
    i++
  }
  if (plain) out.push(plain)
  return out
}

const BLOCKS = parse(source)

export default function PrivacySheet({ onClose }: { onClose: () => void }) {
  const { t, lang } = useT()
  const ro = lang === 'ro'
  const box = useRef<HTMLDivElement>(null)
  useDismiss(onClose)

  // The document carries both languages, in full, in the order it was written — a policy is not
  // reordered to suit the reader. These two jump to the right half instead, which for a Romanian
  // student is the difference between reading it and scrolling past two screens of English.
  // 'auto' under reduced motion: a jump of three thousand pixels is exactly the kind of movement
  // that setting exists to stop, and the rest of the app already honours it (see ui/motion.ts).
  const jump = (i: number) => {
    const el = box.current?.querySelectorAll('[data-lang-heading]')[i]
    el?.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'start' })
  }

  let headings = -1
  return createPortal(
    <div className="safe-area fixed inset-0 z-[70] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div ref={box} className="anim-sheet mx-auto flex max-h-[92dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-2xl border-t border-border bg-surface" onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={t('privacyPolicy')}>
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur">
          <Icon name="lock" size={16} className="shrink-0 text-primary" />
          <h2 className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-fg">{t('privacyPolicy')}</h2>
          <button onClick={onClose} aria-label={t('close')} title={t('close')}
            className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg before:absolute before:-inset-1.5 before:content-['']">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="flex gap-2 border-b border-border px-4 py-2.5">
          <button onClick={() => jump(0)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:border-primary hover:text-fg">English</button>
          <button onClick={() => jump(1)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:border-primary hover:text-fg">Română</button>
          <span className="ml-auto self-center text-[0.6875rem] text-faint">{ro ? 'ambele limbi, textul integral' : 'both languages, in full'}</span>
        </div>

        <div className="px-4 py-4 text-sm leading-relaxed text-muted">
          {BLOCKS.map((b, i) => {
            if (b.k === 'hr') return <hr key={i} className="my-5 border-border" />
            if (b.k === 'h1') return <h3 key={i} className="mb-1 font-display text-base font-semibold text-fg">{b.text}</h3>
            if (b.k === 'h2') { headings += 1; return <h4 key={i} data-lang-heading={headings} className="mb-2 mt-5 scroll-mt-14 font-display text-sm font-semibold text-primary">{b.text}</h4> }
            if (b.k === 'em') return <p key={i} className="mb-4 text-xs text-faint">{b.text}</p>
            if (b.k === 'ul') return (
              <ul key={i} className="mb-3 flex flex-col gap-1.5">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                    <span className="min-w-0">{inline(it, `${i}-${j}`)}</span>
                  </li>
                ))}
              </ul>
            )
            return <p key={i} className="mb-3">{inline(b.text, String(i))}</p>
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
