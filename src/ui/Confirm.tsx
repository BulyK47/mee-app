import { useId } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../i18n'
import { useDismiss } from './useDismiss'

// In-app confirmation, replacing window.confirm().
//
// Native dialogs cannot be relied on: a browser suppresses them after the user dismisses a few
// ("prevent this page from creating additional dialogs" — confirm() then returns false with no UI),
// and an Android WebView ignores them entirely unless the host app implements onJsConfirm. Either
// way the button silently stops working, which is exactly how the exam became impossible to leave.
export function ConfirmDialog({ open, message, confirmLabel, danger = false, onConfirm, onCancel }: {
  open: boolean
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useT()
  const msgId = useId()
  useDismiss(onCancel, { enabled: open, priority: 1 })
  if (!open) return null
  // Rendered into <body> rather than in place. Every caller sits inside a sheet carrying the
  // .anim-sheet entrance animation, and a transformed ancestor becomes the containing block for its
  // fixed descendants — so "inset-0" would mean the sheet's box, not the screen: the backdrop stops
  // short and the dialog is dragged along by the animation instead of sitting still on top of it.
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-6" onClick={onCancel}>
      <div className="anim-sheet w-full max-w-xs rounded-2xl border border-border bg-surface p-5 text-center"
        onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby={msgId}>
        {/* The question IS the dialog's name. Without this the alertdialog had no accessible name
            at all, so a screen reader announced "alert dialog" and then whatever the focus landed
            on — the confirm button — with the thing being confirmed never spoken. */}
        <p id={msgId} className="text-sm leading-relaxed text-fg">{message}</p>
        <button onClick={onConfirm}
          className={`mt-4 w-full rounded-xl py-3 text-sm font-semibold ${danger ? 'bg-fault-500 text-ink-950' : 'bg-primary text-primary-fg'} hover:brightness-110`}>
          {confirmLabel ?? t('cont')}
        </button>
        {/* "Anulează", not "Închide": this button's job is to take back the question, and every
            caller is destructive. Two of them ask "Închizi lecția?" / "Închizi simularea?", where
            a cancel labelled "Închide" repeats the verb of the action it refuses — the student who
            wants to stay reads it as the way to stay, presses it, and either reading of the word
            is defensible, which is what makes it a defect rather than a preference. */}
        <button onClick={onCancel} className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium text-muted hover:bg-surface-2">
          {t('cancel')}
        </button>
      </div>
    </div>,
    document.body,
  )
}
