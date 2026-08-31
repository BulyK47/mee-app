/// <reference types="vite/client" />

/** The build this bundle was made from — "1.0.0 (8)" when an android/ tree is present, "1.0.0" in a
 *  clone without one. Substituted by `define` in vite.config.ts; see buildStamp() there for why it
 *  is read from package.json + build.gradle rather than written down anywhere. */
declare const __APP_BUILD__: string
