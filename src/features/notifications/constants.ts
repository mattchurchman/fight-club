// docs/tasks/T24 USER ACTION REQUIRED: Firebase console → Project settings → Cloud Messaging →
// Web Push certificates → Generate key pair. Public, like src/lib/firebase.config.ts.
export const VAPID_KEY =
  'BCNjS0WuQCrJWoYGwrPlIuTnUb-Xnwf7Rhh1KbKczv1y_C8j0b_e4NOZ5Vg_HoMabSYFZmvzDqaTLMYW4nap3gM';

// Registered at a scope other than '/' so it doesn't collide with the Workbox-generated service
// worker (vite.config.ts VitePWA, registered by src/app/useSwUpdateToast.ts) — see DECISIONS.md
// 2026-09-30. Push delivery and `notificationclick` don't depend on scope the way fetch/cache do,
// so a dedicated scope works fine for FCM alone.
export const PUSH_SW_PATH = '/firebase-messaging-sw.js';
export const PUSH_SW_SCOPE = '/firebase-cloud-messaging-push-scope';
