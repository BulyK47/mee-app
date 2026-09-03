import { readLocal, writeLocal, storageWorks } from '../storage'

// Rating the app — two paths that must never be joined into one.
//
// Google's in-app review guidance forbids exactly the design a rating feature naturally reaches for:
//
//  1. The review flow must NOT be triggered by a control the student pressed. Play's own wording is
//     "you should not have a call-to-action option (such as a button) to trigger the review flow".
//  2. Nothing may be asked first. No "Îți place MEE?", no stars of our own, nothing that decides who
//     gets to see the dialog. Filtering for happy users is the abuse this rule exists to stop.
//
// So `requestInAppReview()` fires on its own, once, at a point where the student has actually got
// something out of the app, and asks nothing. The Settings row a student can press goes through
// `openStoreListing()`, which is only a deep link to the store page and carries no such restriction.
//
// Worth knowing before "fixing" any of this: `requestInAppReview()` resolving does NOT mean a dialog
// appeared. Play keeps its own per-user quota and shows nothing to somebody who has already rated or
// has seen it recently, and there is no way to detect which happened — by design. The quota is also
// only waived on the INTERNAL test track, so on a closed-testing build the dialog may never show up
// at all. That is not a broken plugin.
//
// Both calls are no-ops off Android, and the plugin imports are dynamic so neither package is pulled
// into the first paint of a web build that can never use them.

const APP_ID = 'ro.mee.laborator'
const LISTING_URL = `https://play.google.com/store/apps/details?id=${APP_ID}`
const MARKET_URL = `market://details?id=${APP_ID}`

// Set once the milestone prompt has fired, so it can never fire twice.
const ASKED_KEY = 'meem_review_asked'

async function android(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core')
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
  } catch { return false }
}

// Opens the store page so a student can rate the app themselves, whenever they choose to.
// Prefers the market:// scheme so it lands in the Play app rather than in a browser tab.
export async function openStoreListing(): Promise<void> {
  if (await android()) {
    try {
      const { AppLauncher } = await import('@capacitor/app-launcher')
      const { completed } = await AppLauncher.openUrl({ url: MARKET_URL })
      if (completed) return
      await AppLauncher.openUrl({ url: LISTING_URL })
      return
    } catch { /* Play app missing, or the scheme was refused — fall through to the web listing */ }
  }
  try { window.open(LISTING_URL, '_blank', 'noopener,noreferrer') } catch { /* blocked; nothing further to try */ }
}

// Asks Play to show its own review dialog, at most once per install.
export async function requestInAppReview(): Promise<void> {
  // No storage means we cannot remember having asked — so never ask. A prompt that could reappear on
  // every launch is worse than no prompt, and this is the one branch where failing soft is wrong.
  if (!storageWorks() || readLocal(ASKED_KEY) === '1') return
  if (!(await android())) return
  // Marked BEFORE the call, not after: if the request throws we still do not want it retried at
  // every later milestone.
  writeLocal(ASKED_KEY, '1')
  try {
    const { InAppReview } = await import('@capacitor-community/in-app-review')
    await InAppReview.requestReview()
  } catch { /* Play declined or the service is unavailable — there is nothing to show the student */ }
}
