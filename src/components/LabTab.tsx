import { useState } from 'react'
import { EQUIPMENT, type Equip } from '../content/equipment'
import { earnedEquip } from '../content/modules'
import { infoFor } from '../content/equipmentInfo'
import { hueFg } from '../ui/hue'
import { useGame, HEART_REFILL_COST, MAX_HEARTS } from '../store'
import { useT, L } from '../i18n'
import { Icon } from './icons'
import LabBench, { BENCHES, type BenchTheme } from './LabBench'
import { playBuy } from '../ui/audio'
import { vibrate } from '../ui/haptics'
import { useDismiss } from '../ui/useDismiss'

export default function LabTab() {
  const { inventory, bench, setBench, completed, theme } = useGame()
  const { t, lang } = useT()
  const [preview, setPreview] = useState<Equip | null>(null)
  const earned = earnedEquip(completed)
  // `bench` is persisted as a bare string, and usePersisted's shape guard only checks the TYPE —
  // any string survives it. A value that matches no bench (a progress file imported from another
  // build, or a bench id renamed in a future release) crashed the whole app the moment this tab
  // was opened, and left the shop empty on the way. Reloading did not help: the value is saved, so
  // the tab stayed broken and "Reset data" — losing every finished lesson — was the only way out.
  const benchId = (BENCHES.some(b => b.id === bench) ? bench : BENCHES[0].id) as BenchTheme
  const items = EQUIPMENT.filter(e => e.bench === benchId)
  const owned = items.filter(e => inventory.includes(e.id) || earned.has(e.id))

  return (
    <div className="px-4 py-4">
      {/* Always-visible one-liner so the purpose of this tab is obvious. */}
      <p className="mb-3 flex items-start gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs leading-relaxed text-muted">
        <Icon name="coin" size={14} className="mt-0.5 shrink-0 text-coin" />{t('labPurpose')}
      </p>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg">{t('myBench')}</h2>
        <span className="font-mono text-xs tabular-nums text-faint">{owned.length}/{items.length}</span>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface-2 p-1">
        {BENCHES.map(b => (
          <button key={b.id} onClick={() => setBench(b.id)} aria-pressed={benchId === b.id}
            className={`rounded-lg py-1.5 text-xs font-semibold transition ${benchId === b.id ? 'bg-panel text-primary shadow-sm' : 'text-muted hover:text-fg'}`}>
            {lang === 'ro' ? b.ro : b.en}
          </button>
        ))}
      </div>
      <LabBench theme={benchId} />
      {owned.length === 0 && <p className="mb-1 mt-2 text-center text-xs text-faint">{t('emptyLab')}</p>}

      <HeartRefill />

      <h2 className="mb-3 mt-5 text-sm font-semibold text-fg">{t('shop')}</h2>
      <div className="grid grid-cols-2 gap-3">
        {items.map(e => {
          const isOwned = inventory.includes(e.id) || earned.has(e.id)
          const info = infoFor(e.id)
          return (
            // Named explicitly for the same reason the quest claim buttons were: with no label the
            // accessible name was the whole card run together — "Voltmetru analogicInstrumentc.c. ·
            // 0–30 V · magnetoelectric · clasă 1,5 · Ri ≈ 20 kΩ/V30" — ending in a bare price that
            // reads as one more spec. The coin glyph beside it is aria-hidden and `text-coin` is a
            // colour, so nothing said "Volți" and nothing said the card opens anything. The specs
            // are not lost: this button's only job is to open the sheet that repeats them in full.
            <button key={e.id} onClick={() => setPreview(e)}
              aria-label={`${L(e.name, lang)}, ${L(e.category, lang)} — ${isOwned ? t('owned') : `${e.cost} ${t('coins')}`} · ${lang === 'ro' ? 'vezi detalii' : 'view details'}`}
              className={`flex flex-col rounded-2xl border p-3 text-left transition hover:brightness-110 ${isOwned ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface'}`}>
              <div className="flex items-start justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-panel" style={{ color: hueFg(e.hex, theme) }}>
                  <Icon name={e.icon} size={28} />
                </span>
                {/* ownership is already stated in the status row below (where the price sits) and by
                    the card's green border — a pill here just says "Deținut" twice */}
              </div>
              <div className="mt-1 text-xs font-semibold leading-tight text-fg">{L(e.name, lang)}</div>
              <div className="text-[0.625rem] text-faint">{L(e.category, lang)}</div>
              {info?.specs && <div className="mt-0.5 font-mono text-[0.5625rem] leading-tight text-muted">{L(info.specs, lang)}</div>}
              <div className="mt-2 flex items-center gap-1 font-mono text-xs font-semibold text-coin">
                {isOwned ? <span className="text-primary">✓ {t('owned')}</span> : <><Icon name="coin" size={13} /> {e.cost}</>}
              </div>
            </button>
          )
        })}
      </div>

      {preview && <Preview item={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

function Preview({ item, onClose }: { item: Equip; onClose: () => void }) {
  const { coins, inventory, buy, sound, haptics, skins, setSkin, completed, theme } = useGame()
  const { t, lang } = useT()
  const owned = inventory.includes(item.id) || earnedEquip(completed).has(item.id)
  const affordable = coins >= item.cost
  const doBuy = () => { if (buy(item.id, item.cost)) { if (sound) playBuy(); if (haptics) vibrate([10, 30]) } }
  const isSkin = !!item.isSkin
  const info = infoFor(item.id)
  useDismiss(onClose)
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="anim-sheet mx-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-5" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
        aria-label={L(item.name, lang)}>
        <div className="mb-3 flex justify-center">
          <span className="grid h-28 w-28 place-items-center rounded-2xl border border-border bg-panel" style={{ color: hueFg(item.hex, theme), boxShadow: `inset 0 0 30px -8px ${item.hex}` }}>
            <Icon name={item.icon} size={64} />
          </span>
        </div>
        <h3 className="text-center font-display text-lg font-semibold text-fg">{L(item.name, lang)}</h3>
        <p className="mb-3 text-center text-[0.6875rem] uppercase tracking-wide text-faint">{L(item.category, lang)}</p>
        <p className="mb-3 text-center text-sm leading-relaxed text-muted">{L(item.desc, lang)}</p>
        {info?.specs && (
          <div className="mb-3 rounded-lg border border-border bg-panel px-3 py-2 text-center font-mono text-xs text-primary">{L(info.specs, lang)}</div>
        )}
        {info?.glossary && info.glossary.length > 0 && (
          <ul className="mb-3 flex flex-col gap-1.5">
            {info.glossary.map((g, i) => (
              <li key={i} className="flex gap-2 text-xs leading-snug text-muted">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                <span>{L(g, lang)}</span>
              </li>
            ))}
          </ul>
        )}
        {item.isSkin && item.skinFor && info?.upgradeSpecs && (() => {
          const base = item.skinFor ? infoFor(item.skinFor) : undefined
          // An upgrade can be bought before the instrument it upgrades — deliberately, so the order
          // never strands anyone — but nothing said so. Measured: 300 Volți spent on the precision
          // multimeter with no multimeter owned, five times the base instrument's own price, and
          // the sheet read exactly as it does when you do own it. Say the condition out loud, the
          // way "Volți insuficienți" and "Inimi complete" already do elsewhere.
          const baseEq = EQUIPMENT.find(e => e.id === item.skinFor)
          const baseOwned = !!item.skinFor && (inventory.includes(item.skinFor) || earnedEquip(completed).has(item.skinFor))
          return (
            <div className="mb-3 rounded-lg border border-volt-400/40 bg-volt-400/5 px-3 py-2 text-center text-xs">
              <div className="mb-1 text-[0.625rem] font-semibold uppercase tracking-wide text-faint">Upgrade</div>
              {base?.specs && <div className="font-mono text-[0.6875rem] text-muted line-through">{L(base.specs, lang)}</div>}
              <div className="mt-0.5 font-mono text-[0.6875rem] font-semibold text-warn">→ {L(info.upgradeSpecs, lang)}</div>
              {!baseOwned && baseEq && (
                <div className="mt-1.5 border-t border-volt-400/30 pt-1.5 text-[0.6875rem] text-muted">
                  {lang === 'ro'
                    ? `Nu ai încă „${L(baseEq.name, lang)}” (${baseEq.cost} Volți). Upgrade-ul se poate cumpăra oricând, dar apare pe bancă abia după aparatul de bază.`
                    : `You do not own “${L(baseEq.name, lang)}” yet (${baseEq.cost} Volts). The upgrade can be bought at any time, but it only shows on the bench once you have the base instrument.`}
                </div>
              )}
            </div>
          )
        })()}
        {info?.principle && (
          <div className="mb-4">
            <div className="mb-1 text-[0.625rem] font-semibold uppercase tracking-wide text-faint">{lang === 'ro' ? 'Principiu de funcționare' : 'Working principle'}</div>
            <p className="text-sm leading-relaxed text-muted">{L(info.principle, lang)}</p>
          </div>
        )}
        {owned ? (
          isSkin ? (
            (() => {
              // Several skins can compete for ONE slot — the three lab templates all target
              // '__lab__' — so the state is three-valued, not two: default, this one, or a
              // DIFFERENT one. Treating it as a boolean made the sheet lie: with Gold applied,
              // opening Bronze ticked "Implicit", telling the student the bench was on the default
              // while it was in fact gold. Reproduced by buying both. Now "Implicit" is ticked only
              // when the slot really is default, and when a rival holds it the sheet says which.
              const slot = item.skinFor!
              const active = skins[slot]
              const isDefault = !active || active === 'default'
              const isThis = active === item.id
              const rival = !isDefault && !isThis ? EQUIPMENT.find(e => e.id === active) : undefined
              return (
                <div>
                  <div className="mb-2 text-center text-xs text-faint">
                    {rival
                      ? (lang === 'ro' ? `Activ acum: ${L(rival.name, lang)}` : `Currently applied: ${L(rival.name, lang)}`)
                      : (lang === 'ro' ? 'Skin activ' : 'Active skin')}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Which one is applied was signalled by colour and nothing else — identical
                        text, identical weight — and neither button carried aria-pressed, so both
                        read the same to a screen reader. Tick added as the non-colour cue. */}
                    <button onClick={() => setSkin(slot, 'default')} aria-pressed={isDefault}
                      className={`rounded-xl border py-2.5 text-sm font-semibold ${isDefault ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted hover:text-fg'}`}>
                      {isDefault && <span aria-hidden className="mr-1">✓</span>}{lang === 'ro' ? 'Implicit' : 'Default'}
                    </button>
                    <button onClick={() => setSkin(slot, item.id)} aria-pressed={isThis}
                      style={isThis ? { borderColor: hueFg(item.tone ?? item.hex, theme), color: hueFg(item.tone ?? item.hex, theme) } : undefined}
                      className={`rounded-xl border py-2.5 text-sm font-semibold ${isThis ? 'bg-panel' : 'border-border text-muted hover:text-fg'}`}>
                      {isThis && <span aria-hidden className="mr-1">✓</span>}{lang === 'ro' ? 'Activează ★' : 'Apply ★'}
                    </button>
                  </div>
                </div>
              )
            })()
          ) : (
            <div className="rounded-xl bg-primary/10 py-3 text-center text-sm font-semibold text-primary">✓ {t('owned')}</div>
          )
        ) : (
          <button onClick={doBuy} disabled={!affordable}
            className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-3 font-mono text-sm font-semibold ${affordable ? 'bg-primary text-primary-fg hover:brightness-110' : 'cursor-not-allowed bg-panel text-faint'}`}>
            <Icon name="coin" size={15} /> {item.cost} · {affordable ? t('buy') : t('notEnough')}
          </button>
        )}
        <button onClick={onClose} className="mt-2 w-full py-2 text-sm text-muted hover:text-fg">{t('close')}</button>
      </div>
    </div>
  )
}

// Hearts come back on their own each day; this is the impatient route, and it gives the Volți a
// second purpose besides instruments. Hidden in Study Mode, where hearts are not used at all.
function HeartRefill() {
  const { hearts, coins, studyMode, buyHearts, sound, haptics } = useGame()
  const { t, lang } = useT()
  if (studyMode) return null
  const ro = lang === 'ro'
  const full = hearts >= MAX_HEARTS
  const canBuy = !full && coins >= HEART_REFILL_COST
  const heartsLabel = ro ? `${hearts} din ${MAX_HEARTS} inimi` : `${hearts} of ${MAX_HEARTS} hearts`
  return (
    <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
      {/* Third copy of the same widget, and the only one that was never labelled: the HUD and the
          lesson player both name it. The count lives purely in how many of the five icons are dimmed
          — no text at all — so unlabelled it announced nothing and the neighbouring "Reumple
          inimile" says how to fix the level, not what it currently is. */}
      <span className="flex shrink-0 items-center gap-0.5 text-danger" role="img" aria-label={heartsLabel} title={heartsLabel}>
        {Array.from({ length: MAX_HEARTS }).map((_, i) => <Icon key={i} name="heart" size={13} className={i < hearts ? '' : 'opacity-25'} />)}
      </span>
      <span className="min-w-0 flex-1 text-xs text-muted">{full ? t('heartsFull') : t('heartsRefill')}</span>
      {/* The button's whole content is a coin glyph and a number, so its accessible name was the
          bare "40" — "button, 40", with no hint that it buys hearts. The sentence next to it is a
          sibling, not part of the name.
          The name also follows the STATE, the way the equipment buttons above already do
          (`affordable ? t('buy') : t('notEnough')`). A fixed "Reumple inimile — 40 Volți" was read
          out unchanged while the button sat disabled with five hearts already in hand: an action
          announced as available, dimmed, with the reason — "Inimi complete" — written only in the
          sibling text a screen reader never reaches from here. */}
      <button
        onClick={() => { if (buyHearts()) { if (sound) playBuy(); if (haptics) vibrate([10, 30, 10]) } }}
        disabled={!canBuy}
        aria-label={full
          ? t('heartsFull')
          : `${t('heartsRefill')} — ${HEART_REFILL_COST} ${t('coins')}${coins < HEART_REFILL_COST ? ` · ${t('notEnough')}` : ''}`}
        className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-fg hover:brightness-110 disabled:cursor-not-allowed disabled:bg-panel disabled:text-faint">
        <Icon name="coin" size={12} /> {HEART_REFILL_COST}
      </button>
    </div>
  )
}
