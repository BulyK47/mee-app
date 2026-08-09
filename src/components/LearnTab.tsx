import type { Course, Lesson } from '../types'
import { storageWorks } from '../storage'
import { useGame, localToday } from '../store'
import { dueRefs, nextDue, daysBetween } from '../srs'
import { useT, L, counted } from '../i18n'
import { CURRICULUM, earnedEquip } from '../content/modules'
import { EXAM_QUESTIONS } from '../content/course'
import { recapFor } from '../content/recaps'
import { EQUIPMENT } from '../content/equipment'
import { hueFg } from '../ui/hue'
import { Icon } from './icons'
import QuestsCard from './QuestsCard'

const ROWH = 92

export default function LearnTab({ course, onStart, onReview, onRecap, onExam }: { course: Course; onStart: (l: Lesson) => void; onReview: () => void; onRecap: (worldId: string) => void; onExam: () => void }) {
  const { completed, best, liveMistakes, srs, daily, goal, inventory, theme } = useGame()
  const { t, lang } = useT()
  const today = localToday()
  const due = dueRefs(liveMistakes, srs, today)
  const dueLessons = new Set(due.map(r => r.lessonId))
  const todayXp = daily.date === today ? daily.xp : 0
  const goalPct = Math.min(100, Math.round((todayXp / goal) * 100))
  const earned = earnedEquip(completed)
  // "Totul la zi" told the student nothing about WHEN the queue comes back — and srs.nextDue(),
  // written for exactly this, was never called by anything. A backlog that returns tomorrow and one
  // that returns in three weeks are different situations and were displayed identically.
  const soonest = nextDue(liveMistakes, srs, today)
  const inDays = soonest ? daysBetween(today, soonest) : null
  const nextText = inDays == null ? ''
    : inDays <= 1 ? (lang === 'ro' ? 'mâine' : 'tomorrow')
      : (lang === 'ro' ? `în ${counted(inDays, 'ro', 'zi', 'zile')}` : `in ${counted(inDays, 'en', 'day', 'days')}`)

  return (
    <div className="px-4 py-4">
      {!storageWorks() && (
        <p className="mb-3 flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-xs leading-relaxed text-warn">
          <Icon name="bolt" size={14} className="mt-0.5 shrink-0" />{t('noStorage')}
        </p>
      )}
      {/* Daily goal */}
      <div className="mb-4 rounded-2xl border border-border bg-surface p-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wide text-muted">{t('dailyGoal')}</span>
          <span className="font-mono tabular-nums text-primary">{todayXp}/{goal} {t('xp')}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-panel">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${goalPct}%`, boxShadow: '0 0 8px -1px var(--color-phosphor-glow)' }} />
        </div>
      </div>

      {/* Daily quests */}
      <QuestsCard />

      {/* Exam simulation */}
      <button onClick={onExam} className="mb-4 flex w-full items-center justify-between rounded-2xl border border-accent/40 bg-surface px-4 py-3 text-left hover:brightness-110">
        <span className="flex items-center gap-2 text-sm font-semibold text-accent"><Icon name="certificate" size={18} /> {lang === 'ro' ? 'Simulare de examen' : 'Exam simulation'}</span>
        {/* the countdown is 60 s PER QUESTION; "1 min" alone reads as one minute for the whole exam */}
        <span className="shrink-0 text-xs font-semibold text-accent">{lang === 'ro' ? `${EXAM_QUESTIONS} grile · 1 min/întrebare →` : `${EXAM_QUESTIONS} questions · 1 min each →`}</span>
      </button>

      {/* Spaced-repetition review — headline the cards due today */}
      {liveMistakes.length > 0 && (
        <button onClick={onReview} className={`mb-4 flex w-full items-center justify-between rounded-2xl border bg-surface px-4 py-3 text-left hover:brightness-110 ${due.length ? 'border-fault-500/40' : 'border-primary/30'}`}>
          {due.length > 0 ? (
            <>
              <span className="flex items-center gap-2 text-sm font-semibold text-danger"><Icon name="mistakes" size={16} /> {t('mistakes')} ({due.length} {t('toReview')})</span>
              <span className="text-xs font-semibold text-danger">{t('practiceMistakes')} →</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-2 text-sm font-semibold text-primary"><Icon name="check" size={16} /> {t('upToDate')}</span>
              <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-muted">
                {nextText && <span className="text-faint">{lang === 'ro' ? 'revine' : 'back'} {nextText}</span>}
                {t('reviewAll')} →
              </span>
            </>
          )}
        </button>
      )}

      {/* Curriculum — 15 modules in course order; modules are OPEN, lessons inside a module unlock in sequence */}
      {CURRICULUM.map(mod => {
        const world = course.worlds.find(w => w.id === mod.id)
        const lessons = world?.lessons ?? []
        const n = lessons.length
        const comingSoon = n === 0
        const doneInWorld = lessons.filter(l => completed.includes(l.id)).length
        const pct = n ? Math.round((doneInWorld / n) * 100) : 0
        const H = n * ROWH
        const cy = (i: number) => i * ROWH + ROWH / 2
        let lastDone = -1
        lessons.forEach((l, i) => { if (completed.includes(l.id)) lastDone = i })

        const reward = mod.reward ? EQUIPMENT.find(e => e.id === mod.reward) : undefined
        const rewardOwned = mod.reward ? (inventory.includes(mod.reward) || earned.has(mod.reward)) : false
        const accent = hueFg(mod.hue, theme)
        const modDue = lessons.filter(l => dueLessons.has(l.id)).length

        return (
          <section key={mod.id} className={`mb-6 ${comingSoon ? 'opacity-70' : ''}`}>
            {/* Module intro card — what you'll learn + what you win in My Lab */}
            <div className="mb-3 rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-panel" style={{ color: accent }}><Icon name={mod.icon} size={24} /></span>
                <div className="min-w-0 flex-1">
                  {/* Wraps instead of truncating: on a 320 px phone this box is only ~114 px wide,
                      which cut "11. Transformatoare de măsurare" down to 52% of itself. No line
                      clamp at all — these are 15 authored titles, not user input, so the longest
                      needs three lines and there is no runaway case to guard against. A wider
                      screen still fits them on one line, so nothing changes there. */}
                  <div className="text-sm font-semibold" style={{ color: accent }}>{mod.order}. {L(mod.title, lang)}</div>
                  <div className="font-mono text-xs tabular-nums text-muted">{comingSoon ? t('comingSoon') : `${doneInWorld}/${n} · ${pct}%`}</div>
                </div>
                {modDue > 0 && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-fault-500/15 px-2 py-1 text-[0.6875rem] font-bold text-danger" title={`${modDue} ${t('toReview')}`}>
                    <Icon name="loop" size={13} /> {modDue}
                  </span>
                )}
                {recapFor(mod.id) && (
                  // 26 px tall — the smallest target in the app, fifteen of them, on the screen the
                  // student is on most. The pill has to stay small to sit beside the module title,
                  // so the ::before does the growing: 26 + 2×10 = 46. Both axes named, since
                  // -inset-y alone leaves left/right at `auto` and expands nothing (see the
                  // one-axis-tap-target rule). Measured clearance to the nearest other control is
                  // 64 px above and 425 below, inside an 88 px row, so nothing can overlap.
                  <button onClick={() => onRecap(mod.id)} className="relative flex shrink-0 items-center gap-1 rounded-full border border-border bg-panel px-2.5 py-1 text-xs font-semibold text-muted hover:text-fg before:absolute before:-inset-y-2.5 before:inset-x-0 before:content-['']" title={t('recap')}>
                    <Icon name="recap" size={14} /> {t('theory')}
                  </button>
                )}
              </div>

              {!comingSoon && (
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-panel">
                  {/* hueFg, not the raw hue: the 15 module hues are tuned for dark surfaces, and
                      on the light theme's white track all 15 fell between 1.43 and 2.70 against a
                      3:1 floor for a graphic that carries information — the filled length IS the
                      progress reading, with no other cue. hueFg returns the hue untouched in dark,
                      so nothing changes there; the glow keeps the bright hue, being decorative. */}
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: accent, boxShadow: pct > 0 ? `0 0 8px -1px ${mod.hue}` : undefined }} />
                </div>
              )}

              <p className="mt-3 text-xs leading-relaxed text-muted">
                <span className="font-semibold text-faint">{t('willLearn')}: </span>{L(mod.learn, lang)}
              </p>

              {reward && (
                <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-border bg-panel/50 px-2.5 py-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface-2" style={{ color: hueFg(reward.hex, theme) }}><Icon name={reward.icon} size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[0.625rem] uppercase tracking-wide text-faint">{t('labReward')}</div>
                    <div className="line-clamp-2 text-xs font-semibold text-fg">{L(reward.name, lang)}</div>
                  </div>
                  <span className={`shrink-0 font-mono text-[0.625rem] font-semibold ${rewardOwned ? 'text-primary' : 'text-faint'}`}>
                    {rewardOwned ? `✓ ${t('inLab')}` : comingSoon ? t('inShop') : t('atFinish')}
                  </span>
                </div>
              )}
            </div>

            {comingSoon ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-4 py-6 text-center text-xs text-faint">
                {t('comingSoonBody')}
              </div>
            ) : (
              <div className="relative" style={{ height: H }}>
                <svg className="pointer-events-none absolute left-0 top-0" width="80" height={H} viewBox={`0 0 80 ${H}`} aria-hidden>
                  {n > 1 && <line x1="40" y1={cy(0)} x2="40" y2={cy(n - 1)} stroke="var(--color-copper)" strokeOpacity="0.4" strokeWidth="2.5" strokeDasharray="1 7" strokeLinecap="round" />}
                  {lastDone >= 1 && <>
                    <line x1="40" y1={cy(0)} x2="40" y2={cy(lastDone)} stroke="var(--color-phosphor-500)" strokeOpacity="0.22" strokeWidth="7" strokeLinecap="round" />
                    <line x1="40" y1={cy(0)} x2="40" y2={cy(lastDone)} stroke="var(--color-phosphor-500)" strokeWidth="2.5" strokeLinecap="round" />
                  </>}
                </svg>

                {lessons.map((l, i) => {
                  const done = completed.includes(l.id)
                  // Modules are open, but lessons inside a module unlock in order:
                  // lesson i needs the previous lesson in THIS module completed.
                  const locked = i > 0 && !completed.includes(lessons[i - 1].id)
                  const nodeStyle: React.CSSProperties | undefined = (!locked && !done)
                    ? { background: mod.hue, boxShadow: `0 0 0 4px ${mod.hue}44, 0 0 18px -2px ${mod.hue}` }
                    : undefined
                  return (
                    <div key={l.id} className="absolute inset-x-0 flex items-center gap-3" style={{ top: i * ROWH, height: ROWH }}>
                      <div className="flex w-20 shrink-0 justify-center">
                        {/* The round node and the text beside it are two buttons calling the same
                            onStart, so tabbing the course hit 98 stops for 49 lessons and announced
                            every lesson twice — the first time with only its title, the second with
                            the title plus "5 ex. · +65 XP · 100% ✓", i.e. the richer one came
                            second. Taken out of the tab order and hidden from assistive tech: it
                            stays fully tappable, which is how it is used on a phone, while keyboard
                            and screen-reader users get one stop per lesson, the informative one. */}
                        <button
                          disabled={locked}
                          onClick={() => onStart(l)}
                          tabIndex={-1}
                          aria-hidden="true"
                          style={nodeStyle}
                          className={`grid h-14 w-14 place-items-center rounded-full transition ${
                            locked ? 'cursor-not-allowed border border-border bg-panel text-faint'
                              : done ? 'border-2 border-volt-400 bg-surface-2 text-primary hover:brightness-110'
                                : 'text-ink-950 hover:brightness-110'
                          }`}>
                          <Icon name={locked ? 'lock' : done ? 'star' : mod.icon} size={24} />
                        </button>
                      </div>
                      <button disabled={locked} onClick={() => onStart(l)} className="flex-1 pr-2 text-left disabled:cursor-not-allowed">
                        <div className={`text-sm font-semibold leading-snug ${locked ? 'text-faint' : 'text-fg'}`}>{L(l.title, lang)}</div>
                        <div className="mt-0.5 flex items-center gap-2 font-mono text-xs tabular-nums text-faint">
                          <span>{l.exercises.length} ex.</span>
                          <span className="text-xp">+{l.exercises.reduce((s, e) => s + e.points, 0)} XP</span>
                          {done && <span className="text-primary">{best[l.id] ?? 0}% ✓</span>}
                        </div>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
