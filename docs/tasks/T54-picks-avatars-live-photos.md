# T54 — Avatars + first names in Everyone's picks; current photo everywhere

**Tier:** B · **Effort:** medium · **Size:** M · **Depends on:** T53
**USER ACTION REQUIRED:** none

## Goal
In Everyone's picks, players are shown as **octagon avatar + first name** instead of the full display name
(full names truncate badly on mobile). Applies to "By fight" rows, the "By person" grid and In the Cage (they
share `PickerRow`). Also: a photo changed on the Me tab shows up everywhere on event pages, not a stale copy.

## Background
- `Avatar` (`src/components/ui/Avatar.tsx`) already renders a photo or initials.
- Entries carry `photoURL` copied **at submit time**. The current photo lives on `users/{uid}.photoURL`;
  `useUsersById()` (`src/features/profile/hooks.ts`) gives it, and `buildLeaderboard(entries, usersById)`
  (`src/features/live/leaderboard.ts`) already prefers it. Known stale spots:
  `src/features/share/ShareButton.tsx` ~L39 and `src/features/live/LivePage.tsx` ~L62 call
  `buildLeaderboard(entries)` **without** `usersById`. Also `Avatar` keeps its `failed` flag when `src`
  changes, so a photo that once failed to load stays as initials.

## Context to load (only these)
- `AGENTS.md`
- `src/features/live/pickers.ts` (+ test), `PickerRow.tsx`, `RevealGrid.tsx`, `ByPersonGrid.tsx`,
  `PicksSection.tsx`, `InTheCage.tsx` (only where it renders `PickerRow`)
- `src/components/ui/Avatar.tsx`, `src/features/live/leaderboard.ts` (L25–45)
- `e2e/fitWidth.ts` (from T53)

## Files you may touch
`src/features/live/pickers.ts` (+ `pickers.test.ts`), `PickerRow.tsx`, `RevealGrid.tsx`, `ByPersonGrid.tsx`,
`PicksSection.tsx`, `InTheCage.tsx`, `LivePage.tsx`, `src/features/share/ShareButton.tsx`,
`src/components/ui/Avatar.tsx`, `e2e/happy-path.spec.ts`

## Steps
1. **Data.** Add `photoURL: string | null` and `firstName: string` to `PickerInfo` and `ByPersonRow`.
   `pickersFor` / `byPerson` take an optional `usersById` (same pattern as `buildLeaderboard`):
   `usersById[uid]?.photoURL ?? entry.photoURL`. `firstName` = first whitespace-separated word of
   `displayName`. Keep sorting by full name. Unit-test both fields. Callers pass `useUsersById().byId`.
2. **PickerRow.** Avatar (24px) + first name on one line; lock/first-blood markers stay. In the full (non-compact)
   row, put `method · stake` on a second smaller line under the name, so the name gets the full column width.
   Whole row stays one ≥44px button; `aria-label` keeps the **full** display name. Compact (In the Cage):
   avatar + first name, no second line.
3. **ByPersonGrid.** Sticky first column = avatar (28px) with first name beneath in `text-[10px]`, truncated,
   column ≤ 64px wide; self row keeps its inverted colours; button `aria-label` unchanged.
4. **PicksSection header.** Let the "Everyone's picks" label and the By fight/By person tabs wrap at 320px.
5. **Fresh photos.** Pass `usersById` in `ShareButton` and `LivePage`'s `buildLeaderboard` calls. In `Avatar`,
   reset `failed` when `src` changes. Then `grep -rn "entry.photoURL\|buildLeaderboard(" src` and fix any
   other avatar that reads only the entry copy.
6. **Width.** Extend T53's happy-path width audit to cover "By fight" and "By person" at 320 and 375.

## Acceptance criteria
- [ ] Definition of Done passes + `npm run build` + `npm run test:e2e`
- [ ] At 375px, a 10-character first name shows in full in a "By fight" row next to its avatar
- [ ] By fight, By person and In the Cage show avatar + first name; screen readers still get full names
- [ ] Changing your photo on Me updates leaderboard, picks, In the Cage, player sheet and share poster without a reload
- [ ] No horizontal overflow at 320/375 on either picks view

## Out of scope
Fighter headshots, the standings/leaderboard row layout (T53), data-model changes.

## Completion notes
- Added current profile photos and first names to both picker derivations, with unit coverage.
- Restyled By fight, By person and In the Cage rows with octagon avatars and compact first names.
- Kept full display names for sorting, player-sheet labels and accessible button names.
- Live rankings/share posters now prefer current user photos; Avatar retries whenever its URL changes.
- Added explicit 320/375px width checks for both picks views; lint, typecheck, 568 tests, build and e2e pass.
- `git diff --stat`: 13 files changed, 133 insertions(+), 44 deletions(-).
