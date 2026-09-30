# T18 — Admin console: event controls & manual results

**Tier:** B · **Size:** M · **Depends on:** T09, T13, T17
**USER ACTION REQUIRED:** none

## Goal
The admin can fix anything the automation gets wrong or can't do: enable events, adjust the card, override odds, enter
results and first blood, and trigger a rescore or finalize from the phone.

## Context to load (only these)
- `AGENTS.md`
- `docs/DATA_MODEL.md` → events, bouts
- `docs/GAME_RULES.md` → sections 4.6 and 6 (first blood and finalize implications)
- Exports only: `shared/lifecycle/index.ts`, `shared/ledger-plan.ts`, `src/features/admin/postLedger.ts`, `src/features/events/index.ts`

## Files you may touch
`src/features/admin/events/**`, `src/app/routes` (`/admin/events`, `/admin/events/:id`)

## Steps
1. Event list: every imported event (including disabled Fight Nights) with an enable toggle, buy-in, first-blood toggle, and status.
   Edits to buy-in or first blood are only allowed while `open`.
2. Event detail, per bout: reorder or remove from the main card (before lock), override odds (sets `source 'manual'`), and enter or override a
   result (winner/method/round/time, `source 'manual'`). First Blood buttons: A, B or "none".
3. Actions: **Rescore now** (runs `planScores` client-side with the shared planners and writes the entries), **Finalize now** (runs
   `planFinalize` in a transaction; confirm with a typed "FINALIZE"), **Cancel event** (refunds; typed confirmation).
   Use the shared planners as they are. If one is missing a capability, stop and report it; don't fork the logic.
4. Show a diff preview before writing (e.g. "3 entries' scores will change").
5. Tests: the form validation and the "can edit?" rules by status.

## Acceptance criteria
- [x] On the seed: enter results manually for all bouts, set first blood, finalize, and the payouts land in wallets. A second finalize is blocked.
- [x] Rules tests still pass. Definition of Done passes. Build passes.

## Out of scope
New scoring rules.

## Completion notes
`/admin/events` (list, enable toggle) and `/admin/events/:id` (terms, per-bout card reorder/remove,
odds override, result + first-blood entry, Rescore/Finalize/Cancel with a diff preview and typed
confirmation for the latter two). `actions.ts` mirrors `jobs/lifecycle.ts`'s own Firestore glue
exactly, including write order (status flips to `final`/`cancelled`-settled **last**, so a crash
mid-run is safe to retry) — see DECISIONS.md for why that's what "in a transaction" became. Verified
live against the emulator: seeded 3 entries, entered all 5 results + first blood, Rescored, Finalized
(payouts landed, balances correct, standings folded), confirmed Finalize/Rescore/Cancel all disable
once `final`. Cancel's code path (same `postLedgerRow`, same order-last pattern) wasn't separately
live-tested — only one seeded event, already spent on Finalize. `mainCardBoutIds` display field
(nothing else reads it) discovered stale-if-unmaintained; kept it in sync in `saveCard` anyway.
