# T13 — Fights tab: event page & bout cards (read-only)

**Tier:** B · **Size:** M · **Depends on:** T07, T11, T12
**USER ACTION REQUIRED:** none

## Goal
The Fights tab shows the next enabled event (and lets you swipe or select to other upcoming and recent ones) with a
great-looking main card: headshots, records, odds, main-event ribbon, status and a lock countdown.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Layout", "Key components: BoutCard"
- `docs/DATA_MODEL.md` → events, bouts
- `src/components/ui/index.ts`, `src/lib/firebase.ts`, `shared/odds.ts` (exports)

## Files you may touch
`src/features/events/**`, `src/app/routes` (wire the Fights tab and `/event/:id`)

## Steps
1. Data hooks: `useEvents({ upcoming, recent })` and `useEvent(id)` + `useBouts(eventId)` with `onSnapshot`. Only enabled events are shown to players.
   Pick the default event: the soonest `open`/`locked`/`live` one, else the most recent `final`.
2. `EventHeader`: name (Anton), subtitle, date and time in the user's local timezone, status chip, `Countdown` to `lockAt`, buy-in and pot (after lock).
3. `BoutCard` in **display mode** (T14 adds pick mode): red and blue halves, `Avatar` headshot with fallback, name, record,
   odds (`formatAmerican`, plus the implied % in small text), weight class, rounds, and bout status/result once available
   (winner highlighted, method/round/time).
4. Event switcher: a horizontal chip list of upcoming and recent events.
5. Empty and loading states (skeletons). Handle an event with 0 bouts ("Card not announced yet").
6. Tests: the default-event selection function, BoutCard rendering (odds formatting, result state), and fallback avatar.

## Acceptance criteria
- [ ] With the seed: the Fights tab renders 5 bouts correctly at 375px. The main event is first and has its ribbon.
- [ ] Definition of Done passes. Build passes.

## Out of scope
Making picks (T14), other users' picks (T15).

## Completion notes
_(agent fills in)_
