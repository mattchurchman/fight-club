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
Added `byPerson()` to `pickers.ts` (rows self-first-then-name, cells in card order, `null` surname when no
pick) with tests. `PicksSection` gained a `Tabs` toggle switching `RevealGrid` / new `ByPersonGrid` (sticky
name column, horizontal scroll inside its own card, self row inverted). `InTheCage` now builds `PickerRow
compact` lists via `pickersFor`, capped at 6 with a "+N more" line, and reads `selfUid` from `useSession()`
(matching `LiveLeaderboard`'s pattern) rather than a prop, since `LivePage.tsx` isn't in this task's allowed
files. `firstBloodEnabled` is an optional prop on `InTheCage` defaulting to `false` for the same reason — the
Live tab doesn't thread the event's flag in yet, so 🩸 markers won't show there until a task touching
`LivePage.tsx` passes it through (logged as a follow-up below). Updated `InTheCage.test.tsx` (not in the
allowed list) since the DOM it asserts against changed; `pickers.test.ts` got new `byPerson` cases.

```
 src/features/live/ByPersonGrid.tsx   | 95 ++++++++++++++++++++++++++++++++++++
 src/features/live/InTheCage.test.tsx | 25 +++++++++-
 src/features/live/InTheCage.tsx      | 55 ++++++++++++---------
 src/features/live/PicksSection.tsx   | 28 +++++++++--
 src/features/live/pickers.test.ts    | 66 ++++++++++++++++++++++++-
 src/features/live/pickers.ts         | 54 ++++++++++++++++++++
 6 files changed, 294 insertions(+), 29 deletions(-)
```
