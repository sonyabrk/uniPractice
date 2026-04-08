const CACHE_NAME         = 'memo-app-shell-v2';
const DYNAMIC_CACHE_NAME = 'memo-dynamic-content-v2';

const ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.json',
  '/icons/favicon-16x16.png',
  '/icons/favicon-32x32.png',
  '/icons/android-chrome-192x192.png',
  '/icons/android-chrome-512x512.png',
  '/icons/apple-touch-icon.png',
  '/content/home.html',
  '/content/about.html'
];

self.addEventListener('install', event => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== DYNAMIC_CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/socket.io')) return;

  // /content/* — Network First
  if (url.pathname.startsWith('/content/')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(DYNAMIC_CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() =>
          caches.match(event.request)
            .then(cached => cached || caches.match('/content/home.html'))
        )
    );
    return;
  }

  // Остальное — Cache First
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
      )
  );
});

self.addEventListener('push', event => {
  console.log('[SW] Push получен');

  let data = { title: 'MEMO — Уведомление', body: '', reminderId: null };

  if (event.data) {
    try { data = event.data.json(); }
    catch (e) { data.body = event.data.text(); }
  }

  const options = {
    body:    data.body,
    icon:    '/icons/android-chrome-192x192.png',
    badge:   '/icons/favicon-32x32.png',
    vibrate: [200, 100, 200],
    data:    { reminderId: data.reminderId, url: '/' }
  };

  if (data.reminderId) {
    options.actions = [
      { action: 'snooze', title: 'Отложить на 5 минут' }
    ];
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  const notification = event.notification;
  const action       = event.action;

  console.log('[SW] notificationclick, action:', action);

  if (action === 'snooze') {
    const reminderId = notification.data.reminderId;
    event.waitUntil(
      fetch(`/snooze?reminderId=${reminderId}`, { method: 'POST' })
        .then(res => {
          console.log('[SW] Snooze выполнен:', res.status);
          notification.close();
        })
        .catch(err => {
          console.error('[SW] Snooze failed:', err);
          notification.close();
        })
    );
    return;
  }

  notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow('/');
      })
  );
});
