# Contributing

Thanks for looking. This is a university course project, so a few things work differently from a
typical repository — worth two minutes before you write any code.

## The question bank is not here, and pull requests to it are not possible

The exercises, answer keys, hints and theory summaries used to assess students live in a separate
private repository. They are not distributed and no licence is granted to them.

What that means for you:

- **Content PRs are only possible against the demo module** — `src/content/worlds/M01.demo.json` and
  `src/content/recaps/M01.demo.json`. Those two are original to this project and are yours to
  improve.
- A PR that adds exercises for a module other than the demo cannot be merged, however good it is:
  the file it would collide with is not in this tree.
- **Never paste text from the real bank into anything here**, including a comment or a commit
  message. `npm run prepush` blocks it, and so does an invariant in `npm run check` — but the point
  is that once it is pushed it cannot be taken back.

Bug reports, fixes, figure renderers, accessibility work, translations and tooling are all welcome
with no such caveat.

## Before you open a pull request

```bash
npm install
npm run verify     # types + three content/code gates + production build
```

`verify` must pass. Then, before you push:

```bash
npm run prepush    # refuses to let bank text be committed
```

It inspects what is **staged**, so it only helps if it runs. Wire it up once — it is not versioned,
so a clone does not inherit it:

```bash
printf '#!/bin/sh\nexec node scripts/check-not-staged.mjs\n' > .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```

It calls `node` rather than `npm run prepush` on purpose. On Windows `npm` is a bash script,
and the Git bundled with GitHub Desktop ships `sh` but no `bash` — an npm-based hook there aborts
every commit with `/usr/bin/env: 'bash': No such file or directory`. `node` needs no shell, so the
hook behaves the same from Git Bash, PowerShell and Desktop.

Requires **Node 22.18+** — see the note in the README about why the floor is higher than the build
itself needs.

## What the gates are for

They are not style checks. Each one exists because the thing it guards actually broke:

- `check-content.mjs` — bilingual gaps: a missing language, Romanian left in an English field, an
  English string identical to its Romanian source.
- `check-code.mjs` — platform assumptions that were silently dead in an Android WebView:
  `confirm()`/`alert()`/`prompt()`, an empty `catch {}`, unguarded `localStorage`, `mailto:`
  navigation.
- `check-invariants.mjs` — a key pointing at a nonexistent option, two identical options, an
  explanation deriving a different number than its own key, an unclosed `_{`, a figure `kind` with
  no renderer, a lesson with no exercises, a progress key that "Reset progress" forgets.

If a gate blocks something you believe is correct, say so in the PR rather than working around it.
A false positive in a gate is a bug in the gate.

## Style

Match the surrounding code. Comments here explain **why**, and usually name the failure that
prompted the line — if a comment would only restate what the code does, leave it out.

## Licence

Code contributions are accepted under **Apache-2.0**; contributions to the three content files
(the demo module, its recap, `src/content/equipmentInfo.ts`) under **Apache-2.0 or CC BY 4.0**, the
same dual licence those files carry. See [NOTICE](NOTICE).

The project name, the icon and the visual identity are not licensed — publish a fork under its own
name (Apache-2.0 §6).
