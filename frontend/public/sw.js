// RoomChat Service Worker — Web Push Notifications
// This file must be at the root of the public/ folder so it has scope '/'

self.addEventListener('install', (event) => {
  console.log('[SW] Installing RoomChat Service Worker');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating RoomChat Service Worker');
  event.waitUntil(clients.claim());
});

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  let data = {
    title: 'RoomChat',
    body: 'You have a new message',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'roomchat_msg',
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    // If JSON parse fails, use defaults
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    tag: data.tag || 'roomchat_msg',
    renotify: true,
    vibrate: [200, 100, 200],
    data: data.data || { url: '/' },
    actions: [
      { action: 'open', title: '💬 Open Chat' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      // No existing window — open a new one
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
