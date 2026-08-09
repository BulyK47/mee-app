import { useGame, MAX_HEARTS } from '../store'
import { useT } from '../i18n'
import { levelInfo } from '../level'
import { Icon } from './icons'
import { useCountUp } from '../ui/motion'

export default function Hud({ onSettings, onMemorator }: { onSettings: () => void; onMemorator: () => void }) {
  const { xp, coins, streakLive, hearts, studyMode, freezes } = useGame()
  const { t, lang, setLang } = useT()
  const ro = lang === 'ro'
  const lvl = levelInfo(xp).level
  const xpV = useCountUp(xp)
  const coinV = useCountUp(coins)
  const streakV = useCountUp(streakLive)
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-surface/95 px-3 py-2 backdrop-blur">
      {/* min-w-0 is what makes justify-between safe here. Without it this counter row keeps its
          intrinsic width, and since neither flex child was allowed to shrink, the row simply pushed
          the three action buttons off the screen. Measured on a 375 px viewport (iPhone SE / 13
          mini) with a plausible advanced profile — Lv 31, streak 128, ❄3, 12 480 XP, 3 250 Volți —
          the header wanted 491 px: the page grew a horizontal scrollbar and Setări sat at x = 489,
          i.e. unreachable without scrolling the whole app sideways, on a sticky bar that is present
          on every screen. Even an all-zero profile overflowed by 10 px, so this was never only an
          edge case. The counters now yield space and scroll within themselves — nothing is hidden,
          the widest single item being the five heart icons at 73 px — while the buttons stay put. */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-x-auto font-mono text-sm font-medium tabular-nums [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="rounded-full border border-rank/60 bg-surface-2 px-2 py-0.5 text-xs text-rank"
          role="img" aria-label={ro ? `Nivelul ${lvl}` : `Level ${lvl}`}>Lv {lvl}</span>
        {/* The titles used to be "streak", "hearts", "XP", "Volți" — two English words inside a
            Romanian UI and one Romanian word that stayed Romanian for English users. The hearts one
            mattered most: those five icons carry no text at all, so a screen reader announced
            "hearts" and stopped, leaving no way to know how many were left — and since Study Mode
            now defaults off, that count is the thing standing between a student and the wall. */}
        {/* `title` alone was not enough. On a non-interactive <span> it is a mouse tooltip and
            nothing more — screen readers do not reliably announce it — so the whole counter row
            read as "Lv 1, 0, 0, 0": three bare numbers with no clue which was the streak, which the
            XP and which the Volți, because the icons beside them are aria-hidden. The hearts span
            below already had the right shape (role="img" + aria-label carrying the VALUE); these
            three now match it. The label has to contain the number, not just the name, since the
            text node itself is what the label replaces. */}
        <span className="flex items-center gap-1 text-warn" role="img"
          aria-label={ro ? `Serie: ${streakLive} zile` : `Streak: ${streakLive} days`}
          title={ro ? 'Serie' : 'Streak'}><Icon name="flame" size={15} />{streakV}</span>
        {freezes > 0 && <span className="flex items-center gap-0.5 text-accent" role="img"
          aria-label={ro ? `Înghețări de serie: ${freezes}` : `Streak freezes: ${freezes}`}
          title={ro ? 'Înghețări de serie' : 'Streak freezes'}>❄{freezes}</span>}
        <span className="flex items-center gap-1 text-xp" role="img"
          aria-label={`${xp} XP`} title="XP"><Icon name="bolt" size={15} />{xpV}</span>
        <span className="flex items-center gap-1 text-coin" role="img"
          aria-label={ro ? `${coins} Volți` : `${coins} Volts`}
          title={ro ? 'Volți' : 'Volts'}><Icon name="coin" size={15} />{coinV}</span>
        {!studyMode && (
          <span className="flex items-center gap-0.5 text-danger" role="img"
            aria-label={ro ? `${hearts} din ${MAX_HEARTS} inimi` : `${hearts} of ${MAX_HEARTS} hearts`}
            title={ro ? `${hearts} din ${MAX_HEARTS} inimi` : `${hearts} of ${MAX_HEARTS} hearts`}>
            {Array.from({ length: MAX_HEARTS }).map((_, i) => <Icon key={i} name="heart" size={13} className={i < hearts ? '' : 'opacity-25'} />)}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {/* was aria-label="language" — an English literal in both languages, and it named a topic
            rather than an action: the visible text is the CURRENT language, so a screen reader
            user heard "RO, language, button" with no hint that pressing it switches. */}
        {/* All three header controls are 40 px boxes — 4 px under the 44 px target. The ::before
            adds 2 px a side without moving anything: measured, the horizontal gap between them is
            6 px, so the grown targets stay 2 px apart, and the header has 8 px above / 9 px below
            to absorb the vertical growth. */}
        <button onClick={() => setLang(lang === 'ro' ? 'en' : 'ro')}
          className="relative inline-flex min-h-10 items-center rounded-full border border-border-strong bg-surface-2 px-3 text-xs font-semibold text-muted hover:text-fg before:absolute before:-inset-0.5 before:content-['']"
          aria-label={lang === 'ro' ? 'Schimbă limba în engleză' : 'Switch language to Romanian'}
          title={lang === 'ro' ? 'Schimbă limba în engleză' : 'Switch language to Romanian'}>
          {lang.toUpperCase()}
        </button>
        <button onClick={onMemorator} className="relative grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg before:absolute before:-inset-0.5 before:content-['']" aria-label={lang === 'ro' ? 'Memorator' : 'Formula sheet'} title={lang === 'ro' ? 'Memorator' : 'Formula sheet'}>
          <Icon name="recap" size={18} />
        </button>
        <button onClick={onSettings} className="relative grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg before:absolute before:-inset-0.5 before:content-['']" aria-label={t('settings')}>
          <Icon name="settings" size={18} />
        </button>
      </div>
    </header>
  )
}
