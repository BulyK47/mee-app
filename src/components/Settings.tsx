import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useGame, localToday } from '../store'
import { useT, L, counted } from '../i18n'
import { ACHIEVEMENTS } from '../content/achievements'
import { ALL_LESSONS } from '../content/course'
import { levelInfo } from '../level'
import { Icon } from './icons'
import { useDismiss } from '../ui/useDismiss'
import { ConfirmDialog } from '../ui/Confirm'
import { keysLocal, readLocal, writeLocal, removeLocal } from '../storage'
import { copyText, isAbort } from '../ui/clipboard'

// Paste a Google Form URL here to collect structured feedback; empty = opens the student's email app.
const FEEDBACK_URL = ''
// A course address rather than a personal one: this string ships in the public repository AND in
// the store build, both of which are scraped for addresses.
const FEEDBACK_EMAIL = 'dmaecseb108@gmail.com'

export default function Settings({ onClose, onDiploma }: { onClose: () => void; onDiploma: () => void }) {
  const { xp, coins, streak, streakLive, completed, best, inventory, studyMode, goal, theme, sound, haptics, setStudyMode, setGoal, setTheme, setSound, setHaptics, addCoins, reset } = useGame()
  const { t, lang, setLang } = useT()
  useDismiss(onClose)
  // native dialogs are unreliable (suppressed after repeated use, ignored by WebViews), so the
  // destructive actions ask in-app and the notices are shown inline instead of via alert()
  const [askReset, setAskReset] = useState(false)
  const [pendingImport, setPendingImport] = useState<Record<string, unknown> | null>(null)
  const [notice, setNotice] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const say = (m: string) => { setNotice(m); setTimeout(() => setNotice(''), 2600) }
  const total = ALL_LESSONS.length
  // Count only lessons that still exist. `completed` keeps every id ever finished, including ones
  // left behind by a content rename, so the raw length can exceed the course itself — the tile read
  // "4/49" next to "2%" for the same progress. Nothing is deleted from storage to fix this: a
  // public clone runs without content-private/, where ALL_LESSONS is just the demo, and a cleanup
  // there would erase a student's real progress permanently. Filter at the point of display.
  const doneCount = completed.filter(id => ALL_LESSONS.some(l => l.id === id)).length
  const pct = total ? Math.round((doneCount / total) * 100) : 0
  const achState = { xp, completed, best, inventory, streak: streakLive }
  const goals = [20, 30, 50, 80]
  const goalLabel = ['casual', 'normal', 'serious', 'intense'] as const

  // Every path must end in something visible. The old version swallowed each failure in a bare
  // catch, so on a device without navigator.share and without a secure-context clipboard the
  // button simply did nothing.
  async function share() {
    const text = `${lang === 'ro' ? 'Scorul meu la Măsurări Electrice' : 'My Electrical Measurements score'}: ⚡${xp} XP · 🔥${streakLive} · 🪙${coins} · ${pct}% ✓`
    if (navigator.share) {
      try { await navigator.share({ text }); return } catch (e) { if (isAbort(e)) return /* the user closed the sheet */ }
    }
    say(await copyText(text) ? t('copied') : text)
  }

  // A mailto: navigation is silently dropped by an Android WebView (nothing implements
  // shouldOverrideUrlLoading) and by any desktop without a registered mail client — the button
  // just looked broken. Open an in-app sheet instead: it shows the address, can copy it, and still
  // offers the mail link for the devices where that works.
  const feedbackStats = () => `Lv ${levelInfo(xp).level} · ${xp} XP · ${pct}% · streak ${streakLive}`
  function feedback() {
    if (FEEDBACK_URL) { window.open(FEEDBACK_URL, '_blank', 'noopener'); return }
    setShowFeedback(true)
  }

  // A phone is the main target, and <a download> is the weakest path there: an Android WebView
  // drops blob downloads unless the host installs a DownloadListener, and iOS Safari largely
  // ignores the download attribute. Offer the file to the system share sheet first — that lands
  // in Files, Drive or a message — and keep the anchor as the desktop fallback.
  async function exportProgress() {
    const data: Record<string, string> = {}
    for (const k of keysLocal('meem_')) data[k] = readLocal(k) ?? ''
    const json = JSON.stringify(data, null, 2)
    // localToday(), not toISOString(): Romania is UTC+2/+3, so a backup taken just after midnight
    // would be stamped with YESTERDAY's date and sort behind the one it replaces. The whole rest of
    // the app already dates by local day (streak, hearts refill, quests) — the file has to agree.
    const name = `mee-progres-${localToday()}.json`
    const blob = new Blob([json], { type: 'application/json' })

    try {
      const file = new File([blob], name, { type: 'application/json' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: name })
        return
      }
    } catch (e) { if (isAbort(e)) return /* the user closed the share sheet */ }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    // The anchor must be in the document and the blob URL must outlive the click: a detached
    // anchor is ignored by some WebViews, and revoking the URL in the same tick can truncate the
    // download before it starts. This file is the student's only backup — it has to arrive.
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url) }, 5000)
    say(lang === 'ro' ? 'Fișier de backup generat.' : 'Backup file created.')
  }
  function importProgress() {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json,application/json'
    input.onchange = () => {
      const file = input.files?.[0]; if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result))
          // "is it an object" is not enough. Any JSON file passes that — an array, a package.json,
          // some other app's export — and the import then wipes every meem_ key and writes back
          // nothing, silently destroying the whole course. On Android the file picker offers every
          // .json on the device, so choosing the wrong one is one careless tap away. A backup has
          // to prove it is one: at least one meem_ entry, stored as a string.
          if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('bad')
          const entries = Object.entries(data).filter(([k, v]) => k.startsWith('meem_') && typeof v === 'string')
          if (!entries.length) throw new Error('not a backup')
          setPendingImport(Object.fromEntries(entries))
        } catch { say(lang === 'ro' ? 'Fișier invalid.' : 'Invalid file.') }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div className="anim-sheet fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-bg" role="dialog" aria-modal="true" aria-labelledby="dlg-settings">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 id="dlg-settings" className="font-display text-base font-semibold text-fg">{t('settings')}</h2>
        <button onClick={onClose} className="relative grid h-10 w-10 place-items-center rounded-full text-faint hover:bg-surface-2 hover:text-fg before:absolute before:-inset-0.5 before:content-['']" aria-label={t('close')}><Icon name="close" size={20} /></button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <Section title={t('stats')}>
          <div className="grid grid-cols-2 gap-2">
            <Tile label={t('level')} value={`Lv ${levelInfo(xp).level}`} />
            <Tile label={t('xp')} value={`${xp}`} />
            <Tile label={t('coins')} value={`${coins}`} />
            <Tile label="streak" value={counted(streakLive, lang, lang === 'ro' ? 'zi' : 'day', t('streakDays'))} />
            <Tile label={t('lessonsDone')} value={`${doneCount}/${total}`} />
            <Tile label={t('courseComplete')} value={`${pct}%`} />
          </div>
          <button onClick={share} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-fg hover:brightness-110">
            <Icon name="share" size={16} /> {t('shareScore')}
          </button>
          <button onClick={feedback} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-accent/40 py-2.5 text-sm font-semibold text-accent hover:bg-accent/10">
            <Icon name="chat" size={16} /> {t('feedback')}
          </button>
          <button onClick={onDiploma} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-rank/40 py-2.5 text-sm font-semibold text-rank hover:bg-rank/10">
            <Icon name="certificate" size={16} /> {lang === 'ro' ? 'Diploma mea' : 'My diploma'}
          </button>
        </Section>

        <Section title={`${t('achievements')} · ${ACHIEVEMENTS.filter(a => a.done(achState)).length}/${ACHIEVEMENTS.length}`}>
          <div className="grid grid-cols-2 gap-2">
            {ACHIEVEMENTS.map(a => {
              const done = a.done(achState)
              return (
                <div key={a.id} className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${done ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface opacity-60'}`}>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${done ? 'bg-primary/15 text-primary' : 'bg-panel text-faint'}`}><Icon name={done ? a.icon : 'lock'} size={17} /></span>
                  {/* Wrapping, not truncating: two columns on a 320 px phone leave each cell ~74 px
                      of text, where "Termină un modul întreg" needs 115 — an achievement you cannot
                      read is not a reward. The grid equalises row heights, so the cards stay tidy. */}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-fg">
                      {L(a.title, lang)}
                      {/* The earned/locked state is carried by the lock icon, the tint and the
                          dimming — all three visual, and the icon is aria-hidden as decoration. So
                          every one of the eleven tiles read identically to a screen reader whether
                          it had been earned or not. This word is the only announcement of state. */}
                      <span className="sr-only">{` — ${done ? (lang === 'ro' ? 'obținută' : 'earned') : (lang === 'ro' ? 'blocată' : 'locked')}`}</span>
                    </div>
                    <div className="text-[0.625rem] text-faint">{L(a.desc, lang)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

        <Section title={t('appearance')}>
          <Seg options={[['ro', 'Română'], ['en', 'English']]} value={lang} onChange={v => setLang(v as 'ro' | 'en')} />
          <div className="mt-2">
            <Seg options={[['dark', t('darkL')], ['light', t('lightL')]]} value={theme} onChange={setTheme} />
          </div>
        </Section>

        <Section title={t('settings')}>
          <div className="flex flex-col gap-2">
            <Toggle label={t('studyMode')} hint={t('studyModeHint')} on={studyMode} onToggle={() => setStudyMode(!studyMode)} />
            <Toggle label={t('sound')} on={sound} onToggle={() => setSound(!sound)} />
            <Toggle label={t('haptics')} on={haptics} onToggle={() => setHaptics(!haptics)} />
          </div>
        </Section>

        <Section title={t('dailyGoal')}>
          <div className="grid grid-cols-4 gap-2">
            {/* Same fix the theme/language toggles below already carry: which chip is chosen was
                border + tint + text colour, i.e. colour alone, and without aria-pressed a screen
                reader announced all four identically. The tick is the non-colour cue, aria-pressed
                the spoken one. */}
            {goals.map((gg, i) => (
              <button key={gg} onClick={() => setGoal(gg)} aria-pressed={goal === gg}
                className={`rounded-xl border py-2 text-xs font-semibold ${goal === gg ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted hover:text-fg'}`}>
                <span className="block font-mono tabular-nums">{goal === gg && <span aria-hidden className="mr-0.5">✓</span>}{gg} XP</span>
                {/* the selected chip sits on a primary tint, where "faint" drops to 4.2:1 — the
                    sub-label has to step up with the background it lands on */}
                <span className={`block text-[0.625rem] font-normal ${goal === gg ? 'text-muted' : 'text-faint'}`}>{t(goalLabel[i])}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title={lang === 'ro' ? 'Backup progres' : 'Progress backup'}>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={exportProgress} className="flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold text-muted hover:text-fg">
              <Icon name="share" size={16} /> {lang === 'ro' ? 'Exportă' : 'Export'}
            </button>
            <button onClick={importProgress} className="flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold text-muted hover:text-fg">
              <Icon name="loop" size={16} /> {lang === 'ro' ? 'Importă' : 'Import'}
            </button>
          </div>
        </Section>

        {/* test-only shortcut: present while developing, stripped from the production bundle */}
        {import.meta.env.DEV && (
          <button onClick={() => addCoins(9999)}
            className="mb-2 w-full rounded-xl border border-warn/40 py-2.5 text-sm font-semibold text-warn hover:bg-warn/10">
            + 9999 Volți (test)
          </button>
        )}
        <button onClick={() => setAskReset(true)}
          className="w-full rounded-xl border border-fault-500/40 py-2.5 text-sm font-semibold text-danger hover:bg-fault-500/10">
          {t('resetProgress')}
        </button>
      </div>

      <ConfirmDialog open={askReset} danger message={t('resetConfirm')} confirmLabel={t('resetProgress')}
        onConfirm={() => { setAskReset(false); reset() }} onCancel={() => setAskReset(false)} />

      {/* The entry count is part of the question: it is the one signal that tells the student the
          file really is their backup before they agree to overwrite what they have.
          confirmLabel is explicit for the same reason the other three confirmations set it — this
          one used to fall through to the generic "Continuă", on the single most destructive button
          in the app, under a question a student may only half-read. */}
      {/* BOTH counts, not just the incoming one. The import guard requires at least one meem_ entry,
          which a truncated or hand-edited file can satisfy with a single key — and the apply then
          wipes every key before writing that one back. "(1 entries)" alone does not warn anybody:
          nobody knows how many entries their own profile has, so the number carries no meaning until
          it sits next to the number it is replacing. "Replace 24 entries with 1?" is a question a
          student can actually answer. */}
      <ConfirmDialog open={!!pendingImport} danger
        message={lang === 'ro'
          ? `Înlocuiești progresul actual (${keysLocal('meem_').length} intrări) cu backup-ul (${Object.keys(pendingImport ?? {}).length} intrări)?`
          : `Replace your current progress (${keysLocal('meem_').length} entries) with the backup (${Object.keys(pendingImport ?? {}).length} entries)?`}
        confirmLabel={lang === 'ro' ? 'Înlocuiește' : 'Replace'}
        onConfirm={() => {
          const data = pendingImport ?? {}
          setPendingImport(null)
          // importProgress already filtered this to meem_ keys with string values, so the wipe can
          // only happen when there is something real to write back in its place.
          keysLocal('meem_').forEach(removeLocal)
          for (const [k, val] of Object.entries(data)) writeLocal(k, String(val))
          location.reload()
        }}
        onCancel={() => setPendingImport(null)} />

      <FeedbackDialog open={showFeedback} stats={feedbackStats()} onCopied={say} onClose={() => setShowFeedback(false)} />

      {/* These notices exist precisely so a button never looks dead (round 39). For someone using a
          screen reader the notice IS the whole confirmation, so it has to be announced — and the
          region must already exist when the text arrives, hence the always-present wrapper. */}
      <div role="status" aria-live="polite">
        {notice && (
          <div className="anim-slideup fixed inset-x-6 bottom-24 z-[70] mx-auto max-w-xs rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-center text-sm text-fg">{notice}</div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">{title}</h3>
      {children}
    </section>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2">
      <div className="font-mono text-sm font-semibold tabular-nums text-fg">{value}</div>
      <div className="text-[0.6875rem] text-faint">{label}</div>
    </div>
  )
}

function Seg({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length},1fr)` }}>
      {/* Selection used to be carried by colour alone — same text, same weight, only the border
          and tint changed — and no aria-pressed, so a screen reader announced both options
          identically. The tick is the non-colour cue; aria-pressed is the spoken one.
          py-3, not py-2: these were 38 px tall, the shortest targets in the app after the Teorie
          pill. They are grid children with their own gap, so growing the box is free — no ::before
          needed, the row simply gets taller. */}
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} aria-pressed={value === v}
          className={`rounded-xl border py-3 text-sm font-semibold ${value === v ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted hover:text-fg'}`}>
          {value === v && <span aria-hidden className="mr-1">✓</span>}{label}
        </button>
      ))}
    </div>
  )
}

function Toggle({ label, hint, on, onToggle }: { label: string; hint?: string; on: boolean; onToggle: () => void }) {
  return (
    // A plain <button> announced "Mod Studiu, button" and never said on or off — the state was in
    // the knob's position and nowhere else. role="switch" + aria-checked is the whole fix; the
    // visual is already fine, since the knob slides rather than only changing colour.
    <button onClick={onToggle} role="switch" aria-checked={on} className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-left">
      <span>
        <span className="block text-sm font-medium text-fg">{label}</span>
        {hint && <span className="block text-xs text-faint">{hint}</span>}
      </span>
      <span className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${on ? 'bg-primary' : 'bg-panel'}`}>
        <span className={`h-5 w-5 rounded-full bg-white transition ${on ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  )
}



// Extracted from inside the Settings sheet, for the reason Confirm.tsx spells out: the sheet carries
// .anim-sheet, and a transformed ancestor becomes the containing block for its fixed descendants —
// so this panel's "fixed inset-0" backdrop measured 441×709 at (419,15) on a 1280×720 screen. It
// covered the sheet, not the page: the app to its left stayed undimmed and a click there did not
// dismiss it, though dismiss-on-backdrop is exactly what that div is for. Portalled to <body> now,
// and given its own useDismiss at priority 1 so Escape and Back close THIS panel rather than the
// whole Settings sheet underneath it, and so focus actually lands inside when it opens.
function FeedbackDialog({ open, stats, onCopied, onClose }: {
  open: boolean; stats: string; onCopied: (m: string) => void; onClose: () => void
}) {
  const { t, lang } = useT()
  useDismiss(onClose, { enabled: open, priority: 1 })
  if (!open) return null
  const subject = lang === 'ro' ? 'Feedback aplicație MEE' : 'MEE app feedback'
  const body = `${lang === 'ro' ? 'Impresiile mele (scrie aici):' : 'My feedback (write here):'}


---
${stats}`
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-6" onClick={onClose}>
      <div className="anim-sheet w-full max-w-xs rounded-2xl border border-border bg-surface p-5 text-center"
        onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
        aria-label={lang === 'ro' ? 'Trimite feedback' : 'Send feedback'}>
        <p className="text-sm text-muted">{lang === 'ro' ? 'Scrie-ne la adresa:' : 'Write to us at:'}</p>
        <p className="mt-1 select-all break-all font-mono text-sm text-accent">{FEEDBACK_EMAIL}</p>
        <button onClick={async () => { onClose(); onCopied(await copyText(FEEDBACK_EMAIL) ? t('copied') : FEEDBACK_EMAIL) }}
          className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-fg hover:brightness-110">
          {lang === 'ro' ? 'Copiază adresa' : 'Copy the address'}
        </button>
        {/* a real anchor, not location.href = mailto: — with no mail client the anchor simply does
            nothing and the address above is still readable and copyable */}
        <a href={`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
          onClick={onClose}
          className="mt-2 block w-full rounded-xl border border-border py-3 text-sm font-semibold text-muted hover:text-fg">
          {lang === 'ro' ? 'Deschide aplicația de e-mail' : 'Open the mail app'}
        </a>
        <button onClick={onClose} className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium text-faint hover:bg-surface-2">{t('close')}</button>
      </div>
    </div>,
    document.body,
  )
}
