# T33 — Review slide, submit & locked view

**Tier:** B · **Effort:** high · **Size:** M · **Depends on:** T32
**USER ACTION REQUIRED:** none

## Goal
The last slide of the deck: every pick in one list, stakes tweakable, lock and First Blood chosen, Auto-balance, and
a submit button whose label tells you exactly what's missing. Then remove the old builder.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Pick deck" (Review slide + Locked bullets)
- `src/features/picks/PickDeckPage.tsx`, `src/features/picks/FirstBloodPicker.tsx`
- Exports only: `shared/validation.ts` (error codes), `src/features/picks/usePickDraft.ts`

## Files you may touch
`src/features/picks/**`, `src/features/events/BoutCard.tsx` (remove pick mode only),
`src/features/events/FightCardList.tsx`

## Steps
1. **ReviewSlide**: `SectionLabel` "Your card". One row per active fight: picked surname (tap → jump to that slide),
   method, `[−] stake [+]` (step 25, clamped), 🔒 button (`aria-label="Lock <surname>"`, one at a time). Unpicked rows say
   `Not picked` in `muted`.
2. First Blood (if `event.firstBloodEnabled`): restyle `FirstBloodPicker` into this slide (chips, inverted selection).
3. `Auto-balance` secondary button (exact text) → existing `autoBalance()`.
4. **Submit button** label by first unmet condition (pure fn `submitLabel(state)` + tests):
   broke → `You're broke. Beg the admin.` (links to /wallet) · missing picks → `Pick N more fights` ·
   budget off → `Adjust stakes: N left` / `Adjust stakes: N over` · no lock → `Choose your lock` · ready → `Submit picks`
   (`Update picks` if an entry exists). Disabled unless ready. Tapping a disabled button sets `attemptedSubmit` (T32).
5. On success: toast `Picks in. Good luck.` (or `Picks updated.`), clear draft as today, navigate to `/event/:id`.
   On a rejected write: toast `Picks locked. No take-backs.`
6. **Locked view**: `FightCardList readOnly` rows show method, stake, 🔒, and the bout score once final (`+N` in `win`
   with ✓, `0`/negative in `muted` with ✗).
7. Delete `PickBuilder.tsx`, `BudgetMeter.tsx` (+ test), and `BoutCard`'s `pick` prop branch if nothing else uses it
   (grep first).

## Acceptance criteria
- [x] Definition of Done passes; `npm run build` passes.
- [x] `submitLabel` tests cover every branch.
- [x] Full flow on the emulator seed: pick 5 fights → review → adjust stakes to budget → lock →
      first blood → submit → back on Fights with `Edit picks`. (Verified by manually stepping a
      row's stake rather than tapping Auto-balance; that button itself is unit-tested.)

## Out of scope
e2e spec updates (T34).

## Completion notes
- `submitLabel` (pure fn + 7 tests) picks the Submit button's text/ready state from broke →
  missing picks → budget diff → lock → ready, in that order.
- `ReviewSlide` (+ 11 tests) replaces the inline `FirstBloodPicker`+`BudgetMeter` block: per-fight
  rows (jump/stake stepper/lock), restyled `FirstBloodPicker` (no `Card`, `SectionLabel`), and a
  Submit button that's `aria-disabled` (not `disabled`) so tapping it while not ready still sets
  `attemptedSubmit` — it was previously unreachable since the old disabled button ate the click.
  On success the deck now also navigates to `/event/:id` (DESIGN.md said to; PickDeck didn't).
- Deleted `PickBuilder.tsx`, `BudgetMeter.tsx(+test)`, and `BoutCard`'s whole pick-mode branch
  (grepped first — nothing else referenced it after `PickBuilder` goes); also trimmed its test file
  to match, since leaving it would have broken the build (outside T33's listed files, but required
  for the Definition of Done).
- `FightCardList` gained an optional `scores` prop for the locked-view bout score (+N/✓ win,
  N/✗ muted) per DESIGN.md, but `EventPage.tsx` (not in this task's allowed files) still doesn't
  pass it — follow-up noted in PROGRESS.md.
- Verified live on the emulator (seed `p1@test.dev`): full deck flow, auto-advance, review editing,
  first blood, submit, redirect, and `Edit picks` on return all work; no console errors.
