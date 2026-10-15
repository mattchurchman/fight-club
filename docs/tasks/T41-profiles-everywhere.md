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
- [x] Definition of Done passes; `npm run build` passes.
- [x] From Live → PlayerSheet → View profile, and from a chat name, you land on that profile; H2H vs you is on top.

## Out of scope
Profile photo upload and nicknames (deferred by the owner).

## Completion notes
Added `UserLink` (profile/UserLink.tsx) and wired it into ChatPanel sender names/avatars. Reordered
ProfileBody to H2H (first, others' profiles only) → This season (new `seasonStats.ts` pure helper,
sparkline hidden under 2 events) → Badges → Lifetime → Event history; avatar bumped to 96px, header
now uses `SectionLabel`/`label`. BadgesRow restyled as octagon tiles (earned in `text`, unearned
`opacity-30`) and now shows the description via `useToast` instead of an inline popover card.
StandingsTable: net tokens now color only when positive (`text-win`), never red, per spec.
"Balance TokenPill only on your own profile" is already satisfied by `MePage.tsx` (out of scope —
not in T41's allowed files), which renders ahead of `ProfileBody` on `/me`; no change needed there.
Lint, typecheck, tests (520 passed, incl. new `seasonStats.test.ts`) and build all green.
