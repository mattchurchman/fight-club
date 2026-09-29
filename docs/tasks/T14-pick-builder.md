# T14 — Pick builder & submission

**Tier:** B · **Size:** L · **Depends on:** T04, T13
**USER ACTION REQUIRED:** none

## Goal
Fast, fun, one-handed pick-making: tap a winner, tap a method, set a stake, mark the lock, then submit. Live validation uses
`shared/validation.ts`. The draft survives reloads. Picks can be edited until lock, then they're read-only.

## Context to load (only these)
- `AGENTS.md`
- `docs/GAME_RULES.md` → sections 2, 3, 4 (to show the potential payout)
- `docs/DESIGN.md` → "BoutCard", "BudgetMeter", "Voice"
- `docs/DATA_MODEL.md` → entries
- Exports only: `shared/validation.ts`, `shared/scoring.ts`, `src/features/events/index.ts`, `src/components/ui/index.ts`

## Files you may touch
`src/features/picks/**`, `src/features/events/BoutCard*.tsx` (add pick mode via props only), `src/features/events/EventPage*.tsx` (mount the builder)

## Steps
1. `usePickDraft(eventId)`: loads the existing entry or a local draft (sessionStorage wrapped in try/catch) and exposes
   `setWinner`, `setMethod`, `setStake`, `setLock`, `setFirstBlood`, `autoBalance()` (spread the remaining points evenly in 25s within min/max),
   plus `validation` from `validateEntry`.
2. BoutCard pick mode: tap a fighter half → winner (glow + check); method chips; `Stepper` with presets; 🔒 toggle (exactly one; tapping
   another moves it); "If right: +N pts" preview using `scoreBout` with the current odds (and a lock preview).
3. `BudgetMeter` (sticky): allocated/budget, a progress bar, an "Auto-balance" button, and the Submit button (disabled with the first error's message).
4. First Blood section (only when `event.firstBloodEnabled`): pick a bout, then a fighter.
5. Submit → write `events/{id}/entries/{uid}` (`status 'submitted'`, `submittedAt` = server timestamp on first write, `updatedAt` every time).
   Show a success toast ("Picks in. Good luck."). Handle a rules rejection after lock → toast plus switch to read-only.
   Show a balance check up front: if `balance < buyIn` → "You're broke. Beg the admin." with a link to the Wallet.
6. After lock or when viewing a past event: a read-only summary of your picks with the score once available.
7. Tests: the draft reducer, autoBalance, the lock toggle's exclusivity, the submit-disabled reasons, and the payout preview for E1/E3.

## Acceptance criteria
- [ ] On the seed: a player completes and submits picks in under 30 taps, reloads, sees them, edits, resubmits
- [ ] Faking time past `lockAt` in the emulator (edit the event doc) makes the UI read-only, and writes are rejected
- [ ] Definition of Done passes. Build passes.

## Out of scope
Viewing others' picks (T15).

## Completion notes
_(agent fills in)_
