# T06 — Firestore security rules + emulator tests

**Tier:** A · **Size:** L · **Depends on:** T03, T05
**USER ACTION REQUIRED:** At the end, the user runs `npm run deploy:rules` (tell them to).

## Goal
`firestore.rules` enforces every "W:" and "read:" line in DATA_MODEL.md, including pick locking by time and entry
validation. A thorough emulator test suite proves it. This is the app's entire trust boundary.

## Context to load (only these)
- `AGENTS.md`
- `docs/DATA_MODEL.md` (all)
- `docs/GAME_RULES.md` → sections 2 and 3
- `shared/types.ts` (skim)

## Files you may touch
`firestore.rules`, `tests/rules/**`, `vitest.rules.config.ts` (or equivalent), `package.json` (`test:rules` script)

## Steps
1. Helper functions: `signedIn()`, `isAdmin()` (uid ∈ `config/app.admins` **or** `users/{uid}.role == 'admin'`, pick one and document it),
   `isOwner(uid)`, `allowlisted()` (exists `allowlist/{lower(request.auth.token.email)}`), `onlyChanged(fields)`.
2. Per collection, implement the exact permissions in DATA_MODEL.md. Must-haves:
   - `users/{uid}` create: owner, allowlisted, `balance == 0`, `role == 'player'`, and a matching `usernames` doc
     created in the same batch (`existsAfter`). Update by owner: only `displayName, username, usernameLower, photoURL, lastSeenAt`.
   - `entries/{uid}` create/update by owner only when event `status == 'open'`, `enabled`, `request.time < lockAt`, the user's
     `balance >= event.buyIn`. Only pick fields change; `score/rank/payout/charged` are untouched; `status == 'submitted'`.
     Structural checks: `picks` is a map, and each stake is an int between 50 and 400 with `stake % 25 == 0`. The exact budget sum can't be
     checked in rules without loops, so keep that client-side plus in the lifecycle job (it voids invalid entries at lock). Note this in the rules file.
   - Entries are readable by others only when event status ∈ `locked|live|final`.
   - `ledger`: no client writes except admin. Admin writes must be `create` only (no update or delete). Players read their own rows.
   - `tokenRequests`: owner creates with `status == 'pending'`, amount 1..1000. Only admin updates status.
   - `comments`: text ≤ 280, own uid, `createdAt == request.time` (forces a server timestamp); delete by the author or an admin; no updates.
   - Default deny everything else.
3. Tests with `@firebase/rules-unit-testing` against the emulator (`firebase emulators:exec --only firestore "vitest run -c vitest.rules.config.ts"`).
   Cover allow and deny for every rule above, including: editing picks 1 second after `lockAt` (denied), a player writing their own balance (denied),
   a player reading another's entry before lock (denied) and after lock (allowed), a non-allowlisted user creating a profile (denied),
   an admin granting tokens (allowed), an admin updating a ledger row (denied).

## Acceptance criteria
- [x] `npm run test:rules` passes with ≥40 assertions covering every collection — 97 tests, 4 files
- [x] Definition of Done passes
- [x] Completion notes list any DATA_MODEL permission that couldn't be enforced in rules and how it's covered instead

## Out of scope
UI, jobs.

## Completion notes
`firestore.rules` now covers every collection in DATA_MODEL.md plus a catch-all deny; 97 emulator tests in
`tests/rules/**` run via `npm run test:rules` (`firebase emulators:exec` + `vitest.rules.config.ts`, project
`demo-fight-club`). `npm test` excludes them. Added `@firebase/rules-unit-testing` (approved dep).
- `isAdmin()` reads `config/app.admins` only, never `users.role` — see DECISIONS.md.
- **Not enforceable in rules:** stake sum == budget (no loops) — client-side `shared/validation.ts` plus the T09
  lifecycle job, which voids invalid entries at lock. Noted in the rules file itself.
- Per-pick checks *are* enforced, by unrolling `picks.values()` over 8 fixed indices. A 12-slot unroll tripped
  Firestore's 1000-expression request limit, so **entries are capped at 8 picks** (DECISIONS.md).
- Tightened beyond spec: `users` delete denied outright (orphans its `usernames` doc); admins may only move
  `status/resolvedBy/resolvedAt` on a `tokenRequest`; entry updates may only touch picks/lockBoutId/firstBlood/updatedAt.
- Surprise: `RulesTestContext.firestore()` is typed as the *compat* Firestore but returns a modular one —
  one cast in `tests/rules/helpers.ts` (`dbOf`) keeps call sites typed.
- Follow-ups: `tests/**` is outside `tsc -b`; `allowlist.claimedBy` has no writer for onboarding (T12).
