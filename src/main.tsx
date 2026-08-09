import React from 'react'
import { createRoot } from 'react-dom/client'
import { LazyMotion, domAnimation } from 'motion/react'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/chakra-petch/500.css'
import '@fontsource/chakra-petch/600.css'
import '@fontsource/jetbrains-mono/500.css'
import './index.css'
import App from './App'
import { LangProvider } from './i18n'
import { GameProvider } from './store'
import { ErrorBoundary } from './components/ErrorBoundary'
// Side-effect import: arms the overlay machinery's focus tracker at startup. Every consumer of
// useDismiss is lazy-loaded, so its module-level listener would otherwise not exist yet during the
// very click that opens the first overlay — and an overlay that autofocuses its own control (the
// Memorator) would then have nothing to hand focus back to on close.
import './ui/useDismiss'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LazyMotion features={domAnimation} strict>
        <LangProvider>
          <GameProvider>
            <App />
          </GameProvider>
        </LangProvider>
      </LazyMotion>
    </ErrorBoundary>
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // BASE_URL, not a literal "/". It is "/" for the root deployment this app actually ships to, so
    // nothing changes there — but a string literal is invisible to Vite's base rewriting, so under
    // any `base` the browser would ask the domain root for a file that lives under the sub-path,
    // get the host's 404, and register nothing: an app with no service worker and no offline mode,
    // failing silently because this catch swallows it. The scope has to move with it, since a
    // worker cannot control pages above its own directory.
    navigator.serviceWorker
      .register(import.meta.env.BASE_URL + 'sw.js', { scope: import.meta.env.BASE_URL })
      .catch(() => { /* offline support is best-effort */ })
  })
}
