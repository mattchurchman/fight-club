# T59 — Badge counter on profiles + solo-night display

**Tier:** B · **Effort:** medium · **Size:** M · **Depends on:** T56
**USER ACTION REQUIRED:** none

## Goal
Profiles show how many times each badge was earned with a small `×N` chip on the tile's corner, styled per
`docs/DESIGN.md` `## Archive & profiles` (badge counter). Earned badges sort first. A solo night (GAME_RULES §6.1:
final event with one paid entrant, entry `rank: null`) reads as `SOLO NIGHT · BUY-IN REFUNDED` in the archive, and its
final leaderboard shows `—` for rank instead of crowning a winner.

## Context to load (only these)
- `AGENTS.md` (always)
- `docs/DESIGN.md` `## Tokens`, `## Shape & motifs`, `## Archive & profiles`
- `docs/GAME_RULES.md` §6.1
- `src/features/profile/BadgesRow.tsx`, `src/features/profile/ProfileBody.tsx` lines 115–130
- `src/features/events/EventsArchivePage.tsx`, `src/features/events/hooks.ts` lines 135–200 (archive rows)
- `src/features/live/LiveLeaderboard.tsx` (grep `rank` / `payout`; final view only)
- `src/features/live/LivePage.tsx` (grep `ShareButton`)

## Files you may touch
`src/features/profile/BadgesRow.tsx`, `src/features/profile/BadgesRow.test.tsx` (new),
`src/features/profile/ProfileBody.tsx`, `src/features/events/EventsArchivePage.tsx`,
`src/features/events/EventsArchivePage.test.tsx`, `src/features/events/hooks.ts`,
`src/features/live/LiveLeaderboard.tsx`, `src/features/live/LiveLeaderboard.test.tsx`, `src/features/live/LivePage.tsx`,
`src/features/live/derive.ts` (only if the final rank comes from there), `docs/tasks/T59-badge-counter-solo-night-ui.md`,
`docs/PROGRESS.md`

## Steps
1. `BadgesRow` takes `counts: Record<string, number>` (from `user.badgeCounts`; when absent, derive `1` for each id in
   `user.badges`). Earned = count ≥ 1. Order: earned first, then locked, each in `BADGE_DEFINITIONS` order.
2. Count chip exactly as the DESIGN spec: absolutely positioned on the tile's top-right (the tile wrapper becomes
   `relative`), `×N` for N ≥ 2, `×99` cap, `bg-red-fill text-white font-display text-[11px]`, `h-[18px] min-w-[18px] px-1
   rounded-full ring-2 ring-bg`, `aria-hidden` (the button's `aria-label` carries "Champion, earned 3 times").
   Toast text gets ` · ×N` when N ≥ 2. Check it doesn't clip at 375px with six tiles wrapping.
3. `ProfileBody`: pass the counts.
4. Solo night in the archive: in `events/hooks.ts` mark a row `solo` when the event's `paidEntrants === 1`; the archive
   row shows `SOLO NIGHT · BUY-IN REFUNDED` (muted, same slot as the 🏆 winner line) and no "your rank".
5. Final leaderboard for a solo night: the single row shows `—` in the rank column and no payout coin; hide the share
   poster button for that event. Do not change live (pre-final) ranking.
6. Tests: BadgesRow renders `×3` for count 3, no chip for 1, `×99` for 150, earned-first order; archive shows the solo
   label; final leaderboard shows `—` for a `rank: null` entry.

## Acceptance criteria
- [ ] Definition of Done passes (AGENTS.md §4), plus `npm run build`
- [ ] Step 6 tests pass
- [ ] At 375px (simulator `npm run sim` or Playwright screenshot), the badge row with counts on 3 tiles has no overflow
      and the chip doesn't cover the emoji; attach the screenshot path in completion notes

## Out of scope
Changing what finalize writes (T56) or repairing data (T57). New badges or badge art. The Live "who's in" list (T60).

## Completion notes
_(agent fills in: ≤10 lines)_
