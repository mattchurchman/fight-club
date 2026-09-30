# T15 — Pick reveal & live leaderboard

**Tier:** B · **Size:** M · **Depends on:** T09, T14
**USER ACTION REQUIRED:** none

## Goal
Once picks lock, everyone sees everyone's picks side by side, and during the event the Live tab shows a real-time
leaderboard that updates as results land. This is the core bragging-rights moment.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "RevealGrid", "LiveLeaderboard", "Voice"
- `docs/DATA_MODEL.md` → entries (score fields), bouts.result
- Exports only: `src/features/events/index.ts`, `src/components/ui/index.ts`, `shared/scoring.ts`

## Files you may touch
`src/features/live/**`, `src/app/routes` (Live tab), `src/features/events/EventPage*.tsx` (add a "Picks" section after lock)

## Steps
1. `useEntries(eventId)`: `onSnapshot` on the entries subcollection. It's only subscribed when status ∈ locked|live|final (the rules deny it earlier).
2. `RevealGrid`: per bout, avatars of players on the red or blue side. Tap an avatar to see that player's method/stake/lock. It also shows
   a "consensus %" bar and highlights contrarian picks ("Only Matt took the dog").
3. `LiveLeaderboard` (Live tab): rank, avatar, name, points, and the per-bout mini-results (✓/✗ dots). An animated reorder on change
   (FLIP with CSS transforms; honor `prefers-reduced-motion`). Your own row is pinned and highlighted.
   Before lock: "Picks lock in …" plus who has submitted (names only, not picks).
4. A player detail sheet: their full card with per-bout scoring breakdown (base / method / lock / first blood).
5. The live "last result" banner: "Pereira def. Ankalaev — KO R2 4:12" appears when a bout goes final.
6. Tests: consensus calc, contrarian detection, and leaderboard ordering with shared ranks.

## Acceptance criteria
- [ ] On the seed plus a lifecycle run with `--now` past the lock: the reveal renders all 4 players. When results are applied, the leaderboard reorders without a reload.
- [ ] Definition of Done passes. Build passes.

## Out of scope
The share image (T22), comments (T25).

## Completion notes
Built `src/features/live/`: `hooks.ts` (`useEntries`, gated on `isRevealed`), pure `reveal.ts`
(consensus/contrarian/pick-outcome), `leaderboard.ts` (wraps `shared/scoring.ts#rankEntries`),
`lastResult.ts`, and the components (`RevealGrid` + `PlayerSheet` mounted via `PicksSection` on
`EventPage`; `LiveLeaderboard` + `LastResultBanner` on the new `/live` route). FLIP reorder is a
plain `useLayoutEffect` transform, skipped under `prefers-reduced-motion`. Own row is `sticky
top-0` plus a gold ring rather than being moved to the top.

Verified end-to-end against the Firestore emulator (seed + a throwaway script to create 4 entries
and finalize a bout): reveal renders all 4 players with correct consensus/contrarian, the player
sheet's score breakdown matches `shared/scoring.ts`, and finalizing a second bout live re-ranked
the leaderboard and updated the last-result banner with no page reload.

Follow-up (couldn't be done as specified): T15 step 3 asks for "who has submitted" (names only)
before lock, but `firestore.rules`' `entriesRevealed` denies reading anyone else's entry before
`locked` — there's no data source for this pre-lock. Left the pre-lock Live tab as just a
countdown; logged in Backlog below.
