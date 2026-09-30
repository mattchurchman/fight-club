import { type App, applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { type Auth, getAuth } from 'firebase-admin/auth';
import { type Firestore, getFirestore } from 'firebase-admin/firestore';
import { type Messaging, getMessaging } from 'firebase-admin/messaging';

export interface AdminServices {
  app: App;
  db: Firestore;
  auth: Auth;
  messaging: Messaging;
}

let services: AdminServices | null = null;

function buildApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  // CI passes the whole service-account JSON as an env var; local runs point
  // GOOGLE_APPLICATION_CREDENTIALS at a file (SETUP.md S4). Either way `applicationDefault()`
  // and the Firestore/Auth clients transparently defer to FIRESTORE_EMULATOR_HOST /
  // FIREBASE_AUTH_EMULATOR_HOST when those are set, so no emulator-specific branch is needed here.
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const credential = serviceAccountJson
    ? cert(JSON.parse(serviceAccountJson))
    : applicationDefault();

  return initializeApp({ credential, projectId: process.env.FIREBASE_PROJECT_ID });
}

/** Lazily initializes the Admin SDK once per process and returns its services. */
export function getAdmin(): AdminServices {
  if (!services) {
    const app = buildApp();
    services = { app, db: getFirestore(app), auth: getAuth(app), messaging: getMessaging(app) };
  }
  return services;
}
