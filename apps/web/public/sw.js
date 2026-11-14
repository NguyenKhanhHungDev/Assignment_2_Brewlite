/* Public static assets only. Never store API, RSC, account or transaction HTML. */
const CACHE = 'brewlite-static-v1';
const OFFLINE = '/offline.html';
const PRECACHE = [OFFLINE, '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png'];
const MAX_ASSETS = 80;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const path of PRECACHE) {
      const response = await fetch(path, { credentials: 'omit', cache: 'reload', redirect: 'error' });
      if (!response.ok) throw new Error('Offline asset unavailable');
      await cache.put(path, response);
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('brewlite-static-') && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

async function asset(url) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match(url.pathname);
  if (saved) return saved;
  const response = await fetch(url.href, { credentials: 'omit', cache: 'no-cache', redirect: 'error' });
  const type = response.headers.get('Content-Type') || '';
  const control = response.headers.get('Cache-Control') || '';
  if (response.ok && !response.redirected && !/private|no-store/i.test(control) &&
      /^(text\/css|(?:text|application)\/javascript|image\/|font\/|application\/font)/i.test(type)) {
    await cache.put(url.pathname, response.clone());
    const keys = await cache.keys();
    const runtime = keys.filter(key => !PRECACHE.includes(new URL(key.url).pathname));
    for (const key of runtime.slice(0, Math.max(0, keys.length - MAX_ASSETS))) await cache.delete(key);
  }
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      /^(?:\/(api|orders|payments|ingredients|recipes)(\/|$)|\/products\/?$)/.test(url.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(async () =>
      (await (await caches.open(CACHE)).match(OFFLINE)) || new Response('Bạn đang mất kết nối. Vui lòng thử lại khi có mạng.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })));
    return;
  }
  if (url.search || request.headers.has('authorization') || request.headers.has('rsc') ||
      request.headers.has('next-router-state-tree') || request.headers.has('x-brewlite-csrf')) return;
  const nextAsset = url.pathname.startsWith('/_next/static/') && ['script', 'style', 'font', 'image'].includes(request.destination);
  if (PRECACHE.includes(url.pathname) || nextAsset) event.respondWith(asset(url));
});
