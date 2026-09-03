import { useGame } from '../store'
import { useT } from '../i18n'
import { Icon, type IconName } from './icons'

// A one-off explanation that sits at the top of a screen until the student closes it, and then
// stays closed. Two of them exist — one on the course map, one in the lab — and both repeat, in the
// place where it actually applies, something the walkthrough says on first launch. That repetition
// is the point: a carousel is read once, at the worst possible moment, before any of it means
// anything, and roughly half the people who see one tap "Skip".
//
// The dismissal is PERSISTED, not per-session. A band that comes back on every launch is not a
// hint, it is a notice, and it trains people to close things without reading them. The way back is
// "Revezi prezentarea" in Settings, which restores every band together with the walkthrough.
export default function HintBand({ id, icon, text }: { id: string; icon: IconName; text: string }) {
  const { hiddenHints, hideHint } = useGame()
  const { lang } = useT()
  if (hiddenHints.includes(id)) return null
  const label = lang === 'ro' ? 'Ascunde indiciul' : 'Hide this hint'
  return (
    <div className="mb-3 flex items-start gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs leading-relaxed text-muted">
      <Icon name={icon} size={14} className="mt-0.5 shrink-0 text-accent" />
      <p className="min-w-0 flex-1">{text}</p>
      {/* 32 px of visible button, grown to 44 by the ::before — both axes named, since -inset-y
          alone leaves left and right at `auto` and expands nothing. It sits at the end of a text
          row with 12 px of padding around it, so the grown target cannot reach another control. */}
      <button onClick={() => hideHint(id)} aria-label={label} title={label}
        className="relative -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-faint hover:bg-panel hover:text-fg before:absolute before:-inset-1.5 before:content-['']">
        <Icon name="close" size={14} />
      </button>
    </div>
  )
}
