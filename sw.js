// Çevrimdışı çalışma: dosyaları önbellekten ver, arkada güncelle.
const CACHE = 'dongumuz-v11';
const FILES = ['./', 'index.html', 'app.css', 'app.js', 'content.js', 'config.js', 'sync.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  // cache:'reload' -> tarayıcının HTTP önbelleğini atla, yeni sürümü sunucudan al
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req.url, { cache: 'no-cache' }).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || fresh;
  }));
});

// Sabah 10:00 bildirimi (GitHub zamanlayıcısı yollar) — iPhone'da Ana Ekran uygulamasına gelir
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Döngümüz', {
    body: d.body || '', tag: d.tag || 'dongumuz', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  }));
});
