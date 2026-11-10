// Service worker: cho phép VocabNote chạy offline.
const CACHE = 'vocabnote-v1.0.0';
const SHELL = ['./', './index.html', './styles.css', './app.js', './config.js', './manifest.webmanifest',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Font Google: cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(CACHE).then(async c => (await c.match(req)) || fetch(req).then(r => { c.put(req, r.clone()); return r; })));
    return;
  }
  if (url.origin !== location.origin) return; // Google API, từ điển: luôn đi mạng
  // File của ứng dụng: lấy mạng trước (để luôn có bản mới), mất mạng thì dùng cache
  e.respondWith(
    fetch(req).then(r => { if (r.ok) caches.open(CACHE).then(c => c.put(req, r.clone())); return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
