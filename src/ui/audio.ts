// Tiny WebAudio SFX engine — no assets, synthesised on the fly. Caller gates on the `sound` setting.
let ctx: AudioContext | null = null

function ac(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    // 'closed' is not recoverable by resume() — every call on a closed context throws. A context
    // gets closed out from under us by the platform, not by this app: iOS hands audio focus to an
    // incoming call, Android can reclaim one under memory pressure. Only 'suspended' was handled,
    // so after any such interruption the app was left holding a permanently dead context.
    if (ctx && ctx.state === 'closed') ctx = null
    if (!ctx) ctx = new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch { return null }
}

// Nothing in here may reach the caller. playCorrect()/playWrong() are called from the middle of
// LessonPlayer.check(), AFTER the XP and the SRS grade have been applied but BEFORE setSolved() —
// and check() holds `gradingRef` until the student EDITS their answer. So a throw here used to
// leave the run in the worst possible state: the mark counted, no verdict shown, and Verifică dead
// because the guard never reopened. On a numeric question typing a digit recovers it; on a
// multiple-choice one there is nothing to edit, so the only way out was to abandon the lesson.
function tone(freq: number, dur: number, when = 0, type: OscillatorType = 'sine', gain = 0.08) {
  try {
    const c = ac(); if (!c) return
    const o = c.createOscillator(), g = c.createGain()
    o.type = type; o.frequency.value = freq
    const t0 = c.currentTime + when
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.linearRampToValueAtTime(gain, t0 + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    o.connect(g); g.connect(c.destination)
    o.start(t0); o.stop(t0 + dur + 0.03)
  } catch { /* sound is decoration; it must never be able to interrupt grading */ }
}

export const playCorrect = () => { tone(660, 0.12, 0, 'sine', 0.09); tone(988, 0.14, 0.055, 'sine', 0.07) }
export const playWrong = () => { tone(196, 0.18, 0, 'sawtooth', 0.05); tone(130, 0.20, 0.02, 'sine', 0.05) }
export const playLevelUp = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.20, i * 0.09, 'triangle', 0.08))
export const playChest = () => { tone(880, 0.08, 0, 'square', 0.05); tone(1320, 0.14, 0.08, 'square', 0.05) }
export const playBuy = () => { tone(523, 0.07, 0, 'triangle', 0.06); tone(784, 0.1, 0.06, 'triangle', 0.05) }
