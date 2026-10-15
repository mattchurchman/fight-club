# T41 — Profiles everywhere

**Tier:** B · **Effort:** medium · **Size:** M · **Depends on:** T40
**USER ACTION REQUIRED:** none

## Goal
Every name or avatar leads to that person's profile, and the profile itself shows stats, badges, event history and
your head-to-head with them in the v2.1 style.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Archive & profiles" (Profiles bullet)
- `src/features/profile/ProfileBody.tsx`, `src/features/profile/ProfilePage.tsx`
- Exports only: `src/features/profile/hooks.ts`, `src/features/profile/h2h.ts`, `shared/badges.ts`

## Files you may touch
`src/features/profile/**`, `src/features/chat/ChatPanel.tsx` (name links only),
`src/features/standings/StandingsTable.tsx` (style only)

## Steps
1. `UserLink` (`uid` or `username`, children): resolves username via `useUsersById().byId` (profile hooks); renders a `Link` to `/u/:username`
   or plain text if unknown. Use it for names in ChatPanel. (Leaderboard → PlayerSheet → View profile already exists.)
2. ProfileBody: octagon avatar (96px), name in display font, `@username` in `label`, balance TokenPill only on your own
   profile. Sections with `SectionLabel`: **Head to head** (other people's profiles only, first: `You 4 – 3 Jake`),
   **This season** (points, events, wins, podiums; hide the sparkline when < 2 events), **Badges** (octagon tiles, earned in
   `text`, unearned `opacity-30` with the name still readable, tap shows the description in a toast),
   **Lifetime** stats grid, **Event history** (rows link to `/event/:id`; show rank, points, payout).
3. StandingsTable: rows restyled (rank, octagon avatar, name, pts, net tokens with `+`/`−` and no red/green except
   `win` for positive); keep the existing profile links.

## Acceptance criteria
- [ ] Definition of Done passes; `npm run build` passes.
- [ ] From Live → PlayerSheet → View profile, and from a chat name, you land on that profile; H2H vs you is on top.

## Out of scope
Profile photo upload and nicknames (deferred by the owner).

## Completion notes
_(agent fills in: ≤10 lines)_
