import { useEffect, useRef, useState } from 'react'

const prefersReduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// rAF ease-out count-up; jumps instantly under reduced-motion.
export function useCountUp(target: number, duration = 650, initial?: number): number {
  const [val, setVal] = useState(initial ?? target)
  const cur = useRef(initial ?? target) // latest displayed value, so an interrupted run resumes from screen
  useEffect(() => {
    const start = cur.current
    if (prefersReduced() || start === target) { setVal(target); cur.current = target; return }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const e = 1 - Math.pow(1 - p, 3)
      const v = Math.round(start + (target - start) * e)
      cur.current = v
      setVal(v)
      if (p < 1) raf = requestAnimationFrame(tick)
      else cur.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}
