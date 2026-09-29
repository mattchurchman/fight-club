# T24 — Push notifications (FCM web push)

**Tier:** B · **Size:** M · **Depends on:** T10, T11, T12
**USER ACTION REQUIRED:** Firebase console → Project settings → **Cloud Messaging** → Web Push certificates → **Generate key pair**.
Paste the public VAPID key to the agent (it's public).

## Goal
Opt-in notifications: "Picks lock in 1 hour", "Results are in, you finished 2nd (+350 tokens)", and "Your token request was approved".
They work on Android and desktop, and on iPhone once the app is installed to the Home Screen (iOS 16.4+).

## Context to load (only these)
- `AGENTS.md`
- `docs/DATA_MODEL.md` → users/{uid}/devices
- `docs/ARCHITECTURE.md` → "Schedules"
- Exports only: `jobs/lib/admin.ts`, `src/lib/firebase.ts`

## Files you may touch
`src/features/notifications/**`, `public/firebase-messaging-sw.js` (or integrate with the vite-plugin-pwa SW via `injectManifest` if simpler; decide and log it),
`jobs/notify.ts` (+ test), `jobs/lifecycle.ts` (call notify hooks), `.github/workflows/jobs.yml` (add a lock-reminder check), `firestore.rules` (devices, if not already there) + rules test

## Steps
1. On `/me`: an "Enable notifications" toggle → request permission (only on a user gesture) → `getToken` with the VAPID key → save to
   `users/{uid}/devices/{token}`. On iOS without standalone mode, show "Install the app first" and link to `/install`.
2. The service worker handles background messages (title, body, and a click → deep link).
3. `jobs/notify.ts`: `sendToUsers(uids, payload)` via the Admin SDK `messaging().sendEach`, and deletes tokens that come back invalid.
   Hooks: a lock reminder (events with a lockAt 45–75 min away that haven't been notified; set `event.notified.lockReminder = true`), a
   finalize summary per player, and request approval (the admin client can't send FCM, so the lifecycle job sends for requests resolved since the last run
   (`notifiedAt` null)).
4. Tests: the notification planners (who gets what, and no duplicates).

## Acceptance criteria
- [ ] On desktop Chrome against prod (after deploy): enabling works, and `npm run job -- jobs/notify.ts --test <uid> --live` delivers a test push
- [ ] Rules tests pass. Definition of Done passes. Build passes.

## Out of scope
In-app notification center.

## Completion notes
_(agent fills in)_
