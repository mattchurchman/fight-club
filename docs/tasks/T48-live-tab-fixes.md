# T48 — Live tab fixes: "you", clipping, Trash Talk overlap

**Tier:** B · **Effort:** medium · **Size:** S · **Depends on:** T47
**USER ACTION REQUIRED:** none

## Goal
Fix three things found by running a simulated fight night: the swing line names you in the third person, the final
leaderboard's payout column is cut off, and the floating Trash Talk button covers the last rows.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Live tab" (the three bullets under the wireframe starting "Swing lines speak to the viewer")
- `src/features/live/InTheCage.tsx` lines 1–35 (`swingClause`), `src/features/live/LiveLeaderboard.tsx` lines 70–170,
  `src/features/live/LivePage.tsx` lines 90–160

## Files you may touch
`src/features/live/InTheCage.tsx`, `src/features/live/LiveLeaderboard.tsx`, `src/features/live/LivePage.tsx`,
`src/features/events/EventPage.tsx` (Trash Talk padding only), new `*.test.ts(x)` in `src/features/live/`

## Steps
1. `swingClause(line, selfUid)`: when `line.newLeader.uid === selfUid`, write `you take 1st` and don't repeat your rank
   (`If Green wins: you take 1st (+390)`). Export it and unit test: self leader, other leader, no leader, spectator.
2. `LiveLeaderboard` row at 375px with 6-character names and a 3-digit payout: name `min-w-0 flex-1 truncate`, points
   and marks `shrink-0`, payout column fixed `w-14 text-right shrink-0`. Nothing may overflow the card
   (check with the final state: rank, move, avatar, name, points, 5 marks, payout).
3. Trash Talk: wherever the button is fixed above the tab bar (LivePage, and EventPage if it floats there), add
   bottom padding to the scrolling content equal to the button height + 16px (e.g. `pb-24`) so the last row is reachable
   and never covered.

## Acceptance criteria
- [ ] Definition of Done passes; `npm run build` passes.
- [ ] Final leaderboard at 375px shows the payout column fully; scrolled to the bottom, the last row sits above the button.

## Out of scope
Anything else on Live.

## Completion notes
- `swingClause` now takes `selfUid`, exported, and says `you take 1st (+N)` without repeating your rank
  when `line.newLeader.uid === selfUid`; added 5 unit tests (self leader, other leader, no leader, two
  spectator cases).
- `LiveLeaderboard`'s payout column (row + header spacer) is now `w-14` instead of `w-16` to stop it
  being pushed off-card at 375px; name/points/marks were already `min-w-0 flex-1 truncate` / `shrink-0`.
- `LivePage`'s two scroll containers (pre-lock and revealed) changed `pb-4` → `pb-24` so the floating
  Trash Talk button (44px + safe-area) never covers the last leaderboard row. `EventPage`'s Trash Talk
  button isn't floating there, so it needed no change (out of scope per task).
- `npm run lint && npm run typecheck && npm test && npm run build` all pass (541 tests).

```
 docs/PROGRESS.md                      |  2 +-
 src/features/live/InTheCage.test.tsx  | 39 ++++++++++++++++++++++++++++++++++-
 src/features/live/InTheCage.tsx       | 16 +++++++++-----
 src/features/live/LiveLeaderboard.tsx |  4 ++--
 src/features/live/LivePage.tsx        |  4 ++--
 5 files changed, 54 insertions(+), 11 deletions(-)
```
