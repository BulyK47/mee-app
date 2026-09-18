# Changelog

Notable changes to MEE. The format follows [Keep a Changelog](https://keepachangelog.com/1.1.0/),
and the project uses [semantic versioning](https://semver.org/spec/v2.0.0.html).

The Android `versionCode` is recorded beside each version because it, not the version name, is what
Google Play uses to order releases — and several codes were spent on packages that never reached a
user.

## [Unreleased]

## [1.0.0] — 2026-09-18 · Play versionCode 11

First public release, on Google Play.

### Added

- 15 modules, 49 lessons and more than 300 exercises for the Electrical and Electronic Measurements
  course: single choice, multiple choice, true/false and numeric answers with tolerance.
- Figures drawn by the app from each exercise's own data — analogue instrument dials, oscilloscope
  screens, measuring bridges, wattmeter connection diagrams, operational-amplifier circuits,
  instrument transformers. No scanned images.
- Formulas typeset as native MathML: real fractions, radicals that span the whole radicand, true
  subscripts and superscripts.
- Spaced repetition over the exercises answered wrongly, with intervals that grow as they are
  mastered.
- A timed exam simulation with an answer review at the end.
- A virtual lab: 24 instruments and accessories over three benches, bought with points earned by
  studying.
- A theory recap for every module, and a searchable formula sheet covering the whole course.
- Study Mode, daily goal, daily quests, achievements and a streak.
- Full bilingual coverage, Romanian and English: every prompt, option, hint and explanation exists in
  both, and one button switches language at any time.
- Progress export and import, as a file the student controls.
- A three-card first-run walkthrough with a skip, plus two dismissible hint bands, and
  "Revezi prezentarea" in Settings to see it again.
- A System theme option that follows the device, alongside Dark and Light.
- The privacy policy readable inside the app, in both languages, offline — compiled from
  `PRIVACY.md`, so the screen and the published document cannot drift apart.
- A "Rate this app" row that opens the store listing, and Play's in-app review requested silently at
  a natural milestone (never from a button, which Google's guidance forbids).

### Fixed

- Progress export announced success even when it had written nothing. Every outcome now has its own
  message, and the file is handed to the Android share sheet.
- The app drew under the status bar and the navigation buttons. System-bar insets are read in CSS,
  across every surface.
- The exam drew a guessed figure next to questions whose own figure had been deliberately withheld:
  44 of 185 concept questions were affected, 17 of them given a current-shunt schematic because the
  Romanian word *sunt* matched the keyword rule for *șunt*. The exam now shows the author's figures
  or none.
- A double tap on Continue in the exam could skip a question, recording it as unanswered.
- The service worker served the previous build's shell on the first launch after an update, so an
  update only became visible on the second start. Navigations are fetched from the network first,
  with the cache as fallback; offline start is unaffected.
- The System theme reached the light-theme colour correction as the literal string `system`, leaving
  module titles and progress bars at 1.4–2.7:1 on white. The resolved palette is now published from
  the store, and every consumer sees it.

### Notes

The public repository contains the whole application and a ten-exercise demonstration module, so it
builds and runs after a plain `git clone`. The question bank used for grading is not distributed.

[Unreleased]: https://github.com/BulyK47/mee-app/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/BulyK47/mee-app/releases/tag/v1.0.0
