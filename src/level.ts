// Cosmetic level derived from lifetime XP. Gentle super-linear curve: early levels come fast.
const threshold = (n: number) => (n <= 1 ? 0 : Math.round(50 * Math.pow(n, 1.6)))

export function levelInfo(xp: number) {
  // Start from the closed-form inverse of threshold() and correct, instead of counting up from 1.
  // The old loop ran xp^0.625 times: 1e9 XP was still instant, but 1e14 blocked the main thread for
  // ~1 s and it grows from there — an XP value no amount of play produces, yet one that arrives
  // whole through Settings' progress import or corrupted storage. A freeze is worse than a throw:
  // there is no ErrorBoundary behind it, so no crash screen and no "Reset data" to escape with.
  const x = Number.isFinite(xp) && xp > 0 ? xp : 0
  let level = Math.max(1, Math.floor(Math.pow(x / 50, 1 / 1.6)))
  // threshold() rounds, so the guess can sit a step either side of the true level. Measured over
  // every value from 0 to 300 000 plus decade probes out to 1e15, the correction is at most ONE
  // step up and none down — so the bound below is slack, not a cliff.
  //
  // It is a hard bound rather than a `while` for a reason: past 2^53 the guessed level is large
  // enough that `level + 1 === level`, so an unbounded correction loop compares the same threshold
  // forever and never advances. That is exactly the hang this rewrite exists to remove, moved to a
  // bigger input — 1e30 froze the tab until I capped the iterations.
  const FIX = 4
  for (let i = 0; i < FIX && level > 1 && threshold(level) > x; i++) level--
  for (let i = 0; i < FIX && threshold(level + 1) <= x; i++) level++
  const cur = threshold(level)
  const nxt = threshold(level + 1)
  const span = nxt - cur
  // `x`, not `xp`, from here on too: a NaN or negative saved value would otherwise reach the HUD as
  // "NaN XP" and a NaN bar width, having already been treated as 0 for the level itself. The floor
  // at 0 is a no-op whenever the correction above converged (threshold(level) <= x by then); it
  // only catches an absurd value that exhausted the iteration bound, which would otherwise print
  // "-Infinity XP" in the HUD.
  const into = Math.max(0, x - cur)
  return { level, into, span, pct: span > 0 ? Math.min(100, Math.round((into / span) * 100)) : 0 }
}
