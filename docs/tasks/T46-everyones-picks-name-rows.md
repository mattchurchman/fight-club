# T46 — Everyone's picks: name rows, lock & first blood

**Tier:** B · **Effort:** high · **Size:** M · **Depends on:** T44
**USER ACTION REQUIRED:** none

## Goal
After lock, it's obvious who picked whom: each fight lists people by name under the fighter they took, with method,
stake, 🔒 for their Lock of the Night and 🩸 for their First Blood pick. Replaces the identical gray initials.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Everyone's picks (reveal, after lock)"
- `src/features/live/RevealGrid.tsx`, `src/features/live/PicksSection.tsx`
- Exports only: `src/features/live/reveal.ts`, `src/features/live/hooks.ts` (`EntryWithId`), `shared/types.ts` (`Entry`, `FirstBloodPick`)

## Files you may touch
`src/features/live/RevealGrid.tsx`, `src/features/live/PickerRow.tsx` (new), `src/features/live/pickers.ts` (new) + test,
`src/features/live/PicksSection.tsx`, `src/features/live/index.ts`

## Steps
1. Pure helper `pickers.ts`:
   `pickersFor(entries, bout, selfUid, firstBloodEnabled)` → `{ a: PickerInfo[]; b: PickerInfo[] }` where
   `PickerInfo = { uid, name, isSelf, method, stake, isLock, firstBlood: null | { sameAsWinner: boolean; surname: string } }`.
   Column = the side they picked to **win**. Sort: self first, then stake desc, then name. `firstBlood` only when
   `firstBloodEnabled` and `entry.firstBlood?.boutId === bout.id`. Tests: ordering, lock flag, first blood on the same
   side, on the other side (surname shown), disabled event, entry with no pick for this bout (excluded).
2. `PickerRow` (`info`, `compact?`, `onTap`): a button row, `min-h-11`. Name (`min-w-0 truncate`), then `🔒`
   (`aria-label="Lock of the night"`), then `🩸` plus surname when `!sameAsWinner` (`aria-label="First blood: {surname}"`),
   then, unless `compact`, `{method} · {stake}` right-aligned, `muted`, tabular. Self row inverted: `bg-text text-bg`.
   Others `bg-surface-2`. Radius 8.
3. `RevealGrid` per fight card: label line (same as T45: "Main event / …" in red-text for the main event), then
   `SURNAME n` left and `n SURNAME` right in display font, the split bar (A = `bg-text`, B = `bg-steel`, 2px gap), then a
   two-column grid of `PickerRow`s. Keep the contrarian line and `ReactionChips`. Remove the initials `PickerColumn`.
   Needs `selfUid` (from `useSession`) and `event.firstBloodEnabled` — pass them from `PicksSection`.
4. `PicksSection` heading becomes `<SectionLabel>Everyone's picks</SectionLabel>`.

## Acceptance criteria
- [ ] Definition of Done passes; `npm run build` passes.
- [ ] With 6 entries on the emulator (or the T49 simulator once it exists): every name appears exactly once per fight,
      under the right fighter, your row first and inverted; 🔒 and 🩸 show where expected.
- [ ] At 375px, a 12-character name truncates inside its row; columns stay equal width.

## Out of scope
By-person toggle and In the Cage (T47).

## Completion notes
_(agent fills in: ≤10 lines, ending with `git diff --stat`)_
