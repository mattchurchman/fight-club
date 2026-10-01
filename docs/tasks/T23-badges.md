# T23 — Badges

**Tier:** C · **Size:** S · **Depends on:** T09, T21
**USER ACTION REQUIRED:** none

## Goal
Players earn the badges in GAME_RULES §9 automatically at finalize, and they show on profiles and in the finalize toast.

## Context to load (only these)
- `AGENTS.md`
- `docs/GAME_RULES.md` → section 9
- Exports only: `shared/lifecycle/index.ts`, `shared/types.ts`, `src/features/profile/index.ts`

## Files you may touch
`shared/badges.ts` (+ test), `shared/lifecycle/finalize.ts` (one call to award badges), `src/features/profile/Badges*.tsx`

## Steps
1. `shared/badges.ts`: `computeBadges(userHistory, thisEvent) → string[]` (newly earned only), with a definition list for id, emoji, name and description.
   `lock-smith` needs the last 3 lock outcomes. Read them from `users/{uid}` extra fields (`lockStreak`), which finalize maintains. Document the added field in DATA_MODEL.md under users (this task is allowed to make that one addition).
2. Finalize writes `users.badges` (arrayUnion) and increments or resets `lockStreak`.
3. The profile badges row: earned badges in color, unearned ones greyed out, and a tap shows the description.
4. Tests: one per badge, including the lock streak reset.

## Acceptance criteria
- [ ] Badge tests pass. Finalizing the seed awards `champion` to the winner.
- [ ] Definition of Done passes

## Out of scope
Push notifications for badges.

## Completion notes
Implemented all 6 badges (champion, perfect-card, upset-artist, lock-smith, bleeder, busted) with automatic computation at event finalize. Lock-smith badge tracks consecutive lock wins via user.lockStreak field. Created BadgesRow component showing all badges (earned in color, unearned greyed out) with tap-to-reveal descriptions. Comprehensive test coverage validates each badge type and lock-streak reset logic. Integrated into finalize lifecycle with arrayUnion writes to Firestore.
