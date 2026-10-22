// Minimal service worker: makes the app installable and caches static assets. Billing needs the network (offline mode is out of scope).
const CACHE = 'nt-shell-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || !u.pathname.startsWith('/_next/static')) return;
  e.respondWith(caches.open(CACHE).then(async (c) => { const hit = await c.match(e.request); if (hit) return hit; const res = await fetch(e.request); c.put(e.request, res.clone()); return res; }));
});
