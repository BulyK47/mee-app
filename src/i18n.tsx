import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Lang, Loc } from './types'
import { readLocal, writeLocal } from './storage'

// Content layer: pick a localized field, RO is the source-of-truth fallback.
export const L = (o: Loc | undefined, lang: Lang): string => (o ? (o[lang] ?? o.ro) : '')

// UI chrome layer: typed strings keyed by short keys.
const STR = {
  ro: {
    learn: 'Învață', lab: 'Laboratorul meu', check: 'Verifică', cont: 'Continuă', hint: 'Indiciu',
    correct: 'Corect!', wrong: 'Mai încearcă', lessonDone: 'Lecție terminată!',
    accuracy: 'Precizie', goToLab: 'Mergi la Laboratorul meu', owned: 'Deținut',
    buy: 'Cumpără', placeholder: 'Scrie răspunsul…', trueL: 'Adevărat', falseL: 'Fals',
    selectAll: 'Alege toate variantele corecte', selectOne: 'Un singur răspuns corect', emptyLab: 'Câștigă Volți ca să-ți construiești laboratorul.',
    perfect: 'Perfect — fără greșeli!', exit: 'Ieși',
    notEnough: 'Volți insuficienți', xp: 'XP', coins: 'Volți',
    myBench: 'Banca mea', shop: 'Magazin',
    settings: 'Setări', studyMode: 'Mod Studiu', studyModeHint: 'Fără inimi — practică nelimitată.',
    dailyGoal: 'Țintă zilnică', resetProgress: 'Resetează progresul', resetConfirm: 'Sigur ștergi tot progresul?',
    stats: 'Statistici', lessonsDone: 'Lecții terminate', courseComplete: 'Curs parcurs',
    // `close` names the ✕ buttons. `cancel` is the SECOND button of a confirmation, and it needed
    // its own word: the two exit confirmations ask "Închizi lecția?" / "Închizi simularea?"
    // ("Close the lesson?" / "Close the simulation?"), and labelling the button that keeps you IN
    // with the same verb that takes you OUT reads as agreement. The affirmative is "Ieși" (Exit),
    // so a student who wants to stay and presses "Închide" (Close) loses the run — the one misclick
    // in the app that destroys work.
    shareScore: 'Distribuie scorul', close: 'Închide', cancel: 'Anulează', mistakes: 'Greșelile mele',
    practiceMistakes: 'Exersează greșelile',
    reviewDone: 'Recapitulare terminată!', level: 'nivel', streakDays: 'zile',
    casual: 'Lejer', normal: 'Normal', serious: 'Serios', intense: 'Intens', recap: 'Recapitulare',
    darkL: 'Întunecat', lightL: 'Luminos', sound: 'Sunet', haptics: 'Vibrații', appearance: 'Aspect',
    heartsOut: 'Ai rămas fără inimi',
    heartsOutBody: 'Inimile revin mâine. Poți cumpăra un set acum cu Volții strânși, sau treci pe Mod Studiu pentru practică nelimitată.',
    heartsBuy: 'Cumpără 5 inimi',
    heartsToStudy: 'Treci pe Mod Studiu',
    heartsRefill: 'Reumple inimile',
    heartsFull: 'Inimi complete',
    noStorage: 'Progresul nu poate fi salvat pe acest dispozitiv — memorie plină, navigare privată sau stocare blocată.',
    copied: 'Copiat în clipboard!',
    willLearn: 'Vei învăța', labReward: 'Recompensă în laborator', inLab: 'în laborator',
    atFinish: 'la finalizare', theory: 'Teorie',
    comingSoon: 'În curând', comingSoonBody: 'Conținut în pregătire — revino curând.',
    feedback: 'Trimite feedback', inShop: 'în magazin',
    replayNote: 'Recapitulare — XP redus, fără Volți',
    dailyQuests: 'Misiuni zilnice', questsAllDone: 'Toate revendicate', claim: 'Revendică', achievements: 'Realizări',
    toReview: 'de reluat', upToDate: 'Totul la zi', reviewAll: 'Exersează tot',
    labPurpose: 'Cumpără și echipează instrumente cu Volții câștigați la lecții.',
    voltsHint: 'Volții se strâng în Laboratorul meu — de acolo cumperi și echipezi instrumente.',
    unlockedEquip: 'Ai deblocat', equipInLab: 'Îl poți echipa în Laboratorul meu.',
  },
  en: {
    learn: 'Learn', lab: 'My Lab', check: 'Check', cont: 'Continue', hint: 'Hint',
    correct: 'Correct!', wrong: 'Try again', lessonDone: 'Lesson complete!',
    accuracy: 'Accuracy', goToLab: 'Go to My Lab', owned: 'Owned',
    buy: 'Buy', placeholder: 'Type your answer…', trueL: 'True', falseL: 'False',
    selectAll: 'Select all correct options', selectOne: 'One correct answer', emptyLab: 'Earn Volts to build your lab.',
    perfect: 'Perfect — no mistakes!', exit: 'Exit',
    notEnough: 'Not enough Volts', xp: 'XP', coins: 'Volts',
    myBench: 'My bench', shop: 'Shop',
    settings: 'Settings', studyMode: 'Study Mode', studyModeHint: 'No hearts — unlimited practice.',
    dailyGoal: 'Daily goal', resetProgress: 'Reset progress', resetConfirm: 'Really delete all progress?',
    stats: 'Statistics', lessonsDone: 'Lessons completed', courseComplete: 'Course completed',
    shareScore: 'Share your score', close: 'Close', cancel: 'Cancel', mistakes: 'My Mistakes',
    practiceMistakes: 'Practice mistakes',
    reviewDone: 'Review complete!', level: 'level', streakDays: 'days',
    casual: 'Casual', normal: 'Normal', serious: 'Serious', intense: 'Intense', recap: 'Recap',
    darkL: 'Dark', lightL: 'Light', sound: 'Sound', haptics: 'Haptics', appearance: 'Appearance',
    heartsOut: "You're out of hearts",
    heartsOutBody: 'Hearts come back tomorrow. You can buy a set now with the Volts you have earned, or switch to Study Mode for unlimited practice.',
    heartsBuy: 'Buy 5 hearts',
    heartsToStudy: 'Switch to Study Mode',
    heartsRefill: 'Refill hearts',
    heartsFull: 'Hearts full',
    noStorage: 'Progress cannot be saved on this device — storage full, private browsing or storage blocked.',
    copied: 'Copied to clipboard!',
    willLearn: "You'll learn", labReward: 'My Lab reward', inLab: 'in the lab',
    atFinish: 'on finish', theory: 'Theory',
    comingSoon: 'Coming soon', comingSoonBody: 'Content in preparation — check back soon.',
    feedback: 'Send feedback', inShop: 'in the shop',
    replayNote: 'Review — reduced XP, no Volts',
    dailyQuests: 'Daily quests', questsAllDone: 'All claimed', claim: 'Claim', achievements: 'Achievements',
    toReview: 'to review', upToDate: 'All caught up', reviewAll: 'Practice all',
    labPurpose: 'Buy and equip instruments with the Volts you earn in lessons.',
    voltsHint: 'Volts collect in My Lab — spend them there to buy and equip instruments.',
    unlockedEquip: 'You unlocked', equipInLab: 'You can equip it in My Lab.',
  },
} as const

type Key = keyof typeof STR['ro']

interface LangCtx { lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }
const Ctx = createContext<LangCtx>(null!)

// Everything outside React's tree that carries language. index.html can only declare one, so all
// three stayed Romanian for an English user: the <html lang> a screen reader picks its voice from,
// the title shown in the browser tab, the Android task switcher and the installed PWA window, and
// the description a shared link renders with.
// The title names the COURSE, not one of the two tabs. It used to read "Laboratorul meu" / "My Lab"
// — the name of the second tab — while the app opens on Learn and spends most of its time there,
// so the browser tab, the task switcher and (per the note above) any shared link all announced the
// app as a lab. It now matches the manifest `name` and the diploma heading, which already said this.
const HEAD = {
  ro: { title: 'MEE — Măsurări Electrice și Electronice', desc: 'Învață măsurări electrice și electronice — joc cu laborator virtual.' },
  en: { title: 'MEE — Electrical & Electronic Measurements', desc: 'Learn electrical and electronic measurements — a game with a virtual lab.' },
} as const

function applyLang(l: Lang) {
  document.documentElement.lang = l
  document.title = HEAD[l].title
  const m = document.querySelector('meta[name="description"]')
  if (m) m.setAttribute('content', HEAD[l].desc)
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    // Validate, do not cast. `as Lang` was a promise to the type system that storage cannot keep:
    // the value is whatever is on disk, and `|| 'ro'` only catches empty or missing. One unexpected
    // string — a hand-edited backup, a truncated import, a future format change — made STR[lang]
    // undefined, and `STR[lang][k]` throws on the property access BEFORE `?? STR.ro[k]` can rescue
    // it. The app then died into the ErrorBoundary on every single launch, and the only way out was
    // the two-tap reset, which destroys all progress. A wrong language must never cost more than a
    // wrong language.
    const raw = readLocal('meem_lang')
    const l: Lang = raw === 'en' ? 'en' : 'ro'
    applyLang(l)
    return l
  })
  const setLang = (l: Lang) => { writeLocal('meem_lang', l); applyLang(l); setLangState(l) }
  // belt and braces: even if `lang` ever drifts to something unknown, fall back instead of throwing
  const t = (k: Key) => (STR[lang] ?? STR.ro)[k] ?? STR.ro[k]
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

export const useT = () => useContext(Ctx)

// Romanian agrees a counted noun three ways, not two: 1 → singular ("1 zi"), 2–19 → bare plural
// ("7 zile"), 20 and up → plural with "de" ("20 de zile") — except when the last two digits fall in
// 1–19, which drops it again ("101 zile", but "120 de zile"). Zero takes the bare plural. English
// only needs the singular/plural split, so both live behind one call.
export function counted(n: number, lang: Lang, one: string, many: string): string {
  if (lang === 'en') return `${n} ${n === 1 ? one : many}`
  if (n === 1) return `${n} ${one}`
  const last2 = n % 100
  const de = n !== 0 && !(last2 >= 1 && last2 <= 19)
  return `${n} ${de ? 'de ' : ''}${many}`
}
