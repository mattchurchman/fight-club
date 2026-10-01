// Side-effect import: fills in the emulator env vars `jobs/lib/admin.ts` reads, the same way
// `npm run seed` sets them on the command line (package.json). `firebase emulators:exec` doesn't
// export `FIREBASE_PROJECT_ID` itself, so every script that touches the Admin SDK needs this.
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
process.env.FIREBASE_PROJECT_ID ??= 'fight-club-4de90';
