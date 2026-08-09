// Copying text is not one API but three, and the modern one is the most likely to be missing:
// navigator.clipboard exists only in a secure context and, in some WebViews, not at all. Reaching
// for it unguarded throws a TypeError that a bare catch then swallows — the button looks dead.
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true }
  } catch { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, text.length)   // iOS needs an explicit range
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch { return false }
}

// True when the user themselves dismissed the share sheet — that is not a failure to report.
export const isAbort = (e: unknown): boolean =>
  !!e && typeof e === 'object' && 'name' in e && (e as { name: string }).name === 'AbortError'
