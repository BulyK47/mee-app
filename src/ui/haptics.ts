// Best-effort haptics via the Vibration API (no-op where unsupported, e.g. iOS Safari). Caller gates on `haptics`.
export function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
  } catch { /* ignore */ }
}
