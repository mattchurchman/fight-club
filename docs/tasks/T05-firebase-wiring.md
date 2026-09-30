# T05 — Firebase project wiring & emulators

**Tier:** B · **Size:** M · **Depends on:** T01, T03 (seed uses shared types + T02 fixtures)
**USER ACTION REQUIRED:** SETUP.md §S3 (create the project, enable auth providers and Firestore, register the web app, `npx firebase login`).
Ask the user to paste the `firebaseConfig` object and the project ID.

## Goal
The repo is linked to the Firebase project. The emulator suite runs locally. The web app has a typed Firebase
client that auto-connects to emulators in dev. The jobs have an Admin SDK initializer.

## Context to load (only these)
- `AGENTS.md`
- `docs/ARCHITECTURE.md` → "Environments"
- `docs/SETUP.md` → S3, S4

## Files you may touch
`firebase.json`, `.firebaserc`, `firestore.rules` (deny-all placeholder), `firestore.indexes.json` (from DATA_MODEL "Indexes"),
`src/lib/firebase.config.ts`, `src/lib/firebase.ts`, `jobs/lib/admin.ts`, `jobs/lib/log.ts`, `jobs/seed-emulator.ts`,
`package.json` (scripts), `README.md` (commands)

## Steps
1. `firebase.json`: hosting → `dist`, SPA rewrite `** → /index.html`, cache headers (hashed assets are immutable, `index.html` no-cache);
   firestore rules and indexes; emulators: auth 9099, firestore 8080, hosting 5000, ui enabled; `singleProjectMode`.
2. `src/lib/firebase.ts`: init the app, export `auth`, `db`. If `import.meta.env.DEV` and `VITE_USE_EMULATORS !== 'false'`, connect the
   Auth and Firestore emulators. Enable Firestore persistent local cache (multi-tab).
3. `jobs/lib/admin.ts`: `getAdmin()` initializes firebase-admin from `GOOGLE_APPLICATION_CREDENTIALS` or the `FIREBASE_SERVICE_ACCOUNT`
   JSON env var (used in CI). It respects `FIRESTORE_EMULATOR_HOST` when set. Export `db`, `auth`, `messaging`.
   `jobs/lib/log.ts`: tiny structured logger plus `recordJobRun(name, ok, summary, error?)` → `jobRuns/{name}`.
4. `jobs/seed-emulator.ts`: seeds the emulators with `config/app` defaults; **Auth emulator accounts** `admin@test.dev`, `p1@test.dev`,
   `p2@test.dev`, `p3@test.dev` (password `password123`) with matching `allowlist`, `users`, `usernames` docs (balances 500, plus a `grant`
   ledger row each); and one **open** event with 5 bouts built from `fixtures/` with `lockAt = now + 2 days`. Refuse to run unless
   `FIRESTORE_EMULATOR_HOST` and `FIREBASE_AUTH_EMULATOR_HOST` are set. Later tasks rely on these exact accounts, so document them in README.
5. Scripts: `emulators` (`firebase emulators:start --import=.emulator-data --export-on-exit`), `seed` (runs the seed against emulators),
   `deploy:rules` (`firebase deploy --only firestore`). Add `.emulator-data/` to .gitignore.

## Acceptance criteria
- [ ] `npm run emulators` starts. In another terminal, `npm run seed` populates it and the data is visible in the Emulator UI.
- [ ] `npm run dev` shows the app connected to the emulators (log one line to the console in dev)
- [ ] Definition of Done passes. No secrets committed.

## Out of scope
Real security rules (T06), auth UI (T12).

## Completion notes
Live project `fight-club-4de90` created and linked (`.firebaserc`); Auth (Google + Email/Password) and
Firestore enabled by the user. `firebase.json` wires hosting/rules/indexes/emulators; `firestore.rules` is
deny-all pending T06. `src/lib/firebase.ts` auto-connects to emulators in dev (verified the console log in
a real browser) with persistent multi-tab cache. `jobs/lib/admin.ts` picks `FIREBASE_SERVICE_ACCOUNT` (CI)
or `GOOGLE_APPLICATION_CREDENTIALS` (local) via `applicationDefault()`; emulator env vars are respected by
the underlying SDKs with no special-casing needed. Verified end-to-end: started real emulators, ran
`npm run seed`, and read back all seeded docs (4 users, config/app, 1 event/5 bouts/10 fighters, 4 ledger
rows) with the Admin SDK. Also seeded `fighters/{id}` docs (not explicitly required by the steps, but
DATA_MODEL treats it as a first-class collection and the data was already on hand from the fixture).
Needed Java (S1 prerequisite, missing on this machine) — installed Temurin 21 via `mise` globally rather
than blocking on it. Follow-up: `.prettierignore` needs `firestore.rules` + `.firebaserc` (see Backlog).
