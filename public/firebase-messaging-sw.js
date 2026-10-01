// docs/tasks/T24-push-notifications.md.
//
// A second, dedicated service worker for FCM only — kept separate from the Workbox-generated PWA
// service worker (vite.config.ts VitePWA, registered by src/app/useSwUpdateToast.ts) rather than
// folding into it via injectManifest, and registered at its own scope
// ('/firebase-cloud-messaging-push-scope', see src/features/notifications/constants.ts) so the two
// don't fight over scope '/'. See DECISIONS.md 2026-09-30.
//
// Not bundled by Vite — served as-is from public/ — so it can't import src/lib/firebase.config.ts
// and instead loads the compat SDK from the CDN and repeats the same public web config inline.
// Keep both in sync if the Firebase project config ever changes.
//
// This runs in a service worker, not a module eslint.config.js's `globals.browser`/`node` sets
// cover (and that file isn't in this task's allowed list), hence the explicit globals below.
/* global importScripts, firebase, self */
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyD8l6vE3l1HaiJZZBww7HIO5NGFL3dOrAQ',
  authDomain: 'fight-club-4de90.firebaseapp.com',
  projectId: 'fight-club-4de90',
  storageBucket: 'fight-club-4de90.firebasestorage.app',
  messagingSenderId: '947055080588',
  appId: '1:947055080588:web:a2beba2cf382ef3a08b7a9',
});

const messaging = firebase.messaging();

// jobs/notify.ts sends data-only messages (no top-level `notification`) so delivery always comes
// through here instead of the browser auto-displaying one we can't attach a click handler to.
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  self.registration.showNotification(data.title || 'Fight Club', {
    body: data.body || '',
    icon: '/pwa-192x192.png',
    data: { url: data.url || '/' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
