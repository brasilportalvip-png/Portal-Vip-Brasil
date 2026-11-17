const CACHE = 'portal-vip-shell-v2.1.0';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/logo.png', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[SW Install]', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => (key.startsWith('froc-shell-') || key.startsWith('portal-vip-shell-')) && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Network-first for main unhashed application bundles to prevent stale frontend caching
  if (url.pathname === '/assets/app.js' || url.pathname === '/assets/app.css') {
    event.respondWith(
      fetch(request).then((response) => {
        if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
          try {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone)).catch(() => {});
          } catch {
            // Ignore cloning errors
          }
        }
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  if (/\.(?:js|css|png|jpg|jpeg|webp|svg|woff2?)$/i.test(url.pathname) || url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
            try {
              const clone = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, clone)).catch(() => {});
            } catch {
              // Ignore cloning errors
            }
          }
          return response;
        });
      }).catch(() => caches.match(request))
    );
  }
});


// Avisos no celular (Web Push): ex.: "Hora de postar no Kwai".
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Portal Vip Brasil', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Portal Vip Brasil';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'portal-vip',
      renotify: true,
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && 'navigate' in client) {
          return client.navigate(target).then((c) => (c ? c.focus() : undefined));
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
