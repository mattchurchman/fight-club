# T04 — Scoring, validation & payout engine (test-first)

**Tier:** A · **Size:** L · **Depends on:** T03
**USER ACTION REQUIRED:** none

## Goal
Pure, deterministic functions that implement GAME_RULES.md exactly. They're the only place this logic
exists, and both the jobs and the admin UI call them.

## Context to load (only these)
- `AGENTS.md`
- `docs/GAME_RULES.md` (all of it)
- `shared/types.ts`, `shared/constants.ts`, `shared/odds.ts` (skim exports only)

## Files you may touch
`shared/validation.ts`, `shared/scoring.ts`, `shared/payouts.ts`, `shared/standings.ts`, `shared/index.ts`, and their `*.test.ts`

## Steps
1. **Write the tests first:** every worked example E1–E10 from GAME_RULES §7 as a named test, then edge cases:
   budget adjustment when bouts are cancelled, stake not a multiple of 25, missing lock, lock on a cancelled bout,
   first blood void, negative totals, 3-way tie for 1st, tie across paid/unpaid boundary, 0 entrants, 2 entrants.
2. `validation.ts`: `computeBudget(activeBoutCount, defaults)`, `validateEntry(entry, bouts, event) → { ok, errors: {boutId?, code, message}[] }`.
   Error codes are a string union (e.g. `STAKE_RANGE`, `STAKE_STEP`, `BUDGET_MISMATCH`, `MISSING_PICK`, `LOCK_REQUIRED`, `FIRST_BLOOD_REQUIRED`).
   The UI will show `message`.
3. `scoring.ts`: `scoreBout(pick, bout, isLock, cfg)`, `scoreEntry(entry, bouts, event, cfg)` → matches `EntryScore`
   in types. Pending bouts → `null`. `rankEntries(scoredEntries)` → ranks with the tiebreakers and shared ranks.
4. `payouts.ts`: `computePayouts(rankedEntries, buyIn) → { uid, amount }[]` and `payoutTableFor(n)`. The sum of payouts
   **must equal the pot** (assert this in tests with a property-style loop over n = 1..20 and random ties).
5. `standings.ts`: `applyEventToStandings(prev, rankedEntries, payouts, buyIn, bouts)` → updated standings rows plus
   h2h deltas (for each pair of entrants, who scored higher). It's used at finalize (T09) and in T21.
6. Keep every function side-effect free. Config is passed in. Nothing reads the clock.

## Acceptance criteria
- [ ] E1–E10 pass by name (`it('E3: lock doubles base…')`)
- [ ] Pot conservation holds for n = 1..20 with random ties
- [ ] 100% branch coverage on `scoring.ts` and `payouts.ts`
- [ ] Definition of Done passes

## Out of scope
Firestore reads/writes, UI.

## Completion notes
_(agent fills in)_
