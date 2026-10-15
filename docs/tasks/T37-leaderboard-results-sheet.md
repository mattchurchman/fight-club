# T37 — Leaderboard v2, results list & PlayerSheet

**Tier:** B · **Effort:** medium · **Size:** M · **Depends on:** T36
**USER ACTION REQUIRED:** none

## Goal
Make the leaderboard readable (labeled per-fight marks in fight order, rank movement, payouts at final), add a
results list of finished fights, and clean up the player sheet.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Live tab" (leaderboard + results + PlayerSheet bullets)
- `src/features/live/LiveLeaderboard.tsx`, `src/features/live/PlayerSheet.tsx`
- Exports only: `src/features/live/derive.ts`, `src/features/profile/hooks.ts` (`useUsersById`)

## Files you may touch
`src/features/live/LiveLeaderboard.tsx`, `src/features/live/PlayerSheet.tsx`, `src/features/live/ResultsList.tsx` (new),
`src/features/live/LivePage.tsx`, `src/features/live/LastResultBanner.tsx` (delete), `src/features/live/lastResult*.ts`
(delete if unused), `src/features/live/index.ts`

## Steps
1. **LiveLeaderboard** (`entries`, `bouts`, `moves`, `final`, `onTap`): `SectionLabel` "Standings". Header row: `F1 … F5`
   above the mark columns (fight order). Row: rank, move (`▲2` in `win`, `▼1` in `muted`, nothing at 0), octagon avatar,
   name, points (display font), marks: ✓ `win`, ✗ `muted`, `–` push, `·` pending — 16px, text glyphs not dots.
   Your row: 2px `text` outline. Final: extra payout column (`Coin` + amount, `—` for none). Keep the FLIP animation.
2. **ResultsList** (`feed` from `resultsFeed`): `SectionLabel` "Results". Rows: `SOLDIĆ def. WILLIAMS` (display), then
   `Dec · R3 · 4 of 6 had Soldić · you +466` in `muted` (your delta in `win` when > 0).
3. **PlayerSheet**: header = octagon avatar, name, total. Rows: pending fights show `Pending` (not `…`); scored rows keep
   the base/method/lock breakdown; ✓/✗ glyphs per DESIGN. Footer link `View profile` → `/u/<username>` (map uid →
   username with `useUsersById().byId`; hide the link if not found).
4. LivePage: leaderboard gets `moves` from `useRankMoves` and `final={event.status === 'final'}`; ResultsList after it.
   Delete `LastResultBanner` and its helpers if nothing else imports them.

## Acceptance criteria
- [ ] Definition of Done passes; `npm run build` passes.
- [ ] With 2 results applied: marks line up under `F1 F2`; ranks show movement after the second result; ResultsList
      shows two rows newest first; final event shows payouts.

## Out of scope
Result flash (T38). Profile page changes (T41).

## Completion notes
Leaderboard now reads fight order from `fightOrder()` (not `bouts` array order) for the F1…F5 header and
per-fight marks (✓ win / ✗ muted / – push / · pending, text glyphs). Rank-move glyphs added (▲ win / ▼ muted);
your row uses a `border-text`/`ring-text` outline (not gold — `--color-gold` is already aliased to `--color-text`
since T26). Final events add a payout column (`Coin` + amount, `—` for none) via a `payout` field threaded
through a local `LiveLeaderboardEntry` type — `leaderboard.ts` wasn't in this task's allowed files, so
`LeaderboardEntryLike` itself wasn't extended; real `EntryWithId` objects already carry `payout`. Added
`ResultsList` and wired it + leaderboard's `moves`/`final` props into `LivePage`. `PlayerSheet` now shows
"Pending" text instead of a `…` glyph, uses muted (not loss) for a wrong pick to match the mark legend, and
gets a `usernameByUid`-gated "View profile" link. Deleted `LastResultBanner`/`lastResult.ts` (unused — never
imported by `LivePage` since T36). Note: `MODEL_TIERS.md` effort was "medium"; this session ran at low effort.
Tier B (Sonnet) matched as required.
