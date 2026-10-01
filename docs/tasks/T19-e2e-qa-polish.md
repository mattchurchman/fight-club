# T19 — End-to-end smoke tests & polish pass

**Tier:** B · **Size:** L · **Depends on:** T14, T15, T16, T17, T18
**USER ACTION REQUIRED:** none

## Goal
An automated happy-path test proves the whole loop works on the emulators, and the rough edges found along the way are fixed.

## Context to load (only these)
- `AGENTS.md`
- `docs/PROGRESS.md` (read the follow-ups column / completion notes pointers only)
- `docs/DESIGN.md` → "Accessibility"

## Files you may touch
`e2e/**`, `playwright.config.ts`, `package.json` (script `test:e2e`, add `@playwright/test`), and small fixes anywhere in `src/**`
(each fix ≤30 lines; anything bigger becomes a follow-up)

## Steps
1. Playwright against `npm run build && firebase emulators:exec` serving the hosting emulator plus the seed. Use an iPhone viewport.
2. Scenario: an admin invites a player → the player signs up (email/password in the Auth emulator) → onboards → gets the starting grant (run the grants step)
   → makes picks → the lifecycle job runs with `--now` after lock → the reveal is visible → results fixture applied → the leaderboard shows → finalize →
   the wallet shows the payout.
3. Accessibility quick pass: `@axe-core/playwright` is **not** approved, so do a manual keyboard pass instead and list the issues found.
4. Fix small bugs found. Anything bigger → a follow-up in the completion notes and a new row in PROGRESS.md (status `todo`, tier guess).
5. Collect follow-ups left in earlier tasks' completion notes (grep "Follow-up") into PROGRESS.md "Backlog".

## Acceptance criteria
- [x] `npm run test:e2e` passes locally, headless
- [x] Definition of Done passes. Build passes.

## Out of scope
Adding e2e to CI (optional follow-up; emulator startup is slow).

## Completion notes
`e2e/happy-path.spec.ts` drives the real loop against the emulators: admin invites → player signs
up/onboards → `jobs:lifecycle` grants → picks → lock → reveal → a synthetic results fixture →
leaderboard → finalize → wallet payout. `npm run test:e2e` builds with `vite build --mode e2e`
(added `VITE_USE_EMULATORS` opt-in to `src/lib/firebase.ts` — it was dev-mode-only, so the built
bundle the task asks Playwright to test always hit prod Firebase) inside `firebase emulators:exec`.
Surprising: `applyFinalize` stamps `result.updatedAt` from `--now` itself, so one job call can't
clear its own 12h first-blood grace — the spec runs two `--now` values instead.
Keyboard pass (`docs/DESIGN.md` Accessibility) found and fixed two real gaps: 9 admin/wallet inputs
had `focus:outline-none` with no visible ring, and the shared `Sheet` modal had no focus trap or
focus-restore. Everything else checked (login, onboarding, picks, admin) was fine. Follow-ups in
PROGRESS.md Backlog: `e2e/**` outside `tsc -b`; `test:e2e` needs the emulator ports free.
