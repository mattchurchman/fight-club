import { type Auth, connectAuthEmulator, getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import {
  type Firestore,
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { firebaseConfig } from './firebase.config.ts';

const app = initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);

export const db: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

// `vite build --mode e2e` (.env.e2e) sets VITE_USE_EMULATORS=true so the production bundle
// served by the hosting emulator (docs/tasks/T19) also talks to the emulators, not prod Firebase.
const useEmulators =
  import.meta.env.VITE_USE_EMULATORS === 'true' ||
  (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS !== 'false');

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  console.log('[firebase] connected to local emulators');
}
