# Publishing MEE

Three destinations, three different jobs:

| Destination | What goes there | Cost |
|---|---|---|
| **GitHub** | the source code, without the question bank | free |
| **Google Play** | an Android app built from the same code | $25 once |
| **iPhone** | either a home-screen PWA (free) or an App Store build | free / $99 per year |

---

## 0. Before anything: what must not be published

The question bank lives in `content-private/` and is excluded by `.gitignore`. Keep it in a
**separate private repository**:

```bash
cd content-private
git init && git add . && git commit -m "MEE question bank (private)"
gh repo create <your-private-bank-repo> --private --source=. --push
```

After a fresh clone of the public repo, restore it by cloning that private repository into
`content-private/` (its URL is deliberately not written down in this public file).

Check before every push that no part of the bank is staged:

```bash
npm run prepush
```

This reads the **staged content**, not the file names. The obvious check —
`git status --short | grep content-private` — greps a *path*, and the dangerous copies do not have
that word in their path: dated HTML and Markdown exports of every question with its key, snapshot
folders, the Moodle JSON. It also reports all-clear the moment someone renames a file. `npm run
prepush` instead looks for exercise-shaped data (a `correct` key beside a `prompt`) in everything
staged, and — when the bank is present locally — for any distinctive sentence from it, so a copy is
caught under any name in any directory. It exits non-zero and names the files.

Two things back it up, so this is not the only line of defence:

* `app/.gitignore` withholds `content-private/`.
* `../.gitignore`, one level above, withholds `_backup/`, `content-pipeline/out/` and the exported
  answer-key files — because the repository root is meant to be `app/`, the GitHub repository is
  called `mee-app`, and so is the folder above `app/`. Running `git init` there is the easy mistake,
  and `app/.gitignore` protects nothing from that position.

> **Honest limitation.** Whatever is shipped to a device can be extracted from it by someone
> determined — an Android package can be unzipped, a hosted web app's bundle can be downloaded.
> Keeping the bank out of GitHub blocks the realistic case (a student who searches for the repo).
> It does not make the answers cryptographically secret. The only way to achieve that is to serve
> the questions from an authenticated server, which costs hosting and breaks offline use.

---

## 1. GitHub — the source

```bash
cd mee-app/app
git init
git add .
git commit -m "MEE — bilingual learning app for Electrical and Electronic Measurements"
gh repo create mee-app --public --source=. --push
```

The repository URL is already set to `https://github.com/BulyK47/mee-app` in `README.md`,
`CITATION.cff` and `package.json` — if you name the repository differently, update those three.

Then:

1. GitHub shows a **"Cite this repository"** button as soon as `CITATION.cff` is on the default
   branch — both authors and their ORCIDs are already in it.
2. **Get a DOI** — this is what makes the work citable and time-stamps your authorship of the idea:
   connect the repository at <https://zenodo.org/account/settings/github/>, then publish a release
   (`git tag v1.0.0 && git push --tags`, then draft a release on GitHub). Zenodo archives it and
   mints a DOI automatically. Put the DOI badge in the README and add the DOI to `CITATION.cff` as
   `doi: 10.5281/zenodo.XXXXXXX`.

---

## 2. Google Play

### Choose the packaging route

| | **Capacitor** (recommended) | **TWA / Bubblewrap** |
|---|---|---|
| what it ships | the built app *inside* the package | a thin browser wrapper around a hosted URL |
| hosting needed | **no** | yes, public HTTPS + `assetlinks.json` |
| question bank | inside the package only | **downloadable from the public URL** |
| offline | complete | depends on the service worker |
| updating | new store release | update the website, app follows |

Because the bank must not sit on a public URL, use **Capacitor**.

### Build an Android package

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "MEE" "ro.upb.mee" --web-dir=dist
npm run build
npx cap add android
npx cap sync
npx cap open android          # opens Android Studio
```

In Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**. Create the signing
key once and **back it up** — losing it means you can never update the app again.

> **Check "Exportă" on a real device before release.** An Android WebView ignores blob downloads
> unless the host app installs a `DownloadListener`, so Settings → *Exportă* — the only way a
> student can back up their progress, since there are no accounts — may do nothing inside the
> packaged app even though it works in a browser. If it does not produce a file, route it through
> `@capacitor/filesystem` + `@capacitor/share` instead of the `<a download>` element.

Set in `android/app/src/main/res/values/strings.xml` the visible app name, and drop the icons from
`public/icons/` into the launcher-icon slots (Android Studio: right-click `res` → *New → Image
Asset*, use `app-512.png` as the foreground and `#0A0E12` as the background).

### Play Console

1. Register at <https://play.google.com/console> — **$25, once**.
2. Create the app, upload the `.aab`.
3. Required listing material:
   - short description (max 80 characters) and full description (max 4000) — drafts below;
   - **feature graphic** 1024×500 px;
   - app icon 512×512 (`public/icons/app-512.png`);
   - **at least 2 phone screenshots** (16:9 or 9:16, min 320 px) — take them on a real phone or in
     Chrome DevTools device mode;
   - privacy policy **URL** — publish `PRIVACY.md` as a GitHub Pages page and use that link;
   - content rating questionnaire, target audience, data-safety form (answer: *no data collected*).
4. **Personal developer accounts must run a closed test with at least 12 testers for 14
   consecutive days before production access.** Plan this: a group of students works well. Check the
   current rule in the Console — Google changes it.

---

## 3. iPhone

### Free — install as a home-screen app

No Apple account, no fee. The app is already configured for it (`apple-mobile-web-app-capable`,
`apple-touch-icon`, standalone display).

The catch: Safari installs it **from a URL**, so the app has to be hosted somewhere public — which
puts the bundle, and the bank inside it, on the open web. Weigh that against convenience. If you
accept it, any static host works:

```bash
npm run build
npx wrangler pages deploy dist        # Cloudflare Pages, free, gives an HTTPS root domain
```

Students then open the link in **Safari** → Share → *Add to Home Screen*. It runs full-screen and
offline afterwards.

> **Host the app at the root of a domain.** A sub-path deployment — a GitHub Pages project site at
> `/repo-name/`, for instance — is not supported, and the fix is larger than it looks. Setting
> `base` in `vite.config.ts` and editing `start_url`/`scope` gets you a page that loads and a PWA
> that is silently broken: `public/manifest.webmanifest` still points its four icons at `/icons/…`,
> and the service worker's own precache list is built from root-absolute paths. The worker
> registration is already base-aware (`src/main.tsx`), so that part would follow, but the manifest
> and the precache list would each need templating through `base` before offline mode worked again —
> and the failure is quiet: the app installs, looks right, and has no offline support at all.
>
> A user-or-organisation GitHub Pages site (`username.github.io`, served at the root) works as-is,
> as does Netlify, Vercel, Cloudflare Pages or any static host with its own domain.

### Paid — App Store

Requires the **Apple Developer Program, $99/year**, and a Mac with Xcode. Same Capacitor project:

```bash
npm install @capacitor/ios
npx cap add ios
npx cap sync
npx cap open ios
```

Then archive and upload from Xcode. A free Apple ID can only sideload to your own device, and the
build expires after 7 days — it is not a distribution route.

---

## 4. Store listing drafts

**Short description (RO, ≤80):**
> Învață măsurări electrice prin lecții scurte, cu laborator virtual.

**Short description (EN, ≤80):**
> Learn electrical measurements through short lessons, with a virtual lab.

**Full description (RO):**
> MEE transformă disciplina „Măsurări Electrice și Electronice" într-un traseu de lecții scurte, în
> stilul aplicațiilor de învățat limbi străine.
>
> • 15 module, de la mărimi și unități până la contorul de inducție
> • figuri desenate de aplicație: aparate analogice cu ac și cadran, ecrane de osciloscop, punți,
>   scheme de wattmetru, amplificatoare operaționale
> • formule culese corect, cu fracții și radicali reali
> • greșelile revin la repetare, la intervale crescânde
> • simulare de examen cu limită de timp
> • laborator virtual: deblochezi instrumente pe măsură ce avansezi
> • bilingv română/engleză, funcționează offline, fără cont și fără reclame
>
> Aplicația nu colectează niciun fel de date: tot progresul rămâne pe telefonul tău.

**Category:** Education · **Content rating:** Everyone · **Data safety:** no data collected.

---

## 5. Updating after release

Publishing is not one-way — every channel can be updated, but they differ in how fast the change
reaches a student.

| Channel | How an update ships | How long |
|---|---|---|
| **GitHub** | `git push` | instant |
| **Store listing** (description, screenshots, icon) | edit in the Play Console — no new build | ~hours |
| **Play (Capacitor)** | new `.aab` with a higher `versionCode`, same signing key | review: hours–days |
| **iOS home-screen PWA** | redeploy the site; the app updates on next launch | instant |
| **App Store** | new build from Xcode | App Review each time |

Notes that matter:

- **`versionCode` must increase** on every Play upload (`versionName` is the human label). Reusing a
  number is rejected.
- **The signing key can never change.** Losing it means publishing a different app.
- **The Android package id is permanent** — `ro.upb.mee` or whatever you choose at `cap init`
  cannot be edited later. The visible name can.
- **The cache name takes care of itself.** `public/sw.js` holds `const BUILD = /*__BUILD__*/'dev'`
  and the build replaces that marker with a fresh stamp, so every release gets its own cache and
  installed users pick it up. Do NOT hand-edit it — editing the line destroys the marker the build
  substitutes into, and the worker then keeps one shared cache across releases.
- Play supports **staged rollout** (e.g. 20% of users first) and lets you halt it if something is
  wrong.
- The 12-testers/14-days rule applies to getting *initial* production access, not to later updates.
- **A wrong answer key is the fast-moving case**: on the PWA it is fixed the moment you redeploy;
  through the stores it waits for a review cycle. If a correction is urgent mid-semester, the
  hosted PWA is the channel that can fix it the same day.

## 6. Release checklist

- [ ] `npm run build` passes; `npx tsc --noEmit` clean
- [ ] the build printed `service worker: N assets precached` (that step is what makes the app start
      offline — without it the main bundle is never cached)
- [ ] `git status` shows no `content-private/` file staged
- [ ] version bumped in `package.json` (the service-worker cache name is stamped by the build —
      nothing to edit by hand)
- [ ] offline actually verified: `npm run preview`, load the app, stop the server, reload — it must
      still render
- [ ] privacy policy reachable at a public URL
- [ ] the test shortcut in Settings is dev-only (it is: guarded by `import.meta.env.DEV`)
- [ ] the feedback address in `src/components/Settings.tsx` is one you want public
- [ ] signing key backed up somewhere you will still have in three years
