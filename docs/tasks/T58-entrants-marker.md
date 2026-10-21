# T58 — "Who's in" data: public entrant marker written with the entry

**Tier:** A · **Effort:** medium · **Size:** S · **Depends on:** T55
**USER ACTION REQUIRED:** none (rules deploy with the normal deploy workflow)

## Goal
Players want to see who has entered the upcoming card before lock, without seeing anyone's picks. `entries` can't be
read by others before lock (by design), so add a public marker `events/{evt}/entrants/{uid}` =
`{ uid, displayName, photoURL, submittedAt }` (DATA_MODEL) that the player writes in the **same batch** as their entry,
and lock it down in rules. T60 builds the UI on it.

## Context to load (only these)
- `AGENTS.md` (always)
- `docs/DATA_MODEL.md` `### events/{evt_id}/entries/{uid}` and `### events/{evt_id}/entrants/{uid}`
- `firestore.rules` lines 190–300 (event subcollections: `entryWindowOpen`, `entries`)
- `tests/rules/entries.test.ts` (structure + helpers only), `tests/rules/helpers.ts`
- `src/features/picks/usePickDraft.ts` lines 140–185 (`submit`)
- `shared/types.ts` (grep `interface Entry`)

## Files you may touch
`firestore.rules`, `tests/rules/entrants.test.ts` (new), `shared/types.ts`, `src/features/picks/usePickDraft.ts`,
`jobs/seed-emulator.ts` (seed entrant docs next to seeded entries), `docs/tasks/T58-entrants-marker.md`, `docs/PROGRESS.md`

## Steps
1. `shared/types.ts`: `export interface Entrant<T> { uid: string; displayName: string; photoURL: string | null; submittedAt: T }`.
2. `firestore.rules`, inside the event match next to `entries`:
   - `match /entrants/{uid}`: `get, list` if `canRead()`.
   - `create, update` if `isAdmin()` or (`isOwner(uid)` && `entryWindowOpen(eventId, uid)` &&
     `existsAfter(.../events/$(eventId)/entries/$(uid))` && keys `hasOnly(['uid','displayName','photoURL','submittedAt'])`
     && `uid == uid` && `displayName`/`photoURL` equal `userDoc(uid)`'s, same as the entry rule).
   - `delete`: `isAdmin()` only.
3. `usePickDraft.ts#submit`: replace the `setDoc`/`updateDoc` with one `writeBatch` that writes the entry (unchanged
   fields) **and** `set`s the entrant doc on both first submit and edits (on edits, keep `submittedAt` from the
   existing entry; the set also backfills entrants for anyone who entered before this shipped).
4. `jobs/seed-emulator.ts`: write an entrant doc for each seeded entry so local dev shows the list.
5. Rules tests (`entrants.test.ts`): signed-in player can list entrants before lock; owner can create with their entry
   in one batch; creating an entrant with no entry fails; writing for another uid fails; extra keys fail; spoofed
   displayName fails; writes after `lockAt` fail; non-admin delete fails.

## Acceptance criteria
- [ ] Definition of Done passes (AGENTS.md §4), plus `npm run test:rules` and `npm run build`
- [ ] All step 5 cases are tests and pass; existing `entries.test.ts` unchanged and green
- [ ] Others' `entries` are still unreadable before lock (existing tests prove it)

## Out of scope
The Live tab UI (T60). Removing entrant docs for entries voided at lock (the list is only shown before lock).
Notifications about new entrants.

## Completion notes
_(agent fills in: ≤10 lines)_
