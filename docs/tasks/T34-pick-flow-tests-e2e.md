# T34 — Pick flow tests & e2e update

**Tier:** B · **Effort:** low · **Size:** S · **Depends on:** T33
**USER ACTION REQUIRED:** none (needs the emulator ports free — stop any running `npm run emulators` first)

## Goal
Bring the Playwright happy path in line with the new deck and add a focused component test for the deck, so the
pick flow stays protected.

## Context to load (only these)
- `AGENTS.md`
- `e2e/happy-path.spec.ts` lines 55–100 (the picks step)
- Exports only: `src/features/picks/PickDeck.tsx`, `src/features/picks/ReviewSlide.tsx`

## Files you may touch
`e2e/happy-path.spec.ts`, `src/features/picks/*.test.tsx` (new)

## Steps
1. e2e picks step: on Fights click `Make your picks`; for each fight slide: click the first `button[aria-label^="Pick "]`
   visible in the slide, `KO`, preset `100`, then `Next fight →` (last: `Review picks →`). On review: click the first
   `Lock …` button, the First Blood choice if shown, `Auto-balance`, `Submit picks`; expect `Picks in. Good luck.`
2. The rest of the spec (reveal, live, payout) must still pass; adjust only selectors that changed (e.g. Live text).
3. Component test (jsdom): render `ReviewSlide` with a draft missing one pick → button reads `Pick 1 more fights`
   (or the singular form you implemented) and is disabled.
4. Run `npm run test:e2e`.

## Acceptance criteria
- [ ] Definition of Done passes.
- [ ] `npm run test:e2e` passes.

## Out of scope
Any app code changes. If the e2e reveals a bug, fix only if ≤10 lines in `src/features/picks/**`; otherwise log it.

## Completion notes
- Rewrote the e2e picks step for the deck: click `Make your picks`, then for each fight slide
  (scoped by `.snap-center` index to avoid matching later/earlier slides) pick fighter A, `KO`,
  stake `200`, and `Next fight →`/`Review picks →`.
- Used a 200 stake (not the 100 the task sketch suggested): 5 main-card bouts × 200 ==
  `DEFAULTS.budget` (1000), so Auto-balance — which only fills bouts with *no* stake set
  (`usePickDraft.autoBalance`) — stays a true no-op and Submit is ready immediately. 100/bout left
  500 unallocated with every bout already staked, so Auto-balance never topped it up.
- Scoped the Lock/First-blood/Auto-balance/Submit clicks to the review slide's own buttons —
  off-screen `FightSlide`s stay mounted with their own "Make this my lock" buttons that also
  case-insensitively match `/Lock/`.
- Live-tab assertions needed `{ exact: true }`: the leaderboard row name and the new
  "`<name>'s picks`" section heading both contain the player's display name.
- Added `ReviewSlide` component test for the missing-pick submit-button state — already present
  from T33, no change needed.
