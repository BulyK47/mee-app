// Offline service worker: precache the whole build, then serve cache-first for same-origin GETs.
//
// Why the build list is injected: the browser requests index.html's own <script>/<link> assets
// before this worker controls the page, so a "cache what you see" strategy never captures the main
// bundle — and the app would fail to start with no network. The build step replaces the marker
// below with every emitted asset filename (they are content-hashed, so they cannot be hard-coded).
// One cache PER BUILD, and the last two are kept. A single shared cache plus skipWaiting was a
// trap: the new worker claimed pages that were already open, then deleted every asset outside the
// new build — while those pages still held the PREVIOUS index bundle, whose lazy imports name the
// old chunks. The first not-yet-visited route (Settings, My Lab, a lesson) then died on "Failed to
// fetch dynamically imported module", and the file was gone from the server too, so the network
// fallback could not save it either. Keeping the previous build's cache alive means such a page
// keeps working until it is next reloaded; global caches.match() searches every cache, so the old
// page finds its old chunks and a new page finds the new ones. Two generations, so the cache stays
// bounded — which was the whole point of pruning in the first place.
const BUILD = /*__BUILD__*/'dev'
const CACHE = 'meem-' + BUILD
const KEEP_GENERATIONS = 2
const CORE = ['/', '/index.html', '/manifest.webmanifest']
const BUILT = /*__PRECACHE__*/[]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // one failed asset must not abandon the whole precache, so add them individually
      .then(c => Promise.allSettled(CORE.concat(BUILT).map(u => c.add(u))))
      .then(() => self.skipWaiting()),
  )
})

// Cleanup is now "keep the newest N generations" instead of "empty everything but this build".
// The growth this replaced was real — one shared cache gained a whole build's ~48 content-hashed
// assets per release, measured at 264 entries after ~20 rebuilds, and an ever-growing cache is the
// first thing the browser evicts under storage pressure, which takes offline mode with it. Two
// generations keeps that bounded while leaving the previous build reachable for pages still
// running it. Build ids sort numerically; anything not matching the scheme is a pre-2026-08 cache
// and goes.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => {
        const mine = keys.filter(k => /^meem-\d+$/.test(k)).sort((a, b) => Number(b.slice(5)) - Number(a.slice(5)))
        const keep = new Set(mine.slice(0, KEEP_GENERATIONS).concat(CACHE))
        return Promise.all(keys.filter(k => !keep.has(k)).map(k => caches.delete(k)))
      })
      .then(() => self.clients.claim()),
  )
})

// ignoreVary matters more than it looks: hosts commonly send "Vary: Origin" on assets, and a
// <script type="module"> load sends no Origin header — so a strict match misses the main bundle and
// the app fails to start offline even though the file is sitting in the cache.
const MATCH = { ignoreVary: true }

// Order matters, and getting it wrong pinned the app to the previous build. Global caches.match()
// searches caches in CREATION order, so with two generations alive the shell "/" — and every asset
// present in both — resolved from the OLDER one, the page kept booting the previous index bundle,
// and no update could ever land. Ask this build's cache first; only then fall back to the older
// generation, which is there solely so a page already running it can still find its own chunks.
const fromCache = req =>
  caches.open(CACHE).then(c => c.match(req, MATCH)).then(hit => hit || caches.match(req, MATCH))

// What may be written to the cache at runtime. Without this the worker stored ANY response it got,
// and the damaging case is not an error page — it is a success. A static host (and vite preview,
// and the SPA rewrite every one of these deployments uses) answers a request for a file it does
// not have with index.html and status 200. So when a page still running an older build asks for a
// chunk whose generation has since been pruned, the reply is 200 text/html — which then got cached
// UNDER THE .js URL. Cache-first afterwards serves that HTML to the module loader forever, and
// "Failed to fetch dynamically imported module" becomes permanent instead of transient: the very
// failure the two-generation scheme above exists to avoid, arriving through a different door.
// Measured before this guard: a request for /__probe-<t>.js was answered 200 text/html and found
// sitting in the cache under that name.
// Only a real navigation may store HTML. `destination` is NOT a safe way to spot the exceptions:
// a plain fetch() reports destination '' , so treating '' as "probably a document" hands the
// loophole straight back — measured, the probe below sailed through the first version of this
// guard for exactly that reason. Navigations are identified by mode/destination alone.
const cacheable = (req, res) => {
  if (!res.ok || res.type !== 'basic') return false
  const ct = res.headers.get('content-type') || ''
  const isNavigation = req.mode === 'navigate' || req.destination === 'document'
  return isNavigation || !ct.includes('text/html')
}

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return
  e.respondWith(
    fromCache(req).then(cached =>
      cached ||
      fetch(req).then(res => {
        if (cacheable(req, res)) {
          const copy = res.clone()
          caches.open(CACHE).then(c => c.put(req, copy))
        }
        return res
      }).catch(() =>
        // offline and not in the cache: a navigation still gets the app shell
        req.mode === 'navigate' ? caches.match('/index.html', MATCH) : undefined,
      ),
    ),
  )
})
