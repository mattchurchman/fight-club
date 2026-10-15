# T27 — Restyle sweep: admin, auth, wallet, help, install, notifications

**Tier:** C · **Effort:** low · **Size:** M · **Depends on:** T26
**USER ACTION REQUIRED:** none

## Goal
Move the screens that won't be redesigned off the legacy color aliases using the mapping table, and fix the
wallet's duplicated amount. Purely mechanical: same layout, new tokens.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Tokens" (the mapping table)
- `src/features/wallet/ledgerLabels.ts` and its test

## Files you may touch
`src/features/admin/**`, `src/features/wallet/**`, `src/features/help/**`, `src/features/install/**`,
`src/features/notifications/**`, `src/features/auth/OnboardingPage.tsx`, `src/features/auth/NotInvitedPage.tsx`

## Steps
1. `grep -rnE "(text|bg|border|ring|from|to|fill|stroke)-(gold|blue|loss)" <the folders above>`. Replace each match
   using the DESIGN mapping table. Judge "selected/mine" vs "token amount" vs "error" vs "wrong" by reading the line
   only, not the whole file.
2. Don't touch `corner=` props (T29 makes them inert, T43 removes them).
3. Wallet: `ledgerLabels.ts` currently puts the amount inside the label ("Adjustment · 'note' -80") while the row also
   shows it on the right. Remove the amount from the label and drop the quotes around notes:
   `Adjustment · Lost a side bet to Tony`. Update `ledgerLabels.test.ts`.
4. Wallet balance number: `text-text` with display font (no gold).

## Acceptance criteria
- [ ] Definition of Done passes; `npm run build` passes.
- [ ] The grep in step 1 returns nothing for these folders.
- [ ] Ledger rows show the amount once.

## Out of scope
Layout changes, other folders, the UI kit (T29).

## Completion notes
Replaced all 18 legacy color aliases (gold → text, blue → steel, loss → red-text) across admin, auth, wallet, help, install, and notifications screens. Fixed wallet ledger labels to remove duplicated amount and drop quotes around notes. Updated all input focus states and TokenRequestSheet status colors. All tests, lint, typecheck, and build pass. Verified grep returns nothing for legacy colors in target folders.
