# T60 — Live tab before lock: "Who's in"

**Tier:** B · **Effort:** medium · **Size:** S · **Depends on:** T58
**USER ACTION REQUIRED:** none

## Goal
Before picks lock, the Live tab shows who has entered the upcoming card: `WHO'S IN · N` with octagon avatars and first
names, under the countdown, live-updating as people submit. Data comes from `events/{evt}/entrants` (T58). Spec:
`docs/DESIGN.md` `## Live tab`, the **Before lock** bullet.

## Context to load (only these)
- `AGENTS.md` (always)
- `docs/DESIGN.md` `## Live tab` (the "Before lock" bullet) and `## Components`
- `src/features/live/LivePage.tsx` lines 1–115 (the `!revealed` branch)
- `src/features/live/hooks.ts` (pattern for an `onSnapshot` hook)
- `src/features/live/PickerRow.tsx` and `src/features/live/pickers.ts` (grep `firstName`: reuse the same first-name rule)
- `src/components/ui/Avatar.tsx`, `src/components/ui/SectionLabel.tsx`, `src/components/ui/EmptyState.tsx`
- `shared/types.ts` (grep `interface Entrant`)

## Files you may touch
`src/features/live/WhosIn.tsx` (new), `src/features/live/WhosIn.test.tsx` (new), `src/features/live/hooks.ts`,
`src/features/live/LivePage.tsx`, `docs/tasks/T60-live-whos-in.md`, `docs/PROGRESS.md`

## Steps
1. `hooks.ts`: `useEntrants(eventId)` → `Entrant[] | undefined`, `onSnapshot` on `events/{id}/entrants`, sorted by
   `submittedAt` ascending (pending server timestamps sort last).
2. `WhosIn.tsx`: `SectionLabel` `WHO'S IN · N`; wrapping row of 40px octagon `Avatar`s with first names under them
   (truncate, 64px column, 44px+ tap target) linking to `/u/:username` the same way PickerRow does; the viewer's own
   avatar gets `ring-2 ring-text`. Empty state: `Nobody's in yet. Be first.` plus a `MAKE PICKS` link to the Fights
   tab when the viewer has no entry (use the viewer's own entry, which they can already read).
3. `LivePage.tsx` `!revealed` branch: render `WhosIn` between the countdown block and `FightCardList`. Skeleton while
   loading. Once revealed (locked/live/final), it isn't shown.
4. Tests: renders count and names in order; marks the viewer; empty state with and without the viewer's own entry.

## Acceptance criteria
- [ ] Definition of Done passes (AGENTS.md §4), plus `npm run build`
- [ ] Step 4 tests pass
- [ ] Manually with `npm run sim` (or the emulator seed) before lock: list shows, a new submit appears without reload,
      no horizontal scroll at 375px with 9 entrants

## Out of scope
Rules/data (T58). Showing who's in anywhere besides the pre-lock Live tab. Push notifications for new entrants.

## Completion notes
Added `useEntrants(eventId)` (`events/{id}/entrants`, sorted by `submittedAt` asc, pending timestamps last) and
`WhosIn` (new), wired into `LivePage`'s `!revealed` branch between the countdown and `FightCardList`, with a
skeleton while loading. Avatar+first-name grid links each entrant to `/u/:username` (viewer's own avatar gets
`ring-2 ring-text`); empty state shows `MAKE PICKS` → `/` only when the viewer isn't in `entrants` yet (which,
since an empty list means nobody has entered, is the only reachable case — noted for the reviewer).
Tests: count/order, self marker, profile link, empty-state link shown/hidden.

```
 docs/PROGRESS.md                  |  2 +-
 src/features/live/LivePage.tsx    |  9 ++++-
 src/features/live/WhosIn.test.tsx | 75 ++++++++++++++++++++++++++++++++++
 src/features/live/WhosIn.tsx      | 84 +++++++++++++++++++++++++++++++++++++++
 src/features/live/hooks.ts        | 27 ++++++++++++-
 5 files changed, 194 insertions(+), 3 deletions(-)
```
