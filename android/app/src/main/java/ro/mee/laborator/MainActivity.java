package ro.mee.laborator;

import com.getcapacitor.BridgeActivity;

/**
 * Nothing to do here: the system bars are handled on the web side.
 *
 * From Android 15 (API 35) on, an app that targets 35 or later is laid out edge to edge and cannot
 * opt out - the activity window spans the whole screen, status bar and navigation bar included - so
 * something has to keep the app's own chrome out from under them, or the HUD sits under the clock
 * and the tab bar under the navigation buttons.
 *
 * An earlier version of this file measured the window insets and padded `android.R.id.content`.
 * That was written before reading what Capacitor 8 already does. Its built-in SystemBars plugin
 * installs its own inset listener on the web view's parent, and its `insetsHandling` option
 * defaults to "css": on a WebView 140 or newer, with `viewport-fit=cover` in the page - which
 * index.html asks for - the plugin deliberately stops padding anything and instead passes the real
 * insets into the page, where they surface both as `env(safe-area-inset-*)` and as
 * `--safe-area-inset-*` inline variables it sets on <html>. On an older WebView it pads the parent
 * itself and reports zeros through those variables.
 *
 * So the padding here was the second inset on a modern device and redundant on an old one. The
 * shell and every full-screen overlay now read the variables in `src/index.css` (`--sa-*`, which
 * prefer the plugin's values and fall back to `env()`), which is one mechanism for all three
 * surfaces: this package, the installed PWA, and iOS when it is built. The plugin also drops the
 * bottom inset while the soft keyboard is up and pads for the keyboard instead - the numeric-answer
 * exercises need that, and the hand-written listener did not do it.
 */
public class MainActivity extends BridgeActivity {}
