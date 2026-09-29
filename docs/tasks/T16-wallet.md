# T16 — Wallet & token requests

**Tier:** C · **Size:** S · **Depends on:** T12
**USER ACTION REQUIRED:** none

## Goal
Players see their token balance, a readable ledger history, and can ask the admin for more tokens.

## Context to load (only these)
- `AGENTS.md`
- `docs/DATA_MODEL.md` → users.balance, ledger, tokenRequests
- `docs/DESIGN.md` → "Voice"
- `src/components/ui/index.ts` (exports)

## Files you may touch
`src/features/wallet/**`, `src/app/routes` (Wallet tab), `src/app/layout` (wire the TokenPill to the live balance)

## Steps
1. `useBalance()` (live from `users/{uid}`) → the header TokenPill.
2. Wallet page: a big balance number (gold, Anton) and the ledger list (`ledger` where uid == me, newest first, paginated by 20)
   with human labels: "Buy-in · UFC 320 −100", "Payout · UFC 320 +350", "Grant from admin +500 · 'lol pay me back'".
3. "Request tokens" sheet: amount presets (100/250/500/custom ≤1000) and an optional note → creates a `tokenRequests` doc (pending).
   Show pending, approved and denied requests with status chips. Only one pending request at a time (checked in the UI).
4. Copy for zero balance: "You're broke. Beg the admin."
5. Tests: ledger label formatting and the request form validation.

## Acceptance criteria
- [ ] On the seed: the balance shows in the header, the ledger renders, and a request can be created and shows as pending
- [ ] Definition of Done passes. Build passes.

## Out of scope
Approving requests (T17).

## Completion notes
_(agent fills in)_
