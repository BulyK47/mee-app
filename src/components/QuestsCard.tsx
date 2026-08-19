import { useGame, localToday } from '../store'
import { useT, L } from '../i18n'
import { questsFor, questProgress, questClaimed } from '../content/quests'
import { ALL_LESSONS } from '../content/course'
import { Icon } from './icons'

export default function QuestsCard() {
  const game = useGame()
  const { t, lang } = useT()
  if (!game) return null // guard against a transient null context (Vite HMR re-evaluates the store module)
  const { quests, claimQuest, completed } = game
  // After the last lesson, "finish 3 lessons" and "a perfect lesson" can never complete
  // again — finishLesson refuses to count a replay — so the set swaps to review/exam quests.
  const finished = ALL_LESSONS.length > 0 && ALL_LESSONS.every(l => completed.includes(l.id))
  const QUESTS = questsFor(finished)
  const today = localToday()
  const allClaimed = QUESTS.every(d => questClaimed(quests, d.id, today))

  return (
    <div className="mb-4 rounded-2xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-semibold uppercase tracking-wide text-muted">{finished ? (lang === 'ro' ? 'Antrenament zilnic' : 'Daily training') : t('dailyQuests')}</span>
        {allClaimed && <span className="flex items-center gap-1 font-semibold text-primary"><Icon name="check" size={13} /> {t('questsAllDone')}</span>}
      </div>
      <div className="flex flex-col gap-2">
        {QUESTS.map(d => {
          const prog = questProgress(quests, d, today)
          const done = prog >= d.target
          const claimed = questClaimed(quests, d.id, today)
          const pct = Math.round((prog / d.target) * 100)
          return (
            <div key={d.id} className="flex items-center gap-3 rounded-xl border border-border bg-panel/40 px-3 py-2">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${done ? 'bg-primary/15 text-primary' : 'bg-surface-2 text-muted'}`}><Icon name={d.icon} size={17} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-fg">{L(d.title, lang)}</span>
                  <span className="shrink-0 font-mono text-[0.625rem] tabular-nums text-faint">{prog}/{d.target}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
              {claimed ? (
                // was labelled t('questsAllDone') — "All claimed" — on EACH tick, so one
                // claimed quest announced itself as all of them being done
                <span className="shrink-0 text-primary" role="img"
                  aria-label={`${L(d.title, lang)} — ${lang === 'ro' ? 'revendicat' : 'claimed'}`}><Icon name="check" size={18} /></span>
              ) : (
                // Three of these sit in a list and the aria-label used to be the bare "Claim"
                // for all three — identical names, and the label OVERRODE the only thing that told
                // them apart, the reward printed inside. Name says which quest and how much.
                // The ::before grows the 50×29 box to a 50×45 target without moving anything;
                // padding cannot, since the row's own height is what fixes this button's box.
                // BOTH axes have to be named: -inset-y-2 alone leaves left/right at `auto`, which
                // resolves to the static position and yields a pseudo-element 45 px tall and ZERO
                // px wide — measured — so the target would not have grown at all. inset-x-0 pins it
                // to the button's own 50 px width, which is already over the 44 px minimum.
                <button
                  disabled={!done}
                  onClick={() => claimQuest(d.id, d.reward)}
                  aria-label={`${t('claim')}: ${L(d.title, lang)} — ${d.reward} ${t('coins')}`}
                  className={`relative flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[0.6875rem] font-bold tabular-nums transition before:absolute before:-inset-y-2 before:inset-x-0 before:content-[''] ${done ? 'bg-primary text-primary-fg hover:brightness-110' : 'cursor-not-allowed bg-surface-2 text-faint'}`}>
                  <Icon name="coin" size={12} /> {d.reward}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
