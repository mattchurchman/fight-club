// docs/tasks/T24-push-notifications.md. Kept free of React so `useNotificationToggle.ts` is the
// only thing that needs testing-library/jsdom; this module is plain browser + Firestore calls.
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { db } from '../../lib/firebase.ts';
import { isIos, isStandalone } from '../install/useInstallPrompt.ts';
import { PUSH_SW_PATH, PUSH_SW_SCOPE, VAPID_KEY } from './constants.ts';

export type NotificationAvailability = 'unsupported' | 'needsInstall' | 'available';

/** iOS web push only works installed to the Home Screen (iOS 16.4+); otherwise just needs the
 *  browser APIs (desktop Chrome/Firefox/Edge, Android Chrome). */
export async function checkAvailability(): Promise<NotificationAvailability> {
  if (!(await isSupported())) return 'unsupported';
  if (isIos() && !isStandalone()) return 'needsInstall';
  return 'available';
}

function detectPlatform(): string {
  if (isIos()) return 'ios';
  if (/android/i.test(window.navigator.userAgent)) return 'android';
  return 'desktop';
}

async function registerPushSw(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(PUSH_SW_SCOPE);
  return existing ?? navigator.serviceWorker.register(PUSH_SW_PATH, { scope: PUSH_SW_SCOPE });
}

/** The current device's token, if permission is already granted — never prompts. */
export async function getExistingToken(): Promise<string | null> {
  if (Notification.permission !== 'granted') return null;
  const registration = await registerPushSw();
  const messaging = getMessaging();
  return getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
}

/** True if this device's token is saved on the player's profile. */
export async function isTokenSaved(uid: string, token: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', uid, 'devices', token));
  return snap.exists();
}

let foregroundHandlerAttached = false;

/** Foreground messages don't reach the service worker's `onBackgroundMessage` — this is the only
 *  handler for a tab that's open and focused. No in-app notification center (T24 "Out of scope"),
 *  so for now this just logs; a future task can surface it. */
function attachForegroundHandler(): void {
  if (foregroundHandlerAttached) return;
  foregroundHandlerAttached = true;
  onMessage(getMessaging(), (payload) => {
    console.log('[notifications] foreground message', payload.data);
  });
}

/** Requests permission (call only from a user gesture), gets an FCM token, and saves it to
 *  `users/{uid}/devices/{token}`. Returns the token, or null if the user declined. */
export async function enablePush(uid: string): Promise<string | null> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const registration = await registerPushSw();
  const messaging = getMessaging();
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) return null;

  await setDoc(doc(db, 'users', uid, 'devices', token), {
    createdAt: serverTimestamp(),
    platform: detectPlatform(),
  });
  attachForegroundHandler();
  return token;
}

/** Deletes this device's token (FCM + Firestore) so it stops receiving pushes. */
export async function disablePush(uid: string, token: string): Promise<void> {
  await deleteToken(getMessaging()).catch(() => {});
  await deleteDoc(doc(db, 'users', uid, 'devices', token));
}
