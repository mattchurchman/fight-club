# T35 — Live derivations: current fight, swings, rank moves

**Tier:** B · **Effort:** high · **Size:** M · **Depends on:** T29
**USER ACTION REQUIRED:** none

## Goal
Pure, tested functions that power the new Live tab: which fight is on, what each outcome does to the standings,
how ranks moved since the last result, and a results feed. No UI in this task.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Live tab" (the swing-math and fight-order bullets)
- `docs/GAME_RULES.md` → §4–§5 (scoring, ranking)
- Exports only: `shared/scoring.ts` (`scoreEntry`, `rankEntries`), `src/features/live/leaderboard.ts`,
  `src/features/live/reveal.ts`

## Files you may touch
`src/features/live/derive.ts` (new), `src/features/live/derive.test.ts` (new), `src/features/live/hooks.ts` (add one hook)

## Steps
1. `fightOrder(bouts)`: main-card bouts sorted by `order` **descending** (main event last).
2. `currentBout(bouts)`: first in fight order with `result == null` and status ≠ `cancelled`; `null` when none.
   If any bout has `status === 'live'`, prefer it (jobs don't set it today, admins might).
3. `projectOutcome(entries, bouts, boutId, winner: 'A'|'B', rules)`: clone bouts with that bout's result set to
   `{ winner, method: 'OTHER', firstBlood: null, … }` (OTHER never earns the method bonus → "at least"), score every entry
   with `scoreEntry`, rank with `rankEntries`. Returns `{ uid, total, rank }[]`. Never mutates inputs.
4. `swingLines(entries, bouts, boutId, selfUid, names)`: for side A and B → `{ side, fighterName, self: { rank, delta },
   newLeader: { uid, name } | null }`, where `delta` = projected total − current total and `newLeader` is set only if #1
   changes. Self is null if the viewer has no entry.
5. `rankMoves(prev: Record<uid, rank>, next)`: `{ [uid]: number }` (+ = moved up).
6. `resultsFeed(bouts, entries, selfUid)`: finished bouts, most recent first (reverse fight order), each
   `{ boutId, winnerName, loserName, method, round, pickedWinner: n, total: m, selfDelta: number | null }`; draws/NC
   labelled, cancelled excluded.
7. Hook `useRankMoves(rows, lastResultKey)` in `hooks.ts`: keeps the previous rank map in a ref and only recomputes
   moves when `lastResultKey` (id of the latest finished bout) changes.
8. Tests: every function, including a lock-of-the-night swing (lock doubles base, wrong lock penalty), a push, ties
   sharing rank, no-entry viewer, and fight-order with a cancelled bout.

## Acceptance criteria
- [x] Definition of Done passes.
- [x] `projectOutcome` totals equal `scoreEntry` totals when the hypothetical matches a real result with method `OTHER`.

## Out of scope
Components (T36–T38). Changing `shared/`.

## Completion notes
Built all six functions in `derive.ts` plus `useRankMoves` in `hooks.ts`. `fightOrder` is
`mainCardBoutIds(bouts).reverse()`; `resultsFeed`'s "most recent first" is `mainCardBoutIds`
directly (its reverse cancels `fightOrder`'s own). `swingLines` ended up needing an `EventRules`
param the step list didn't list, since it calls `projectOutcome`, which needs one for
`scoreEntry` — "self"'s *current* total comes straight off each entry's live `score.total`
(kept current by jobs as results land), only the projected side is recomputed. `newLeader` is
null on a tie at rank 1, before or after, rather than guessing which tied leader to name.
19 new tests in `derive.test.ts`. Full suite (489), lint, typecheck and build all green.
