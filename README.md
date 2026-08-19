# MEE — Laboratorul meu

A bilingual (RO/EN) learning app for the university course **Măsurări Electrice și Electronice**
(*Electrical and Electronic Measurements*), built as an offline-capable progressive web app.

Short gamified lessons, a virtual instrument bench you unlock as you progress, spaced repetition of
your mistakes, and an exam simulation — with every figure drawn by the app itself, from the
exercise's own data.

> **The question bank is not part of this repository.** The exercises are used for grading, so the
> answer keys stay private. A demo module ships with the source so the app builds and runs after a
> plain `git clone`. See [Content](#content).

---

## 🇷🇴 Pe scurt

Aplicație de învățare bilingvă pentru disciplina **Măsurări Electrice și Electronice**, în stilul
Duolingo: lecții scurte, hartă de progres, vieți și serii zilnice, plus un **laborator virtual** în
care aparatele se deblochează pe măsură ce termini module.

Ce o deosebește de un simplu chestionar:

- **Figurile sunt desenate de aplicație**, parametric, din datele exercițiului — aparate analogice
  cu ac și cadran, ecrane de osciloscop, punți Wheatstone/Wien/De Sauty, scheme de conectare a
  wattmetrului (inclusiv metoda Aron), configurații de amplificator operațional, transformatoare de
  măsurare. Nicio figură scanată.
- **Formulele sunt culese cu MathML nativ** — fracții reale, radicali care se întind peste tot
  radicandul, indici și exponenți adevărați, identic în română și engleză.
- **Repetiție spațiată**: greșelile revin la intervale crescânde.
- **Simulare de examen**: 10 grile cu limită de timp, cu revizuire la final.
- **Funcționează offline**, se instalează pe telefon și nu trimite niciun fel de date nicăieri.

Banca reală de întrebări **nu este distribuită ca sursă** și nu se acordă nicio licență asupra ei.
Depozitul conține
un modul demonstrativ, ca aplicația să poată fi rulată de oricine.

---

## Features

| | |
|---|---|
| **15 modules · 49 lessons** | the full MI2025 course sequence, each module unlocking a lab instrument |
| **4 exercise types** | single choice, multiple choice, true/false, numeric with tolerance |
| **25 parametric figure types** | rendered as SVG from the exercise parameters — no bitmaps |
| **Native MathML** | real fractions, radicals, sub/superscripts; identical in both languages |
| **Bilingual** | every prompt, choice, hint and explanation exists in Romanian and English |
| **Spaced repetition** | wrong answers return on an expanding schedule |
| **Exam simulation** | timed 10-question mock exam with a full review screen |
| **Virtual lab** | earn "Volți", buy and equip instruments on your bench |
| **Offline PWA** | service worker + local storage; installable, no account, no server, no tracking |

> **What a clone of this repository gives you:** the whole application, running on the demo module —
> **1 module, 2 lessons, 10 exercises**, and a mock exam that falls back to 4 questions because that
> is the size of the pool. Every feature in the table above is real and works; the numbers in the
> first row describe the course, which is served by the private bank. See [Content](#content).

## Quick start

```bash
npm install
npm run dev
```

Then open the printed URL. A production build goes to `dist/`:

```bash
npm run build
npm run preview
```

Requires **Node 22.18+**, which is what `package.json` declares. The build itself runs on Node 20,
but `npm run check` does not: the content checker imports `src/content/*.ts` directly, and running
TypeScript without a flag only works from 22.18. On an older Node the build succeeds and the checks
fail with `ERR_UNKNOWN_FILE_EXTENSION ".ts"` — which is why the declared floor is the higher one
rather than the one that merely builds.

### Checks

```bash
npm run check
```

Three gates, each of which exits non-zero on failure:

- **`scripts/check-content.mjs`** — walks every question and theory card in *both* content locations
  and reports bilingual gaps: a missing language, Romanian text left in the English field, or an
  English string identical to the Romanian one. Formulas, SI unit names and prefixes are exempt from
  the last rule: they are the same string in both languages by design.
- **`scripts/check-code.mjs`** — guards against the platform assumptions that have actually broken
  this app in a WebView: `confirm()`/`alert()`/`prompt()`, an empty `catch {}`, an unguarded
  `localStorage` access, and navigation to a `mailto:` URL. Each of these looked correct in a
  desktop browser and was silently dead on a phone.
- **`scripts/check-invariants.mjs`** — asserts the properties that are cheap to state and expensive
  to find by hand, each added after the thing it guards actually broke: a key pointing at an answer
  option that does not exist, two options with identical text, an explanation that derives a
  different number than its own key, an unclosed `_{` (the formula renderer consumes to the end of
  the string, swallowing the rest of the sentence into a subscript), a figure `kind` with no
  renderer, Romanian drawn into an SVG with no language switch, a lesson with no exercises, and a
  progress key that "Reset progress" forgets to clear. It reads the JSON directly, so unlike
  `check-content.mjs` it runs on any Node version.

Two more commands wrap these:

```bash
npm run verify    # types + all three gates + production build
npm run prepush   # refuses to let the question bank be staged — see PUBLISHING.md
```

`prepush` inspects what is **staged**, so it only protects you if it runs. Wire it up once, locally
— it is not versioned, so a clone does not inherit it:

```bash
printf '#!/bin/sh\nexec npm run --silent prepush\n' > .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```

## Content

Content is plain JSON, discovered automatically — adding a module is dropping in a file, not writing
code. Two locations are scanned:

| Path | What | In this repo |
|---|---|---|
| `src/content/worlds/*.json` | demo module (`M01.demo.json`) | ✅ committed |
| `src/content/recaps/*.json` | demo theory card | ✅ committed |
| `content-private/worlds/*.json` | the real question bank | ❌ private repository |
| `content-private/recaps/*.json` | the real theory summaries | ❌ private repository |

A world marked `"demo": true` disappears as soon as the private bank supplies that module, so the
same source tree runs as a public demo or as the full course depending only on which files are
present. An absent `content-private/` folder is not an error.

The module sequence itself (titles, icons, rewards) lives in `src/content/modules.ts` and is public —
a module with no question file shows as *"în curând" / "coming soon"*.

<details>
<summary>Exercise schema</summary>

```jsonc
{
  "id": "demo-2",
  "type": "numeric",              // mcq | multi | truefalse | numeric
  "points": 15,
  "prompt":      { "ro": "…", "en": "…" },
  "hint":        { "ro": "…", "en": "…" },   // points at the theory, never at the answer
  "explanation": { "ro": "…", "en": "…" },   // shown after answering
  "answer": 3, "unit": "A", "tolerance": { "abs": 0.1 }, "integerOnly": false,
  "visual": { "kind": "concept", "params": { "relation": "U = R · I" } }
}
```

Choice-based exercises carry `choices: [{ id, label: {ro, en} }]` and `correct: ["b"]`
(`correct: true|false` for true/false).
</details>

## Architecture

```
src/
  content/        modules, equipment, achievements, quests, demo bank
  visuals/        QuestionVisual.tsx — every figure kind, drawn as SVG
  ui/             FormulaMath.tsx (MathML typesetter), Formula.tsx (inline fallback)
  components/     LessonPlayer, ExamPlayer, LearnTab, LabTab, Memorator, …
  store.tsx       progress, streak, hearts, coins, spaced repetition (localStorage)
```

- **React 18 + TypeScript + Vite 6 + Tailwind 4.** No backend, no analytics, no accounts.
- `FormulaMath` parses linear notation (`X_max`, `10^{-6}`, `√(a+b)`, `a/b`) into MathML, splitting a
  line into maths / `[units]` / `(comments)` so mixed lines still typeset. Anything it cannot parse
  confidently falls back to a plain renderer rather than showing raw notation.
- `QuestionVisual` draws each figure from parameters, so one component serves many exercises and the
  figures stay consistent, readable in both themes, and free of scanned material.

## How to cite

If this app, or its instructional design, is useful in your teaching or research, please cite it.
GitHub renders [`CITATION.cff`](CITATION.cff) as a ready-made citation ("Cite this repository"), or
use:

```bibtex
@software{voicila_seritan_enache_mee_2026,
  author  = {Voicila, Iulian-Teodor and Seritan, George-Calin
             and Enache, Bogdan-Adrian},
  title   = {{MEE — a bilingual gamified learning application for Electrical
             and Electronic Measurements, with app-generated instrument figures}},
  year    = {2026},
  url     = {https://github.com/BulyK47/mee-app},
  license = {Apache-2.0}
}
```

## License

The app collects nothing and sends nothing — [PRIVACY.md](PRIVACY.md) states exactly what is stored
on the device, in Romanian and English. Contributing: [CONTRIBUTING.md](CONTRIBUTING.md).

| What | License |
|---|---|
| All source code, build scripts, figures, styles | **Apache-2.0** — see [LICENSE](LICENSE), [NOTICE](NOTICE) |
| The three instructional content files listed below | **Apache-2.0 *or* CC BY 4.0**, at your option |
| The graded question bank (`content-private/`) | **not distributed, no license granted** |

You may use, modify and redistribute the code, including commercially, provided you keep the
copyright and `NOTICE` attribution. The license does **not** grant rights to the project name
"MEE — Laboratorul meu", the icon, or the visual identity (Apache-2.0 §6): publish a fork under its
own name.

### Content files, dual-licensed

Three files here are teaching material rather than code, and may also be used under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/):

- `src/content/worlds/M01.demo.json` — the ten-exercise demonstration module
- `src/content/recaps/M01.demo.json` — its theory recap
- `src/content/equipmentInfo.ts` — instrument specifications, working principles and glossary (RO/EN)

The second option exists so that a lecturer who wants to reuse one exercise, or the instrument
glossary, in their own course does not have to carry a software license's patent clauses and NOTICE
obligations to do it. Attribution is required either way — see [How to cite](#how-to-cite).

### The question bank

The **graded question bank** — the exercises, keys, hints and recaps used to assess students — is
**not distributed as source and no license is granted to it**, here or anywhere else. It lives in a
separate private repository; everything under `content-private/` is withheld.

A compiled build of the app, which contains that bank so it can grade offline, is published for the
students of this course — through an app store and through a web address. Distributing the compiled
form grants no rights in the item content.
