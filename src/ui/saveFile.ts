// Handing a file to the user is three different jobs on the three surfaces this app ships to, and
// the one that matters most - the packaged Android app - is the one where the obvious code does
// nothing at all.
//
// In an Android WebView `navigator.share` does not exist, and a click on an `<a download>` pointing
// at a `blob:` URL is DROPPED IN SILENCE: the download only happens if the host app installs a
// DownloadListener, and Capacitor installs none. The progress export used to end in exactly that
// dead branch and then announce success regardless, so a student who followed the advice to keep a
// backup got a green message and no file - the worst possible failure for the one feature that
// stands between them and losing the whole course, since there is no account to restore from.
//
// So: on native, write the file with the Filesystem plugin and hand it to the system share sheet,
// where the student picks the destination themselves - which also answers "where did it go", the
// question the old message could not. Cache is the directory that needs no permission and is
// covered by the FileProvider paths the Share plugin needs (`res/xml/file_paths.xml`). If the sheet
// itself fails, fall back to writing into the public Documents folder and report the real path.
// On web the anchor works, so it stays.
//
// Every outcome is reported back to the caller: the notice the user sees is derived from what
// actually happened, never assumed.
export type SaveOutcome =
  | { kind: 'shared' }              // handed to the share sheet, which the user carried through
  | { kind: 'saved'; where: string } // written to a path we can name
  | { kind: 'downloaded' }          // a browser download was started
  | { kind: 'cancelled' }           // the user closed the sheet; not a failure, not worth a notice
  | { kind: 'failed' }

/** True when the user themselves dismissed the sheet. The web API throws AbortError; the Android
 *  Share plugin rejects with the literal message "Share canceled" (its own spelling). */
function isCancel(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const err = e as { name?: string; message?: string }
  return err.name === 'AbortError' || /cancel/i.test(err.message ?? '')
}

export async function saveTextFile(
  name: string,
  text: string,
  mime: string,
  dialogTitle: string,
): Promise<SaveOutcome> {
  const { Capacitor } = await import('@capacitor/core')

  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ])

    let uri: string
    try {
      ;({ uri } = await Filesystem.writeFile({
        path: name, directory: Directory.Cache, data: text, encoding: Encoding.UTF8,
      }))
    } catch {
      return { kind: 'failed' }
    }

    try {
      await Share.share({ title: name, files: [uri], dialogTitle })
      return { kind: 'shared' }
    } catch (e) {
      if (isCancel(e)) return { kind: 'cancelled' }
    }

    // No share target, or the sheet refused to open. The destination has to be one that needs no
    // permission on ANY supported device: minSdk here is 24, the manifest declares only INTERNET
    // and VIBRATE, and the Filesystem plugin's public-storage directories (Documents among them)
    // are gated on READ/WRITE_EXTERNAL_STORAGE below API 30 — so a write to Documents would be
    // refused outright on an Android 7-to-10 phone, which is exactly the older hardware most
    // likely to be missing a share target in the first place. Directory.External is the
    // app-specific external files directory: no permission at any API level, and the path it
    // returns can still be read out to the student, which is the whole point of this branch.
    try {
      const written = await Filesystem.writeFile({
        path: name, directory: Directory.External, data: text, encoding: Encoding.UTF8, recursive: true,
      })
      return { kind: 'saved', where: written.uri.replace(/^file:\/\//, '') }
    } catch {
      return { kind: 'failed' }
    }
  }

  const blob = new Blob([text], { type: mime })

  // Mobile browsers: the share sheet is the only route that reaches the file system on iOS Safari.
  try {
    const file = new File([blob], name, { type: mime })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: name })
      return { kind: 'shared' }
    }
  } catch (e) {
    if (isCancel(e)) return { kind: 'cancelled' }
    /* otherwise fall through to the anchor */
  }

  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    // The anchor must be in the document and the blob URL must outlive the click: a detached anchor
    // is ignored by some browsers, and revoking the URL in the same tick can truncate the download
    // before it starts.
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url) }, 5000)
    return { kind: 'downloaded' }
  } catch {
    return { kind: 'failed' }
  }
}
