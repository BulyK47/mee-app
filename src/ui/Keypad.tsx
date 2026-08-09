import { useT } from '../i18n'

// On-screen DMM-style numeric keypad. The readout is a real <input> so keyboard entry also works.
export function Keypad({ value, onChange, unit, disabled, tone, integerOnly }: {
  value: string
  onChange: (v: string) => void
  unit?: string
  disabled?: boolean
  tone: 'idle' | 'ok' | 'bad'
  integerOnly?: boolean
}) {
  const { t, lang } = useT()
  // A screen reader names an unlabelled input after its placeholder, so the most-used control in
  // the app announced itself as "0" — the student heard "edit, 0" and nothing about what to type.
  // The unit goes into the name too, since it is the other half of what the answer has to be.
  const answerLabel = unit ? `${t('placeholder')} (${unit})` : t('placeholder')
  // The separator follows the language, because the content does: measured over the bank, all 344
  // Romanian decimals are written "219,9" and all 344 English ones "219.9". In English the comma is
  // the THOUSANDS separator — the bank itself writes "3,600,000 J" — so a comma key there does not
  // just look foreign, it reads as the wrong separator entirely. parseNum accepts either, so this
  // changes only what the student sees and types, never how the answer is graded.
  const dec = lang === 'ro' ? ',' : '.'
  // On an integer-only exercise a separator cannot be part of any correct answer — gradeNumeric
  // rejects a non-integer outright — so offering the key can only lead somewhere wrong. Removing it
  // also closes the thousands-separator trap on the device this app is actually for: with no
  // separator key at all, "245.000" cannot be typed on a phone. On a physical keyboard it still
  // can, which is why the affected prompts say "Fără separator de mii" as well. The slot is left
  // empty rather than resized, so the digits stay where the student's thumb already expects them.
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', integerOnly ? '' : dec, '0', '⌫']
  const press = (k: string) => {
    if (disabled) return
    if (k === '⌫') onChange(value.slice(0, -1))
    else if (k === dec) { if (!/[.,]/.test(value)) onChange((value || '0') + dec) }
    else onChange(value + k)
  }
  const neg = () => { if (!disabled) onChange(value.startsWith('-') ? value.slice(1) : '-' + value) }
  const border = tone === 'ok' ? 'border-primary' : tone === 'bad' ? 'border-fault-500' : 'border-border'

  return (
    <div className="mt-2">
      <div className={`flex items-center gap-2 rounded-lg border bg-panel px-3 py-2.5 ${border}`}>
        {/* The key looks 32×32 and stays 32×32 in the layout; the ::before pseudo-element extends
            the tap area to 44 without occupying any space. Padding cannot do this — h-8 fixes the
            height and border-box puts the padding inside it — and a negative margin would move the
            neighbours. It matters because a mis-tap here silently negates what the student typed. */}
        <button onClick={neg} disabled={disabled} aria-label={lang === 'ro' ? 'Schimbă semnul' : 'Change sign'} className="relative grid h-8 w-8 shrink-0 place-items-center rounded-md bg-surface-2 font-mono text-sm text-muted active:scale-95 before:absolute before:-inset-1.5 before:content-['']">±</button>
        {/* outline-none removed the ONLY thing telling a keyboard user where they are: on a desktop
            the on-screen keypad is optional and typing goes straight into this field, so with no
            ring there was no focus indicator anywhere on the screen. focus-visible, not focus, so
            tapping a keypad button does not light the field up on a phone. */}
        <input value={value} onChange={e => onChange(e.target.value)} inputMode="decimal" disabled={disabled} placeholder="0" aria-label={answerLabel}
          className="min-w-0 flex-1 rounded bg-transparent text-right font-mono text-2xl tabular-nums text-primary outline-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-primary/70"
          style={{ textShadow: '0 0 8px var(--color-phosphor-glow)' }} />
        {unit && <span className="shrink-0 font-mono text-base font-medium text-warn">{unit}</span>}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {keys.map((k, i) => k === ''
          // the withheld separator slot: a spacer, NOT a disabled button. A key rendered with no
          // label would still be in the tab order and still announce itself, offering a control
          // that does nothing — and the grid needs the cell so 0 and ⌫ keep their positions.
          ? <div key={'gap' + i} aria-hidden="true" className="h-12" />
          : (
            <button key={k} onClick={() => press(k)} disabled={disabled}
              aria-label={k === '⌫' ? (lang === 'ro' ? 'Șterge ultima cifră' : 'Delete last digit')
                : k === dec ? (lang === 'ro' ? 'Virgulă zecimală' : 'Decimal point') : undefined}
              className="grid h-12 place-items-center rounded-lg border border-border bg-surface-2 font-mono text-lg text-fg transition hover:border-accent active:scale-95 disabled:opacity-50">
              {k}
            </button>
          ))}
      </div>
    </div>
  )
}
