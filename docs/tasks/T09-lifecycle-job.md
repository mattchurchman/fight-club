# T09 — Job: event lifecycle (lock → results → score → finalize → payout)

**Tier:** A · **Size:** L · **Depends on:** T04, T06, T07
**USER ACTION REQUIRED:** none

## Goal
`jobs/lifecycle.ts` is a single idempotent state machine that can run every 15 minutes and does the right thing
whatever state it finds. It's the only automated writer of balances, ledger rows, scores and payouts.

## Context to load (only these)
- `AGENTS.md`
- `docs/GAME_RULES.md` → sections 2, 4, 5, 6
- `docs/DATA_MODEL.md` → events, bouts, entries, ledger, users, seasons, h2h
- Exports only: `shared/scoring.ts`, `shared/payouts.ts`, `shared/validation.ts`, `shared/standings.ts`, `jobs/lib/espn.ts` (`parseResult`)
  (note: `planResults` takes already-parsed results, so `shared/` never imports from `jobs/`)

## Files you may touch
`shared/ledger-plan.ts`, `shared/lifecycle/*.ts` (+ tests), `jobs/lifecycle.ts`, `jobs/lib/ledger.ts`, `jobs/lib/ledger.test.ts`,
`package.json` (script `jobs:lifecycle`)

**Placement rule:** planners are **pure** and live in `shared/` (no firebase imports), because the admin UI (T17/T18) reuses them.
Only the executor (Firestore reads/writes, ESPN fetch) lives in `jobs/`.

## Steps
1. `shared/ledger-plan.ts`: `ledgerId(type, eventId, uid)` (deterministic: `buyin_<eventId>_<uid>`, `payout_…`, `refund_…`,
   `grant_start_<uid>`; random for admin grants/adjusts) and `planLedgerRow(balance, input) → { row, newBalance }`.
   `jobs/lib/ledger.ts`: `postLedger(tx, input)` uses it inside a Firestore **transaction**. If the deterministic doc already exists, it's a no-op,
   so re-runs can't double-charge or double-pay.
2. Pure planners in `shared/lifecycle/`, plus a thin executor in `jobs/lifecycle.ts`:
   - `planLock(event, bouts, entries, users, now)`: when `status == 'open' && now >= lockAt`, it validates each entry with `validateEntry`
     (invalid → `void`), skips users whose balance is below buyIn (`void`), charges buy-ins, freezes odds (missing odds → `+100/+100, source 'default'`),
     sets `paidEntrants`, `pot` and `status 'locked'`.
   - `planResults(event, bouts, espnJson)`: maps new results via `parseResult` (skips bouts with `result.source == 'manual'`), sets the bout
     status, and moves the event `locked → live` on the first result.
   - `planScores(...)`: recomputes `score` for every non-void entry with `scoreEntry`, then `rank` with `rankEntries`. It runs whenever results change.
   - `planFinalize(...)`: when every main-card bout is `final` or `cancelled` **and** (first blood disabled, or every entry's chosen bout has
     `firstBlood` set, or 12 h have passed since the last result), compute payouts, post the ledger rows, write `entry.payout`, update the season
     standings, h2h and `users.stats`, set `status 'final'` and `finalizedAt`.
   - Cancelled event → refund everyone charged.
   Export every planner from `shared/lifecycle/index.ts` (T17/T18 import from there).
3. The executor loads the candidate events (status in open/locked/live, or `lockAt` within the next 30 min) and fetches the ESPN event only for
   locked or live ones. It applies the plans, calls `recordJobRun('lifecycle', …)`, and exits 0 fast when there's nothing to do.
4. Flags: `--dry-run` (default), `--live`, `--fixture`, `--now <iso>` (to simulate time), `--event <id>` (limit scope).
5. Tests (pure planners): a full walk-through against a fixture event with 4 seeded entries moving open → locked → live → final.
   Assert balances, ledger rows, ranks and payouts. Also: re-running every stage is a no-op, an invalid entry is voided, a broke user
   is voided, a bout cancelled mid-event is a push, a manual result isn't overwritten, and first blood waits then voids after 12 h.

## Acceptance criteria
- [x] Walk-through test passes. Ledger sums equal the balance deltas. Pot conservation holds.
- [x] Emulator smoke: `npm run seed`, then `npm run jobs:lifecycle -- --live --now <after lockAt> --fixture <completed event>` finalizes the
      seeded event, and a second run changes nothing
      (three runs: the prop-hold means finalize lands on the run after the 12 h grace; the fourth is a no-op)
- [x] Definition of Done passes

## Out of scope
Scheduling (T10), notifications (T24), badges (T23 adds a hook in finalize).

## Completion notes
Five pure planners in `shared/lifecycle/` (lock, results, scores, finalize, cancel) exported from
`index.ts`, plus `shared/ledger-plan.ts`; `jobs/lifecycle.ts` is the executor and `jobs/lib/ledger.ts`
the only balance writer. Planners take epoch millis, not `Timestamp` — that keeps `shared/` free of
firebase and drops straight into the generic `Bout<Ts>`/`Entry<Ts>` types. Idempotency is two-layered:
each planner refuses to fire outside its own status, and ledger rows carry derived ids.
Deviations (logged in DECISIONS.md): deterministic ledger ids; `finalizedAt` marks a settled cancellation;
one missing price defaults both sides; `--fixture` is repeatable (a result needs two ESPN responses).
`planResults` also takes `now` — it stamps `result.updatedAt`, and a planner can't read the clock.
Emulator smoke ran lock → results → live → first-blood hold → finalize → no-op; pot 200 in, 200 out.
Follow-ups: `npm run seed` seeds no entries, so the smoke needed a throwaway script; nothing yet writes
`result.firstBlood`, so every event with the prop on waits the full 12 h until T18 ships.
