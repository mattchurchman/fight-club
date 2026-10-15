# T40 — Past events & final event view

**Tier:** B · **Effort:** medium · **Size:** M · **Depends on:** T37
**USER ACTION REQUIRED:** none

## Goal
Anyone can browse old events: an archive list, and a final-event page showing the final standings with payouts,
the results, and everyone's picks.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Archive & profiles" (Past events bullet)
- `src/features/events/EventPage.tsx`
- Exports only: `src/features/events/hooks.ts`, `src/features/live/index.ts`, `src/features/live/derive.ts`,
  `src/features/profile/hooks.ts` (the final-events query in `useEventHistory`)

## Files you may touch
`src/app/routes.tsx`, `src/app/AppShell.tsx` (title for `/events`), `src/features/events/EventsArchivePage.tsx` (new),
`src/features/events/hooks.ts`, `src/features/events/EventPage.tsx`, `src/features/events/EventSwitcher.tsx`,
`src/features/standings/StandingsPage.tsx`

## Steps
1. `usePastEvents(uid)`: final, enabled events, newest first (reuse the query shape in `useEventHistory`, so no new index).
   For each: winner(s) = `getDocs(query(entries, where('rank','==',1)))`; your rank = `getDoc(entries/uid)`. One-shot
   reads, cached in state; fine at this scale (note it in completion notes).
2. **EventsArchivePage** at `/events`: `SectionLabel` "Past events"; rows: event label + headline, date, `🏆 Tony`
   (or `Tony & Sam`), pot (TokenPill), `You #3` / `Didn't play`. Row → `/event/:id`. Empty state when none.
3. **EventPage, final event**: EventHeader → `LiveLeaderboard final` (payout column) → `ResultsList` → `PicksSection`
   (reveal grid). Reuse T37 components; no duplication.
4. Links: StandingsPage `SectionLabel` action `Past events →`; EventSwitcher gets a trailing `All events` chip → `/events`.

## Acceptance criteria
- [x] Definition of Done passes; `npm run build` passes.
- [x] `/events` lists the seeded final event with its winner; opening it shows standings + payouts, results and the reveal.

## Out of scope
Winner takeover screen and belt (deferred by the owner).

## Completion notes
- `usePastEvents(uid)` reuses `useEventHistory`'s query shape (`status == 'final'` + `orderBy startsAt desc`,
  no new index), then one-shot reads each event's rank-1 entries and the viewer's own entry.
- `EventsArchivePage` at `/events`; `EventPage` final branch reuses `LiveLeaderboard` (payout column),
  `ResultsList` and `PlayerSheet` from T37/T35 instead of the pick-deck locked view, plus `PicksSection`'s
  reveal grid already mounted below.
- `EventSwitcher` gets a trailing "All events" chip (only when there's at least one final event);
  `StandingsPage` gets a "Past events →" link next to a new "Standings" `SectionLabel`.
- Added `EventsArchivePage.test.tsx` (loading/empty/row content/tied winners/link href) since page-level
  hooks here hit Firestore directly and aren't otherwise unit-testable, matching how other pages in this
  app are untested beyond their presentational sub-components.
