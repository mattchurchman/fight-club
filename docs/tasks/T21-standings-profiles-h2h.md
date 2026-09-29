# T21 — Season standings, profiles & head-to-head

**Tier:** B · **Size:** M · **Depends on:** T09, T15
**USER ACTION REQUIRED:** none

## Goal
The long-term bragging layer: a season table, a profile page per player with history and stats, and head-to-head records
against each friend ("You're 7–3 vs. Dave").

## Context to load (only these)
- `AGENTS.md`
- `docs/GAME_RULES.md` → section 8
- `docs/DATA_MODEL.md` → seasons/standings, h2h, users.stats, entries
- Exports only: `shared/standings.ts`, `src/components/ui/index.ts`

## Files you may touch
`src/features/standings/**`, `src/features/profile/**`, `src/app/routes` (Standings tab, `/u/:username`, `/me`), `jobs/backfill-standings.ts`

## Steps
1. Standings tab: a season selector (default is the current season) and a table (rank, player, points, events, wins, podiums, net tokens).
   Tap a row → profile.
2. Profile `/u/:username` (and `/me`): avatar, badges row (placeholder until T23), lifetime stats, a season sparkline of points per event
   (a simple inline SVG, no chart library), event history (event, rank, points, payout), and an H2H list vs every other player
   (from `h2h` docs, sorted by games).
3. On someone else's profile: a big "You vs Them" H2H card at the top.
4. `jobs/backfill-standings.ts`: recomputes all standings and h2h docs from final events with `shared/standings.ts` (`--dry-run` default).
   It's for recovery or rule changes.
5. Tests: the sparkline path generator and the H2H summary text.

## Acceptance criteria
- [ ] After finalizing the seed event: standings show 4 players, profiles show history, and H2H records are consistent (a's wins = b's losses)
- [ ] Definition of Done passes. Build passes.

## Out of scope
Badge computation (T23).

## Completion notes
_(agent fills in)_
