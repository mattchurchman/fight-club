# T56 — Finalize: solo nights don't count; both finalize paths write badges + counts

**Tier:** A · **Effort:** high · **Size:** M · **Depends on:** T55
**USER ACTION REQUIRED:** none

## Goal
Two finalize bugs, fixed once in `shared/` and in both places that apply a finalize plan:
1. **Solo night (GAME_RULES §6.1).** With exactly one paid entrant, `planFinalize` refunds the buy-in correctly but
   still ranks the player 1st, so they get a win, season points, h2h-free standings and a Champion badge. A solo night
   must count for nothing: entry scored, `rank: null`, `payout: 0`, no standings rows, no h2h, no `users.stats`
   change, no badges, `lockStreak` untouched.
2. **Badges missing.** The admin console's Finalize (`src/features/admin/events/actions.ts#applyFinalize`) writes
   `stats` but never `badges` or `lockStreak`, so events finalized from the console award no badges. Both paths must
   write `badges`, the new `badgeCounts` (DATA_MODEL `users/{uid}`, GAME_RULES §9) and `lockStreak`.

## Context to load (only these)
- `AGENTS.md` (always)
- `docs/GAME_RULES.md` §6, §6.1, §8, §9
- `docs/DATA_MODEL.md` `## users/{uid}` and `### events/{evt_id}/entries/{uid}`
- `shared/lifecycle/finalize.ts`, `shared/lifecycle/types.ts`, `shared/badges.ts`
- `shared/lifecycle/lifecycle.test.ts` (grep `planFinalize` / `sole entrant`; read only those blocks)
- `jobs/lifecycle.ts` lines 410–500 (`applyFinalize`)
- `src/features/admin/events/actions.ts` lines 108–215 (`loadUsers`, `previewFinalize`, `applyFinalize`)
- `shared/types.ts` (grep `interface User`, `UserStats`)

## Files you may touch
`shared/lifecycle/finalize.ts`, `shared/lifecycle/types.ts`, `shared/lifecycle/lifecycle.test.ts`, `shared/badges.ts`,
`shared/badges.test.ts`, `shared/types.ts`, `jobs/lifecycle.ts`, `src/features/admin/events/actions.ts`,
the admin finalize preview component if it renders `rank` (grep `previewFinalize` under `src/features/admin/`),
`tests/rules/users.test.ts`, `docs/tasks/T56-finalize-solo-night-and-badges.md`, `docs/PROGRESS.md`

## Steps
1. `shared/types.ts`: add `badgeCounts?: Record<string, number>` to `User`. `shared/lifecycle/types.ts`: add
   `badgeCounts?: Record<string, number>` to `LifecycleUser`.
2. `shared/lifecycle/finalize.ts`:
   - `FinalizeEntryWrite.rank` becomes `number | null`.
   - When `ranked.length === 1` (solo): keep the single `refund` ledger intent exactly as today; `entries` = one
     write with the real `score`, `rank: null`, `payout: 0`; `standings: []`, `h2h: []`, `users: []`.
     Export a small pure helper `isSoloNight(paidCount: number): boolean` (in `finalize.ts`) for T57 to reuse.
   - Otherwise, for each user row also return `badgeCounts`: the user's current `badgeCounts` (fall back to
     `{ id: 1 }` for each id in a legacy `badges` array when `badgeCounts` is absent) plus 1 for each badge earned
     now. Return `badges` as the full distinct list (current ∪ earned), not just the new ones.
   - Always return `lockStreak` for every non-solo row (it already is; keep it).
3. `jobs/lifecycle.ts#applyFinalize`: write `badges` (full list, plain set — drop `arrayUnion`), `badgeCounts` and
   `lockStreak` from the plan. Make sure the job's user loader passes `badges`, `badgeCounts`, `lockStreak`.
4. `src/features/admin/events/actions.ts`: `loadUsers` reads `lockStreak`, `badges`, `badgeCounts`; `applyFinalize`
   writes `stats`, `badges`, `badgeCounts`, `lockStreak` in the same batch it writes `stats` today. If the admin
   preview UI prints rank, show `—` for `null`.
5. Tests (`lifecycle.test.ts`, `badges.test.ts`): E10 per GAME_RULES §7 (rank null, refund only, no standings/users/h2h);
   a two-player event where the winner had `badgeCounts: { champion: 2 }` → `champion: 3`; legacy user with
   `badges: ['champion']` and no `badgeCounts` → `champion: 2` after another win; solo night leaves `lockStreak` alone
   (no user row at all).
6. `tests/rules/users.test.ts`: a player can't write their own `badgeCounts`; admin can.

## Acceptance criteria
- [x] Definition of Done passes (AGENTS.md §4), plus `npm run test:rules` and `npm run build`
- [x] New tests in step 5 and 6 pass; existing E1–E9 tests unchanged and green
- [x] `grep -n "arrayUnion" jobs/lifecycle.ts` no longer matches the badges write
- [x] Both `applyFinalize` implementations write the same four user fields (stats, badges, badgeCounts, lockStreak)

## Out of scope
Repairing data already in Firestore (T57). Any profile/archive/live UI change (T59, T60). Ledger changes: the solo
refund row and its id stay exactly as they are.

## Completion notes
- `planFinalize` now returns early on a solo night (`isSoloNight`, exported for T57): the refund intent and
  `rank: null` / `payout: 0` entry only — no standings, h2h or user row at all, so stats, badges and
  `lockStreak` are untouched by construction rather than by zeroing them.
- Badge accumulation lives in `shared/badges.ts#accumulateBadges` (also for T57): `badgeCounts` wins per id,
  a legacy `badges` array counts as one each, and ids only in that array are filled in at 1.
- `FinalizePlan.users` rows now carry all four fields as **required** (`stats`, `badges`, `badgeCounts`,
  `lockStreak`), which is what forces both appliers to write the same thing; a test asserts the exact key set.
- `jobs/lifecycle.ts` drops `FieldValue` entirely, and its user loader now passes `badges`/`badgeCounts`/
  `lockStreak` — it never did, so lock-smith streaks could not accumulate there either.
- `rank: number | null` only flowed out to `sendFinalizeSummaries`; `jobs/notify.ts` was not mine to touch, so
  the job filters unranked entries out of the summaries. Follow-ups (admin + player solo-night copy) → BACKLOG.
- `firestore.rules` needed no change: `profileEditOk` already allowlists the fields a player may write.

```
 docs/BACKLOG.md                      |   9 +++
 jobs/lifecycle.ts                    |  34 ++++++-----
 shared/badges.test.ts                |  38 +++++++++++-
 shared/badges.ts                     |  28 +++++++++
 shared/lifecycle/finalize.ts         | 100 ++++++++++++++++++++++---------
 shared/lifecycle/lifecycle.test.ts   |  93 ++++++++++++++++++++++++++++-
 shared/lifecycle/types.ts            |   1 +
 shared/types.ts                      |   2 +
 src/features/admin/events/actions.ts |  21 ++++++-
 tests/rules/users.test.ts            |  17 ++++++
```
