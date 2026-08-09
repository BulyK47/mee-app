import { useEffect, useRef } from 'react'

// One hook for the two ways a user closes an overlay: the Escape key, and Android's hardware Back
// button — which on the platform this app ships to is *the* way anything gets closed.
//
// Back needs a history entry to consume. With none, Capacitor's default handler finds nothing to go
// back to and closes the whole application: a student pressing Back to leave a lesson would lose the
// run and land on the home screen. So one entry is held for as long as any overlay is open.
//
// The entry is held globally rather than per-overlay on purpose. Closing one overlay while opening
// another (Settings → Diploma) unmounts and mounts inside a single React commit; a per-overlay
// pushState/back pair would interleave those two history operations and the incoming overlay would
// eat the outgoing one's pop, closing itself the instant it appeared. Reconciling once per commit,
// in a microtask, makes that transition invisible to the history stack.
//
// Escape is dispatched to one handler rather than broadcast for the same reason a modal stack
// exists: every mounted overlay is listening, so a plain per-overlay listener would close the
// confirmation *and* the panel behind it with a single key press. `priority` lets a dialog that
// renders above its parent claim the top without depending on React's effect ordering.

type Entry = { fn: () => void; priority: number; seq: number }

const stack: Entry[] = []
let seq = 0
let held = false        // do we currently own a history entry?
let pending = false     // is a reconcile already queued for this commit?

const top = (): Entry | undefined =>
  stack.reduce<Entry | undefined>(
    (best, e) => (!best || e.priority > best.priority || (e.priority === best.priority && e.seq > best.seq) ? e : best),
    undefined)

// Bring the history stack in line with whether anything is open. Deferred to a microtask so a
// close-then-open pair inside one commit nets out to no history change at all.
function reconcile() {
  pending = false
  const want = stack.length > 0
  // Focus is settled on every stack change, not only when the history entry changes: opening a
  // confirmation over a panel leaves `want` true throughout, yet the topmost dialog has moved.
  if (want) captureFocus()
  else releaseFocus()
  if (want === held) return
  // `held` is claimed only once pushState has actually succeeded. Setting it first looked
  // equivalent, but pushState CAN throw — Firefox raises SecurityError after roughly 50 calls in
  // ten seconds, which a student flicking between overlays can reach. The old order then left
  // `held` true with no entry behind it, so the next close ran history.back() against a REAL
  // entry: on the web that navigates out of the app, and in the Capacitor build it closes it
  // outright — the exact failure this whole mechanism exists to prevent, reachable through its
  // own error path. Failing to borrow an entry must simply mean we never give one back.
  if (want) {
    try { history.pushState({ meeOverlay: true }, ''); held = true } catch { /* rate-limited — stay unclaimed */ }
  } else {
    held = false
    try { history.back() } catch { /* nothing to give back */ }
  }
}

function schedule() {
  if (pending) return
  pending = true
  queueMicrotask(reconcile)
}

// --- keyboard modality -------------------------------------------------------------------------
// Every overlay declares aria-modal="true", which is a promise to assistive technology that the
// rest of the page is inert. The tab order is a separate mechanism the browser owns, and it was not
// keeping that promise: opening a panel left focus on <body> and Tab still walked the 53 controls
// behind it. Handled here rather than at each call site because useDismiss is already what every
// overlay uses to say "I am an overlay" — the topmost [role=dialog] in the DOM is the one on top,
// since a portal appends last.
const FOCUSABLE = 'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
const topDialog = (): HTMLElement | null => {
  const all = document.querySelectorAll<HTMLElement>('[role="dialog"],[role="alertdialog"]')
  return all.length ? all[all.length - 1] : null
}
const focusablesIn = (el: HTMLElement) =>
  [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(e => e.offsetParent !== null)

let restoreTo: HTMLElement | null = null

// Where focus sat before any overlay opened. Needed as a *fallback* only, because reading
// document.activeElement inside captureFocus() is too late for a dialog that autofocuses one of
// its own controls: the Memorator's search box takes focus during React's commit, so a microtask
// later the opener button is already gone. That overlay used to skip the capture entirely (it hit
// the "dialog already holds focus" early return) and closing it dropped focus to <body> —
// measured — leaving a keyboard user to tab in from the top of the page again.
let lastOutside: HTMLElement | null = null

function captureFocus() {
  const dlg = topDialog()
  if (!dlg) return
  if (!restoreTo) {
    const active = document.activeElement
    const live = active instanceof HTMLElement && active !== document.body && !dlg.contains(active)
      ? active
      : null
    // The tracker wins over live focus. It names the control the user actually acted on, and it is
    // still right when the overlay autofocused one of its own fields during the same commit (the
    // Memorator's search box) — the case live focus cannot answer at all. It is also right on
    // touch, where the second overlay opened in a row would otherwise be handed back to the FIRST
    // one's opener, since tapping never moved focus off it. Live focus is the fallback for the
    // first open of a page load, before any gesture has been seen.
    restoreTo = (lastOutside?.isConnected ? lastOutside : null) ?? live
  }
  if (dlg.contains(document.activeElement)) return
  // focus the container, not the first control: a screen reader then announces the dialog itself,
  // and no button lights up as if the user had chosen it
  dlg.setAttribute('tabindex', '-1')
  dlg.focus({ preventScroll: true })
}

function releaseFocus() {
  const el = restoreTo
  restoreTo = null
  if (el && document.contains(el)) el.focus({ preventScroll: true })
}

if (typeof window !== 'undefined') {
  // Anything focused outside every overlay is a candidate to hand focus back to on close.
  window.addEventListener('focusin', e => {
    const t = e.target
    if (t instanceof HTMLElement && t !== document.body && !t.closest('[role="dialog"],[role="alertdialog"]'))
      lastOutside = t
  })
  // focusin alone is not a complete tracker. Tapping a <button> does not move DOM focus on iOS
  // Safari, and does not on several Android browsers either — which is the platform this app
  // ships to. There the tracker would still be null when an autofocusing overlay opens, so
  // closing it would drop focus to <body> for anyone who taps to open and then reaches for a
  // keyboard. The pointer event that opened the overlay names the same control and always fires,
  // so it is recorded as well. Capture phase: a handler that stops propagation must not blind us.
  window.addEventListener('pointerdown', e => {
    const t = e.target
    if (!(t instanceof Element)) return
    const hit = t.closest<HTMLElement>(FOCUSABLE)
    if (hit && !hit.closest('[role="dialog"],[role="alertdialog"]')) lastOutside = hit
  }, true)
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') { top()?.fn(); return }
    if (e.key !== 'Tab' || !stack.length) return
    const dlg = topDialog()
    if (!dlg) return
    const items = focusablesIn(dlg)
    if (!items.length) { e.preventDefault(); dlg.focus({ preventScroll: true }); return }
    const first = items[0], last = items[items.length - 1]
    const active = document.activeElement
    // Wrap at the ends, and pull focus back in if it has escaped to the page behind — which is
    // where it starts, since the container itself holds it when the dialog opens.
    // The container itself is focused right after opening. Tabbing forward from it would fall into
    // its subtree anyway, but shift-tabbing would step backwards into the page behind, so both
    // directions are pinned explicitly.
    if (active === dlg || !dlg.contains(active)) { e.preventDefault(); (e.shiftKey ? last : first).focus() }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
    else if (e.shiftKey && active === first) { e.preventDefault(); last.focus() }
  })
  window.addEventListener('popstate', () => {
    // Not our entry — either we already released it in reconcile(), or the page moved for some
    // other reason. Either way there is nothing to close.
    if (!held) return
    held = false
    const t = top()
    if (t) { t.fn(); schedule() }   // whatever stays open re-arms Back on the next commit
  })
}

export function useDismiss(onClose: () => void, opts: { enabled?: boolean; priority?: number } = {}) {
  const { enabled = true, priority = 0 } = opts
  // onClose is almost always a fresh arrow function per render; keeping it in a ref is what stops
  // the effect from re-running (and re-pushing history) on every single render.
  const cb = useRef(onClose)
  cb.current = onClose
  useEffect(() => {
    if (!enabled) return
    const entry: Entry = { fn: () => cb.current(), priority, seq: ++seq }
    stack.push(entry)
    schedule()
    return () => {
      const i = stack.indexOf(entry)
      if (i >= 0) stack.splice(i, 1)
      schedule()
    }
  }, [enabled, priority])
}
