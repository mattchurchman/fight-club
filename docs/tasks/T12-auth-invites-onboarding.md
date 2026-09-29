# T12 — Auth, invite gate & onboarding

**Tier:** B · **Size:** M · **Depends on:** T05, T06, T11
**USER ACTION REQUIRED:** afterwards: SETUP.md §S7 (`npm run bootstrap:admin -- you@example.com`).

## Goal
Only allowlisted emails get in. First sign-in creates a profile with a unique username. Everyone else sees a friendly
"invite only" screen. The admin can be bootstrapped from the terminal.

## Context to load (only these)
- `AGENTS.md`
- `docs/DATA_MODEL.md` → `config/app`, `allowlist`, `users`, `usernames`
- `src/lib/firebase.ts`, `src/app/` (router + layout files only), `src/components/ui/index.ts`

## Files you may touch
`src/features/auth/**`, `src/app/**` (route guards, providers), `jobs/bootstrap-admin.ts`, `package.json` (script `bootstrap:admin`)

## Steps
1. `/login`: "Continue with Google" (popup on desktop, redirect on iOS standalone), plus an email/password form with sign in, sign up and
   "forgot password" (`sendPasswordResetEmail`). Show friendly error messages mapped from Firebase error codes.
2. `AuthProvider` + `useSession()` → `{ status: 'loading'|'signedOut'|'notInvited'|'needsProfile'|'ready', user, profile, isAdmin }`.
   After sign-in, read `allowlist/{emailLower}`. If it's missing → `notInvited` (show the screen and a sign-out button).
3. Onboarding (`needsProfile`): pick a username (3–20 chars, `[a-z0-9_]`, availability checked live) and a display name, with the photo defaulted from Google.
   Create `users/{uid}` + `usernames/{lower}` in one batch (the rules require this). Balance starts at 0. The starting grant is posted by the admin
   (T17 automates this when the invite is claimed).
4. Route guards: everything except `/login` and `/install` requires `ready`. `/admin/*` requires `isAdmin`.
5. `jobs/bootstrap-admin.ts <email>`: using the Admin SDK, upsert `allowlist/{email}` with role admin and add the uid to `config/app.admins` if the
   user exists (otherwise print "sign in once, then rerun"). Also set `users/{uid}.role = 'admin'`. It's idempotent.
6. `/me` placeholder: show the profile and a sign-out button. Update `lastSeenAt` at most once per session.
7. Tests: `useSession` state machine with mocked Firebase, username validation, error-code mapping.

## Acceptance criteria
- [ ] With emulators and seed: a seeded player can sign in and onboard, a random email lands on "invite only", and an admin sees the gear icon
- [ ] Rules tests still pass. Definition of Done passes. Build passes.

## Out of scope
Admin UI for invites (T17).

## Completion notes
_(agent fills in)_
