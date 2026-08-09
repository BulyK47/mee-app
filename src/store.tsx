import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { type SrsCard, srsKey, freshCard, gradeUp, gradeDown, isDue, daysBetween, GRADUATE_REPS } from './srs'
import { findExercise } from './content/course'
import { earnedEquip } from './content/modules'
import { writeLocal, removeLocal } from './storage'

function usePersisted<T>(key: string, initial: T, sanitise?: (v: T) => T) {
  // One reader, used both for the initial state and for the cross-tab listener below, so a value
  // arriving from another tab passes exactly the same null check, shape guard and sanitiser.
  const read = useCallback((): T => {
    try {
      const s = localStorage.getItem(key)
      if (s == null) return initial
      const parsed = JSON.parse(s)
      // Shape guard: if a saved value's basic type drifted from the default
      // (e.g. an array became a string after a data corruption), discard it and
      // fall back to the default instead of letting a later render crash.
      //
      // null is checked FIRST and separately, because it defeats both tests below: typeof null is
      // "object" and Array.isArray(null) is false, so a stored `null` sails through for every key
      // whose default is an object or an array — meem_streak, meem_daily, meem_quests, meem_srs,
      // meem_best, meem_completed. The state then IS null, and the first read of a member throws:
      // liveStreak does `if (!s.last)`, so the HUD crashes the whole app on load, with nothing to
      // do about it but clear site data. It is reachable: the progress file the student can import
      // from Settings is JSON they can hand-edit, and JSON.stringify writes `null` for a value that
      // ever became non-finite. A missing key already falls back (line above); a null one must too.
      if (parsed === null && initial !== null) return initial
      if (Array.isArray(initial) !== Array.isArray(parsed) || typeof initial !== typeof parsed) return initial
      // The guard above only inspects the OUTERMOST type, which is all most keys need. `sanitise`
      // is for the ones whose ELEMENTS get dereferenced: see meem_mistakes below.
      return sanitise ? sanitise(parsed as T) : (parsed as T)
    } catch { return initial }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const [v, setV] = useState<T>(read)

  // A second tab is a second copy of this state, and without this the two silently overwrite each
  // other. Every updater is `prev => next` over the state THIS tab read at mount, so the last tab
  // to act wins with a value computed from a stale base. Measured, with two tabs both at 100 Volți:
  // tab B bought the 30-Volt voltmeter (→ 70, inventory ["analog-vm"]); tab A then bought the
  // 35-Volt ammeter from its own stale 100 (→ 65, inventory ["analog-am"]). The student had paid
  // for the voltmeter and was left with neither it nor the 30 Volți — no error, nothing on screen.
  // The same shape loses XP, finished lessons, streak days and review cards.
  //
  // `storage` fires only in the OTHER tabs, never the one that wrote, so this cannot loop. Re-read
  // through `read` rather than trusting e.newValue, so a value arriving from another tab is held to
  // the same guards as one loaded at startup — a corrupt write elsewhere must not bypass them.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== localStorage) return
      // key === null means the other tab called clear(); every key is gone, so re-read them all
      if (e.key !== null && e.key !== key) return
      setV(read())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key, read])

  const set = useCallback((next: T | ((p: T) => T)) => {
    setV(prev => {
      const raw = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
      // A non-finite number never reaches storage, and never reaches state either. JSON.stringify
      // writes NaN and Infinity as `null`, so the two halves of this hook disagree the moment one
      // appears: the screen shows "NaN XP" from the value in memory, localStorage holds `null`, and
      // the read guard above then discards that null on the next load — a lifetime of XP and Volți
      // gone, with no error anywhere. The arithmetic is all `x => x + delta`, so a single undefined
      // delta poisons the counter permanently: NaN + anything stays NaN. Falling back to `prev`
      // keeps the last good value instead, which is the only choice that cannot lose progress.
      const val = typeof raw === 'number' && !Number.isFinite(raw) ? prev : raw
      // through writeLocal, not a private try/catch: this is where the LARGE values go
      // (meem_srs, meem_completed, meem_quests), so it is the path that actually notices a
      // nearly-full quota, and the one whose failure the student needs to be told about.
      writeLocal(key, JSON.stringify(val))
      return val
    })
  }, [key])
  return [v, set] as const
}

// Use the user's LOCAL calendar date (not UTC) so streaks match what they see.
const pad = (n: number) => String(n).padStart(2, '0')
const dayStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const today = () => dayStr(new Date())
const prevDay = (d: string) => { const t = new Date(d + 'T00:00:00'); t.setDate(t.getDate() - 1); return dayStr(t) }

export interface MistakeRef { lessonId: string; exId: string }
interface Streak { count: number; last: string }

// The stored count is rewritten only when a lesson is finished, so between a missed day and the
// next lesson the app would keep showing a streak the student no longer has — the flame, the
// Settings tile, the shared score and even the 7-day achievement all read that stale number. This
// derives what the streak actually is right now, using the same rules finishLesson applies.
export function liveStreak(s: { count: number; last: string }, freezes: number, t: string): number {
  if (!s.last) return 0
  const gap = Math.round((new Date(t + 'T00:00:00').getTime() - new Date(s.last + 'T00:00:00').getTime()) / 86400000)
  if (gap <= 1) return s.count            // today, yesterday, or a clock skewed forward: still alive
  const missed = gap - 1
  return freezes >= missed ? s.count : 0  // freezes can still cover the gap when the next lesson lands
}
interface Daily { date: string; xp: number }
// `reviews` and `exam` feed the post-course quest set (see content/quests.ts). They are read
// through `?? 0` everywhere because a profile saved before this existed has neither key.
interface Quests { date: string; lessons: number; xp: number; perfect: number; reviews: number; exam: number; claimed: string[] }
const EMPTY_QUESTS: Quests = { date: '', lessons: 0, xp: 0, perfect: 0, reviews: 0, exam: 0, claimed: [] }

interface GameCtx {
  xp: number
  coins: number
  completed: string[]
  best: Record<string, number>
  plays: Record<string, number>
  inventory: string[]
  streak: Streak
  streakLive: number
  daily: Daily
  quests: Quests
  goal: number
  studyMode: boolean
  hearts: number
  mistakes: MistakeRef[]
  liveMistakes: MistakeRef[]   // mistakes the loaded course can actually resolve
  srs: Record<string, SrsCard>
  bench: string
  skins: Record<string, string>
  theme: string
  sound: boolean
  haptics: boolean
  freezes: number
  onboarded: boolean
  finishLesson: (id: string, xp: number, coins: number, accuracy: number) => void
  buy: (itemId: string, cost: number) => boolean
  addCoins: (n: number) => void
  claimQuest: (id: string, reward: number) => void
  finishExam: (pct: number) => void
  gradeMistake: (ref: MistakeRef, correct: boolean) => void
  loseHeart: () => void
  refillHearts: () => void
  buyHearts: () => boolean
  setStudyMode: (b: boolean) => void
  setGoal: (n: number) => void
  setBench: (b: string) => void
  setSkin: (equipId: string, skinId: string) => void
  setTheme: (t: string) => void
  setSound: (b: boolean) => void
  setHaptics: (b: boolean) => void
  setFreezes: (n: number | ((p: number) => number)) => void
  setOnboarded: () => void
  reset: () => void
}
const Ctx = createContext<GameCtx>(null!)
const MAX_HEARTS = 5
// One perfect lesson pays about 44 Volți, so a refill costs roughly one lesson of work.
const HEART_REFILL_COST = 40

export function GameProvider({ children }: { children: ReactNode }) {
  const [xp, setXp] = usePersisted('meem_xp', 0)
  const [coins, setCoins] = usePersisted('meem_coins', 0)
  const [completed, setCompleted] = usePersisted<string[]>('meem_completed', [])
  // The third collection of the shape meem_quests and meem_srs already guard: an object the outer
  // type test accepts whole, whose VALUES are then used as if they were numbers. Here they are not
  // dereferenced — they are RENDERED. LearnTab prints `best[lesson.id]` as the per-lesson score, so
  // a value that is an object throws React error #31 ("Objects are not valid as a React child")
  // during render, and the whole app drops to the ErrorBoundary on EVERY load — measured, not
  // theorised. The only way out is "Resetează progresul", which destroys everything the student has.
  // Reachable the same way the others are: the backup file Settings imports is hand-editable JSON,
  // and JSON.stringify writes `null` for any value that ever became non-finite.
  // Repaired rather than dropped: a score is a plain number, so anything that reads as one is kept
  // (and clamped to 0–100, since it is shown as a percentage), and anything else falls back to 0 —
  // which reads as "not attempted" and is the safe direction, never inventing a perfect lesson.
  const [best, setBest] = usePersisted<Record<string, number>>('meem_best', {}, b => {
    const ok: Record<string, number> = {}
    for (const [k, v] of Object.entries(b || {})) {
      const n = typeof v === 'number' ? v : NaN
      ok[k] = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0
    }
    return ok
  })
  const [plays, setPlays] = usePersisted<Record<string, number>>('meem_plays', {})
  const [inventory, setInventory] = usePersisted<string[]>('meem_inventory', [])
  // The last two members of the same family as meem_best: a two-field object the outer type test
  // waves through, whose fields are then RENDERED. `streak.count` reaches the HUD flame, the
  // Settings tile and the shared score; `daily.xp` is the left-hand number of the daily-goal line.
  // Either one holding an object throws React error #31 during render and the app drops to the
  // ErrorBoundary on every load — measured for both, and the only escape is the reset that destroys
  // the student's progress. `streak.last` and `daily.date` were measured NOT to crash (they feed
  // date arithmetic, which yields NaN rather than throwing), but they are repaired here too: a
  // non-string date silently makes every gap NaN, so the streak stops advancing with nothing on
  // screen to say why. Repaired, not dropped — losing a streak to a corrupt field is its own defect.
  const numar = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
  const sir = (v: unknown) => (typeof v === 'string' ? v : '')
  const [streak, setStreak] = usePersisted<Streak>('meem_streak', { count: 0, last: '' },
    s => ({ count: Math.max(0, numar(s?.count)), last: sir(s?.last) }))
  const [daily, setDaily] = usePersisted<Daily>('meem_daily', { date: '', xp: 0 },
    d => ({ date: sir(d?.date), xp: Math.max(0, numar(d?.xp)) }))
  // Sanitised for the same reason meem_mistakes and meem_srs are, and it was the one collection of
  // this shape left without it. `claimed` is dereferenced with `.includes()` DURING RENDER — both
  // in content/quests.ts and in claimQuest — so a stored value that is not an array throws a
  // TypeError that no component catches. Measured: with `"claimed": 5` in storage the whole app
  // drops to the error boundary on EVERY load, and the student's only way out is "Reset progress",
  // which destroys everything they have. The outer shape guard cannot see this: the object itself
  // is a perfectly good object. A hand-edited progress file or a truncated import is all it takes.
  const [quests, setQuestsState] = usePersisted<Quests>('meem_quests', EMPTY_QUESTS, q => {
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
    return {
      date: typeof q?.date === 'string' ? q.date : '',
      lessons: num(q?.lessons), xp: num(q?.xp), perfect: num(q?.perfect),
      reviews: num(q?.reviews), exam: num(q?.exam),
      claimed: Array.isArray(q?.claimed) ? q.claimed.filter((x): x is string => typeof x === 'string') : [],
    }
  })
  const [goal, setGoalState] = usePersisted('meem_goal', 30)
  // Off by default, on purpose: a new student should first meet the app as something with a cost
  // to getting it wrong, so the habit of coming back is what forms. Unlimited practice is there to
  // be discovered in Settings, not handed over on the first screen. Only the DEFAULT changes —
  // anyone who has already chosen keeps their stored setting.
  const [studyMode, setStudyModeState] = usePersisted('meem_studymode', false)
  const [hearts, setHearts] = usePersisted('meem_hearts', MAX_HEARTS)
  const [heartsDay, setHeartsDay] = usePersisted('meem_heartsday', '')
  // Every consumer of this list reads r.lessonId / r.exId, so one malformed element is enough to
  // take the whole app to the crash screen — reproduced with a single `null` among the refs, which
  // a truncated write or a hand-edited backup can leave behind (Settings' import checks that each
  // meem_ value is a string, not what the JSON inside it contains). Drop the junk on load rather
  // than making six call sites defensive.
  const [mistakes, setMistakes] = usePersisted<MistakeRef[]>('meem_mistakes', [], m =>
    m.filter((r): r is MistakeRef =>
      !!r && typeof r === 'object' && typeof r.lessonId === 'string' && typeof r.exId === 'string'))
  // Sanitised for the same reason meem_mistakes is: its elements are dereferenced, and the shape
  // guard only inspects the outermost type. A card whose `due` is not a real date is worse than a
  // missing card — daysBetween returns NaN, `NaN <= 0` is false, so isDue says "not yet" forever:
  // the mistake can never be reviewed away and never leaves the queue, while the Learn tab renders
  // its next-review line from that same date and prints NaN. Cards are dropped rather than repaired,
  // which puts the exercise straight back in the due list where a lapsed card belongs.
  const [srs, setSrs] = usePersisted<Record<string, SrsCard>>('meem_srs', {}, s => {
    const ok: Record<string, SrsCard> = {}
    for (const [k, c] of Object.entries(s || {})) {
      if (!c || typeof c !== 'object') continue
      const { ease, interval, reps, lapses, due } = c as SrsCard
      if (![ease, interval, reps, lapses].every(n => typeof n === 'number' && Number.isFinite(n))) continue
      if (typeof due !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(due) || Number.isNaN(new Date(due + 'T00:00:00').getTime())) continue
      ok[k] = c as SrsCard
    }
    return ok
  })
  const [bench, setBench] = usePersisted('meem_bench', 'measurement')
  const [skins, setSkinsState] = usePersisted<Record<string, string>>('meem_skins', {})
  const setSkin = (equipId: string, skinId: string) => setSkinsState(s => ({ ...s, [equipId]: skinId }))
  const [theme, setTheme] = usePersisted('meem_theme', 'dark')
  const [sound, setSound] = usePersisted('meem_sound', true)
  const [haptics, setHaptics] = usePersisted('meem_haptics', true)
  const [freezes, setFreezes] = usePersisted('meem_freezes', 0)
  const [onboarded, setOnboardedState] = usePersisted('meem_onboarded', false)
  const setOnboarded = () => setOnboardedState(true)

  // Mistakes whose exercise the CURRENTLY LOADED course can resolve. The review queue and the
  // "due" badge read this, so a card that can never be reviewed cannot get them permanently stuck —
  // which is what a one-time cleanup on load used to achieve by DELETING those mistakes and their
  // SRS cards outright.
  //
  // That cleanup could not tell "this exercise was removed from the bank" from "this bank is not
  // loaded", and the second case is real: the question bank lives outside the public repository, so
  // a plain clone — or one deploy where the private content failed to build — resolves nothing.
  // Opening the app once under those conditions wiped every mistake and every SRS card, for good,
  // even after the bank came back. Reproduced: three stored mistakes and their cards, gone after a
  // single load of a build without content-private/. Settings already refused to delete for exactly
  // this reason and filters at the point of display; this now does the same.
  const liveMistakes = mistakes.filter(r => findExercise(r.lessonId, r.exId))

  // Hearts come back once per local day. Without this they only ever went down: nothing refilled
  // them and nothing stopped a lesson at zero, so the whole mechanic was decorative.
  //
  // Checked again whenever the app comes back to the foreground, not only on mount. This is a PWA
  // that students leave open; sitting at zero hearts when midnight passes used to mean staying
  // locked out until a manual reload, with the wall still saying "inimile revin mâine".
  //
  // The comparison is against a REF, not the state captured when the listener was registered —
  // that closure would keep seeing the day the app started on and hand out a fresh five on every
  // single tab focus, which is a free refill two clicks away and would make both the daily reset
  // and the 40-Volt price meaningless.
  const heartsDayRef = useRef(heartsDay); heartsDayRef.current = heartsDay
  useEffect(() => {
    let midnight: ReturnType<typeof setTimeout>
    const check = () => {
      const t = today()
      if (heartsDayRef.current === t) { armMidnight(); return }
      // Strictly LATER, not merely different. Comparing for inequality meant a clock moved BACKWARDS
      // also counted as a new day: sit at zero hearts, set the date back one day, switch away and
      // return, and the refill fires — repeatably, which is the free-hearts loop the ref above was
      // introduced to prevent, arriving through the calendar instead of through focus. When the
      // stored day is in the future the stamp is re-anchored to today WITHOUT refilling, so the
      // student neither gains hearts nor stays stuck once the real date catches up.
      const forward = daysBetween(heartsDayRef.current || t, t) > 0
      heartsDayRef.current = t          // synchronously, so a focus+visibility pair cannot double-fire
      setHeartsDay(t)
      if (forward || !heartsDay) setHearts(MAX_HEARTS)
      armMidnight()
    }
    // Listeners alone only notice a new day when the app is BACKGROUNDED and comes back. A student
    // who runs out of hearts at 23:58 and keeps the app open in front of them fires neither
    // visibilitychange nor focus, so at 00:10 the wall still reads "inimile revin mâine" while
    // tomorrow has already arrived — the exact complaint the foreground check was added for, in the
    // one case it does not cover. Re-armed on every run, so it follows the clock rather than
    // assuming 24 hours.
    const armMidnight = () => {
      clearTimeout(midnight)
      const now = new Date()
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5)
      // capped: setTimeout stores its delay in a 32-bit int, and anything over ~24.9 days fires
      // immediately, which would spin. A day is far below that, but a clock jump could not be.
      midnight = setTimeout(check, Math.min(Math.max(1000, next.getTime() - now.getTime()), 86_400_000))
    }
    check()
    const onWake = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)
    return () => {
      clearTimeout(midnight)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The other way back: pay for a refill with the Volți earned in lessons.
  // Every money action used to check state captured at RENDER time, then apply its change through a
  // functional setState. Three taps inside one tick therefore all saw the same "not yet bought / not
  // yet claimed" and all three went through: measured 200 → 110 Volți for a 30-Volt instrument, with
  // it landing in the inventory three times, and a 20-Volt quest reward paid out three times. On a
  // phone a repeated tap is not an edge case — it is what a student does when the first one seems
  // not to register. These mirrors are updated SYNCHRONOUSLY, before React can re-render, so the
  // second tap sees what the first one did; each render re-syncs them from the real state, so a
  // daily quest reset or a restored backup is picked up normally.
  const coinsRef = useRef(coins); coinsRef.current = coins
  const invRef = useRef(inventory); invRef.current = inventory
  const claimedRef = useRef(quests.claimed); claimedRef.current = quests.claimed
  const heartsRef = useRef(hearts); heartsRef.current = hearts
  const completedRef = useRef(completed); completedRef.current = completed

  const buyHearts = () => {
    if (heartsRef.current >= MAX_HEARTS || coinsRef.current < HEART_REFILL_COST) return false
    heartsRef.current = MAX_HEARTS
    coinsRef.current -= HEART_REFILL_COST
    setCoins(c => c - HEART_REFILL_COST)
    setHearts(MAX_HEARTS)
    return true
  }

  const finishLesson = (id: string, xpA: number, coinsA: number, accuracy: number) => {
    setXp(x => x + xpA)
    setCoins(c => c + coinsA)
    setCompleted(c => (c.includes(id) ? c : [...c, id]))
    setBest(b => ({ ...b, [id]: Math.max(b[id] ?? 0, accuracy) }))
    setPlays(p => ({ ...p, [id]: (p[id] || 0) + 1 }))
    const t = today()
    if (streak.last !== t) {
      if (!streak.last) setStreak({ count: 1, last: t })
      else {
        const gap = Math.round((new Date(t + 'T00:00:00').getTime() - new Date(streak.last + 'T00:00:00').getTime()) / 86400000)
        if (gap === 1) setStreak({ count: streak.count + 1, last: t })
        // gap < 0 means the SAVED date is in the future — the device clock was ahead when the last
        // lesson was recorded and has since been corrected, or the student moved west across a date
        // boundary (a lesson at 02:00 in Bucharest is still "yesterday" in New York). liveStreak()
        // already forgives exactly this ("a clock skewed forward: still alive") and the HUD kept
        // showing the full streak — but this path fell through to the reset below, so the counter
        // the student had just been shown as intact dropped to 1 the moment they finished a lesson.
        // The two must agree. The COUNT is kept — that is the whole point — but the anchor is moved
        // back to today, which the first version of this branch did not do. Leaving `last` in the
        // future froze the streak instead of breaking it: with a clock that jumped a month ahead
        // (a flat RTC battery, a failed time sync), every lesson for the next 31 days took this
        // same branch and wrote nothing, so a student practising daily watched the counter sit at
        // 12. Re-anchoring costs nothing real — the increment it "skips" was granted for a day that
        // never happened — and tomorrow gives gap === 1, so the streak grows again from here.
        else if (gap <= 0) setStreak({ count: streak.count, last: t })
        else {
          const missed = gap - 1
          if (missed >= 1 && freezes >= missed) { setFreezes(f => f - missed); setStreak({ count: streak.count + 1, last: t }) }
          else setStreak({ count: 1, last: t })
        }
      }
    }
    setDaily(d => (d.date === t ? { date: t, xp: d.xp + xpA } : { date: t, xp: xpA }))
    // Anti-farm: a replay of an already-completed lesson does NOT advance the
    // "finish N lessons" / "a perfect lesson" quests (only its decayed XP counts),
    // so quests can't be farmed by replaying one lesson.
    const isReplay = (plays[id] || 0) > 0
    const lc = isReplay ? 0 : 1
    const pc = isReplay ? 0 : (accuracy >= 100 ? 1 : 0)
    setQuestsState(q => (q.date === t
      ? { ...q, lessons: q.lessons + lc, xp: q.xp + xpA, perfect: q.perfect + pc }
      : { ...EMPTY_QUESTS, date: t, lessons: lc, xp: xpA, perfect: pc }))
  }

  // An exam attempt records its best score for the day, which is what the post-course "≥ 70%"
  // quest reads. Best-of, not last: a student who scores 80 and then tries again for practice and
  // gets 50 has still done the thing the quest asks for.
  const finishExam = (pct: number) => {
    const t = today()
    setQuestsState(q => (q.date === t
      ? { ...q, exam: Math.max(q.exam ?? 0, pct) }
      : { ...EMPTY_QUESTS, date: t, exam: pct }))
  }

  const claimQuest = (id: string, reward: number) => {
    if (claimedRef.current.includes(id)) return
    claimedRef.current = [...claimedRef.current, id]
    coinsRef.current += reward
    setCoins(c => c + reward)
    // the state updater re-checks as well: the ref stops the same-tick repeat, this stops anything
    // that could arrive from another path
    setQuestsState(q => (q.claimed.includes(id) ? q : { ...q, claimed: [...q.claimed, id] }))
  }

  const buy = (itemId: string, cost: number) => {
    // Owning something means bought OR won by finishing its module — the same distinction that
    // made the Colecționar badge stay locked on eight instruments. The shop UI already tests both,
    // so this is only reachable if a purchase races a module completion, but that is precisely the
    // case where a student would pay for gear they already have.
    if (invRef.current.includes(itemId) || earnedEquip(completedRef.current).has(itemId) || coinsRef.current < cost) return false
    invRef.current = [...invRef.current, itemId]
    coinsRef.current -= cost
    setCoins(c => c - cost)
    setInventory(inv => (inv.includes(itemId) ? inv : [...inv, itemId]))
    return true
  }

  const addCoins = (n: number) => setCoins(c => c + n)
  const sameRef = (a: MistakeRef, b: MistakeRef) => a.lessonId === b.lessonId && a.exId === b.exId

  // Spaced repetition: a wrong answer schedules/relapses the card (due today); a
  // correct answer advances its interval and, once mastered, retires it from the queue.
  const gradeMistake = (ref: MistakeRef, correct: boolean) => {
    const key = srsKey(ref)
    const t = today()
    if (correct) {
      const card = srs[key]
      const tracked = mistakes.some(x => sameRef(x, ref))
      if (!card && !tracked) return // fresh exercise answered right — was never a mistake
      // Only a success on or after the due date advances the schedule. Reviewing early is allowed
      // and costs nothing, but it must not count: "Greșelile mele" falls back to the whole backlog
      // when nothing is due, so four passes in one sitting would otherwise take a card from reps 0
      // to GRADUATE_REPS and drop it out of review the same day it was missed — spaced repetition
      // with the spacing removed. Getting it WRONG early still counts, because that is real
      // evidence; getting it right minutes after seeing it is not.
      if (card && !isDue(card, t)) return
      // Counts toward the post-course "review 5 mistakes" quest. Placed after the due-date guard on
      // purpose: the same reasoning that stops an early pass from advancing the SRS schedule stops
      // it from advancing the quest, so the quest cannot be farmed by re-reviewing one card.
      setQuestsState(q => (q.date === t ? { ...q, reviews: (q.reviews ?? 0) + 1 } : { ...EMPTY_QUESTS, date: t, reviews: 1 }))
      const up = gradeUp(card ?? freshCard(t), t) // legacy mistake without a card → seed then advance
      if (up.reps >= GRADUATE_REPS) {
        setMistakes(m => m.filter(x => !sameRef(x, ref)))
        setSrs(s => { const n = { ...s }; delete n[key]; return n })
      } else {
        setSrs(s => ({ ...s, [key]: up }))
      }
    } else {
      const card = srs[key]
      setSrs(s => ({ ...s, [key]: card ? gradeDown(card, t) : freshCard(t) }))
      setMistakes(m => (m.some(x => sameRef(x, ref)) ? m : [...m, ref]))
    }
  }

  const loseHeart = () => setHearts(h => Math.max(0, h - 1))
  const refillHearts = () => setHearts(MAX_HEARTS)
  // Switching Study Mode must NOT hand out hearts: it would be a free, instant refill two taps
  // away, making both the daily reset and the Volți price pointless. Hearts are simply unused
  // while Study Mode is on, and whatever is left is still there when it is turned off again.
  const setStudyMode = (b: boolean) => setStudyModeState(b)
  const setGoal = (n: number) => setGoalState(n)

  const reset = () => {
    setXp(0); setCoins(0); setCompleted([]); setBest({}); setInventory([])
    setStreak({ count: 0, last: '' }); setDaily({ date: '', xp: 0 }); setQuestsState(EMPTY_QUESTS)
    setHearts(MAX_HEARTS); setMistakes([]); setSrs({}); setSkinsState({}); setFreezes(0); setPlays({})
    // heartsDay belongs to the hearts mechanic, not to the student's preferences, so leaving it
    // behind made a reset half-done: hearts went back to five while the stamp still said "already
    // refilled today". PREFERENCES are deliberately kept — theme, sound, haptics, language, daily
    // goal, bench, study mode and the onboarding flag survive, because this button says "reset your
    // PROGRESS", and nobody asking for that wants the app back in English with onboarding replayed.
    // PRIVACY.md documents exactly this split; a full wipe is uninstalling or clearing site data.
    setHeartsDay('')
    // The diploma's issue date is progress, not a preference, and it is the one progress key that
    // does not live in usePersisted — Diploma.tsx writes it directly, once, the first time the
    // course is seen complete, and then refuses to rewrite it (that is the whole point: the
    // certificate must not change date every time it is opened). Left behind by reset(), a student
    // who resets and works through the course again receives a certificate dated to their FIRST
    // attempt — a document meant to be shown to someone else, carrying a date that is now wrong
    // and that nothing in the app can correct.
    removeLocal('meem_diploma_date')
  }

  return (
    <Ctx.Provider value={{
      xp, coins, completed, best, plays, inventory, streak, streakLive: liveStreak(streak, freezes, today()), daily, quests, goal, studyMode, hearts, mistakes, liveMistakes, srs, bench, skins,
      theme, sound, haptics, freezes, onboarded,
      finishLesson, buy, addCoins, claimQuest, finishExam, gradeMistake, loseHeart, refillHearts, buyHearts, setStudyMode, setGoal, setBench, setSkin,
      setTheme, setSound, setHaptics, setFreezes, setOnboarded, reset,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useGame = () => useContext(Ctx)
export { MAX_HEARTS, HEART_REFILL_COST, today as localToday }
