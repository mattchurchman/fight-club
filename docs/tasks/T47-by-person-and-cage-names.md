# T47 — By-person view & In the Cage names

**Tier:** B · **Effort:** medium · **Size:** S · **Depends on:** T46
**USER ACTION REQUIRED:** none

## Goal
Add a "By person" toggle to Everyone's picks (one row per friend across the card), and replace the initials in the
Live tab's In the Cage block with the compact name rows from T46.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Everyone's picks (reveal, after lock)" (last two bullets)
- `src/features/live/PicksSection.tsx`, `src/features/live/InTheCage.tsx` lines 40–100
- Exports only: `src/features/live/pickers.ts`, `src/features/live/PickerRow.tsx`, `src/components/ui/Tabs.tsx`

## Files you may touch
`src/features/live/PicksSection.tsx`, `src/features/live/ByPersonGrid.tsx` (new), `src/features/live/pickers.ts` (+ test),
`src/features/live/InTheCage.tsx`

## Steps
1. `PicksSection`: `Tabs` with `By fight` (default) and `By person`; remember the choice in component state only.
2. Helper `byPerson(entries, bouts, selfUid, firstBloodEnabled)` in `pickers.ts` → rows `{ uid, name, isSelf, cells:
   { surname, isLock, firstBlood }[] }` in card order, self first then name. Test it.
3. `ByPersonGrid`: a table inside `overflow-x-auto`; header `F1…Fn` (label style); first column name (sticky left,
   `surface` bg); cells = picked surname in display font 11px + 🔒/🩸. Self row inverted. Row tap opens the PlayerSheet
   (reuse the same `onTap` → `setOpenUid` pattern as RevealGrid).
4. `InTheCage`: replace each side's avatar list with `PickerRow compact` items built by `pickersFor` (stacked, max 6
   shown then `+N more` in `muted`).

## Acceptance criteria
- [ ] Definition of Done passes; `npm run build` passes.
- [ ] By person shows every entrant once with 5 cells; at 375px the table scrolls sideways inside its card, not the page.
- [ ] In the Cage lists names (you first) under each fighter.

## Out of scope
Swing-line wording and layout fixes (T48).

## Completion notes
_(agent fills in: ≤10 lines, ending with `git diff --stat`)_
