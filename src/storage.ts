// Every touch of localStorage goes through here.
//
// Reading or writing it THROWS, not returns null, when storage is unavailable: Safari private
// browsing, a browser where the user blocked site data, an Android WebView started with storage
// disabled. An unguarded read in a top-level provider therefore takes the whole app down before it
// renders anything. Failing soft costs only persistence — the app still runs, it just forgets.
export function readLocal(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

// Set once a real write has actually been refused. The probe below cannot see this on its own: a
// nearly-full quota still accepts one character while rejecting a few kilobytes of JSON, so the
// probe reports "storage works" and the student is told nothing while their finished lessons and
// review cards quietly fail to save. Measured: 3 of the 10 writes a completed lesson performs.
let writeRefused = false

export function writeLocal(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { writeRefused = true /* quota or storage disabled */ }
}

export function keysLocal(prefix: string): string[] {
  try { return Object.keys(localStorage).filter(k => k.startsWith(prefix)) } catch { return [] }
}

export function removeLocal(key: string): void {
  try { localStorage.removeItem(key) } catch { /* ignore */ }
}

// True when persistence actually works, so the UI can tell the student their progress is not saved.
// Two ways it can be false: the probe itself is refused (storage disabled outright), or a real
// write has already been refused (quota nearly full). The second is the quiet one — everything
// looks normal, small values still save, and only the large ones vanish.
export function storageWorks(): boolean {
  if (writeRefused) return false
  try {
    const k = '__meem_probe__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return true
  } catch { return false }
}
