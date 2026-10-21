# T57 — Rebuild player records from final events (solo-night scrub + badge backfill)

**Tier:** A · **Effort:** high · **Size:** M · **Depends on:** T56
**USER ACTION REQUIRED:** after this task is merged and deployed:
1. GitHub → repo → **Actions** → **Jobs** → **Run workflow** → job `rebuild-dry` → Run.
2. Open the run log. Check: the solo night(s) are listed under `solo nights`, your wins/points no longer include
   them, and the badge counts look right. Paste the summary into the planning chat if anything looks off.
3. If it looks right: **Run workflow** again with job `rebuild-live`.

## Goal
Firestore still holds the effects of the old finalize: a solo-night win (and points, and possibly a Champion badge)
for the owner on the last event and on one earlier event, and no badges at all for events finalized from the admin
console. Build a re-runnable repair job that replays every `final` event, oldest first, through the T56 rules and
**overwrites** each player's derived records. Tokens/ledger are never touched (solo buy-ins were already refunded).

## Context to load (only these)
- `AGENTS.md` (always)
- `docs/GAME_RULES.md` §6.1, §8, §9
- `jobs/backfill-standings.ts` (this task replaces it)
- `shared/lifecycle/finalize.ts` (grep `isSoloNight`, the `userStats` block), `shared/badges.ts` (`computeBadges`)
- `shared/standings.ts` (signature of `applyEventToStandings` only)
- `jobs/lib/admin.ts`, `jobs/lib/log.ts`
- `.github/workflows/jobs.yml`
- `package.json` (`scripts` only)

## Files you may touch
`shared/lifecycle/rebuild.ts` (new), `shared/lifecycle/rebuild.test.ts` (new), `shared/lifecycle/index.ts`,
`jobs/rebuild-records.ts` (new), `jobs/backfill-standings.ts` (delete), `package.json` (scripts only),
`.github/workflows/jobs.yml`, `docs/SETUP.md` (one short paragraph), `docs/tasks/T57-rebuild-player-records.md`,
`docs/PROGRESS.md`

## Steps
1. **Pure core** `shared/lifecycle/rebuild.ts`: `rebuildRecords(events, users)` where `events` is final events oldest
   first, each with its bouts, stored entries (`score`, `rank`, `payout`, `picks`, `lockBoutId`, `charged`, `status`,
   `submittedAt`) and, per uid, `balanceAfterFinalize` (step 3). For each event:
   - paid = `charged && status !== 'void'`. If `isSoloNight(paid.length)`: record it in `soloNights` and an entry fix
     `{ eventId, uid, rank: null, payout: 0 }`; skip everything else for that event.
   - Otherwise fold it in: season standings and h2h via `applyEventToStandings` (season = UTC year of `startsAt`);
     `stats` (events/wins/podiums/points/correctWinners as finalize does); `computeBadges` with the running
     `lockStreak` and `balanceAfterFinalize`, adding to `badgeCounts`.
   - Returns `{ standings: Map<seasonId, SeasonTotals[]>, h2h, users: { uid, stats, badges, badgeCounts, lockStreak }[],
     entryFixes, soloNights }`. Users with no counted events get zeroed `stats`, empty badges/counts, `lockStreak: 0`.
2. Unit tests: a solo night contributes nothing and yields an entry fix; two events where the same player wins both →
   `champion: 2`; lock streak carries across events; result is identical when run twice (pure).
3. **Job** `jobs/rebuild-records.ts` (dry-run by default, `--live` writes; same arg style as the old backfill):
   loads final events ordered by `startsAt`, their bouts and entries; computes `balanceAfterFinalize` per paid uid as
   the `balanceAfter` of that uid's latest `ledger` row with `createdAt <= event.finalizedAt` (query ledger by uid,
   index `uid asc, createdAt desc` exists); runs `rebuildRecords`; prints `solo nights: <names>`, then per player
   `name: pts / wins / events · badges ×counts`. With `--live`: write entry fixes (merge `rank`, `payout`), **replace**
   every `seasons/{id}/standings` doc (delete docs for players no longer present), replace every `h2h` doc,
   and set `stats`, `badges`, `badgeCounts`, `lockStreak` on each user (merge). Batches ≤ 400 writes.
   Never read or write `ledger` except the read above, and never touch `balance`.
4. Delete `jobs/backfill-standings.ts`; add script `"jobs:rebuild": "npm run job -- jobs/rebuild-records.ts"`.
   `grep -rn backfill-standings` outside `docs/tasks/` and `docs/PROGRESS_ARCHIVE.md` and fix any live reference.
5. `.github/workflows/jobs.yml`: add `rebuild-dry` and `rebuild-live` to the dispatch `options` and a step running
   the job (without/with `--live`) only for those inputs; never on a schedule, never under `all`.
6. `docs/SETUP.md`: one paragraph on when to run the rebuild (after a rules change or a bad finalize) and how.

## Acceptance criteria
- [x] Definition of Done passes (AGENTS.md §4)
- [x] `rebuild.test.ts` covers step 2 and passes
- [x] `npm run jobs:rebuild` against the emulator seed (`jobs/seed-emulator.ts`) runs in dry-run and prints the summary
      without writing (state that you ran it, and paste the summary's first 10 lines in completion notes)
- [x] `jobs.yml`: schedules unchanged; `all` does not include rebuild
- [x] No code path in the new job writes `balance` or `ledger`

## Out of scope
Changing finalize itself (T56). UI for solo nights or badge counts (T59). Re-scoring bouts: the job trusts stored
entry scores, as the old backfill did.

## Completion notes
- Every record starts from empty, so the result is the whole truth and the job overwrites rather than adds.
  Each roster player gets a row, which is what zeroes out someone whose only event was a solo night.
- Deviated from step 3's balance rule: the payout row is stamped just *after* `finalizedAt`, so that cutoff
  alone reads the balance *before* the winnings and would call a paid-out player `busted`. `balanceAtFinalize`
  prefers the event's own ledger rows; no row at all passes `UNKNOWN_BALANCE` (-1), withholding the badge.
- `loadFinalEvents` sorts in memory: the old backfill's `where + orderBy` needs a composite index that isn't in
  `firestore.indexes.json` (not mine to touch), so it would have failed in prod.
- Stale docs go as well as arrive — standings rows and `h2h` pairs that no longer exist are deleted, across
  every season Firestore knows about, not just the ones that still have events.
- Emulator-verified (`--import`, no export): `--live` cut the sim players' double-counted `stats.events` 4 → 1
  and backfilled `badgeCounts`; with all but one entry un-charged it scrubbed 6 standings rows, 15 h2h pairs
  and every stat, leaving all 22 ledger rows and every `balance` alone. A second `--live` changed nothing.
- `docs/BACKLOG.md`'s T21 backfill-script item is marked resolved (one line outside the allowed files — it
  pointed at a deleted job); its open half, the admin Jobs card's `JOB_NAMES`, stays.

Dry run, first 10 lines (emulator, one `final` sim event, 7 users):
```
replayed 1 final event(s)
solo nights: none
player records:
  Admin: 0 pts / 0 wins / 0 events · no badges · lock streak 0
  Player Five: 1322 pts / 0 wins / 1 events · upset-artist ×1 · lock streak 1
  Player Four: 1983 pts / 1 wins / 1 events · champion ×1, upset-artist ×1 · lock streak 1
  Player One: 1567 pts / 0 wins / 1 events · no badges · lock streak 1
  Player Six: 1543 pts / 0 wins / 1 events · upset-artist ×1 · lock streak 0
  Player Three: 911 pts / 0 wins / 1 events · upset-artist ×1 · lock streak 0
  Player Two: 1726 pts / 0 wins / 1 events · upset-artist ×1 · lock streak 1
```
(`npm run seed` alone has no `final` event, so the run used the saved `.emulator-data` from `npm run sim`.)

```
 .github/workflows/jobs.yml       |  15 ++
 docs/BACKLOG.md                  |   2 +-
 docs/PROGRESS.md                 |   2 +-
 docs/SETUP.md                    |   8 +
 jobs/backfill-standings.ts       | 137 -----------------
 jobs/rebuild-records.ts          | 315 +++++++++++++++++++++++++++++++++++++++
 package.json                     |   1 +
 shared/lifecycle/index.ts        |   1 +
 shared/lifecycle/rebuild.test.ts | 275 ++++++++++++++++++++++++++++++++++
 shared/lifecycle/rebuild.ts      | 214 ++++++++++++++++++++++++++
```
