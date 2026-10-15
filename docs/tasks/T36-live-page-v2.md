# T36 — Live page v2: status strip, In the Cage, your row

**Tier:** B · **Effort:** medium · **Size:** M · **Depends on:** T35
**USER ACTION REQUIRED:** none

## Goal
Rebuild the top of the Live tab so anyone can read it at a glance: where the night is, which fight is on and what it
means for them, and their own standing — before the full leaderboard.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Live tab"
- `src/features/live/LivePage.tsx`
- Exports only: `src/features/live/derive.ts`, `src/features/live/hooks.ts`, `src/components/ui/StatusPill.tsx`,
  `src/features/events/FightCardList.tsx`

## Files you may touch
`src/features/live/LivePage.tsx`, `src/features/live/StatusStrip.tsx` (new), `src/features/live/InTheCage.tsx` (new),
`src/features/live/YourRow.tsx` (new)

## Steps
1. **StatusStrip**: `<StatusPill>` · `Fight 3 of 5` (from fight order + finished count) · `Pot <TokenPill>`.
   Final: `Final · Pot paid`.
2. **InTheCage** (`bout`, `entries`, `swing`): heading `Up next` until any result exists, then `In the cage`. Fighters
   side by side (octagon headshots, surname, odds). Under each, avatars of who picked that side (🔒 on locks; tap opens
   the PlayerSheet via the existing `onTap`). Up to two swing lines from `swingLines`, your line first:
   `If Green wins: you → 3rd (+160)`; if `newLeader`: `Tony takes 1st`. Prefix "at least" in `muted` small text once.
   Hidden when there is no current bout.
3. **YourRow**: `You · #4 · 470 pts · ▲1` — sticky under the status strip; hidden if the viewer has no entry.
4. **LivePage** composition (revealed): StatusStrip → InTheCage → YourRow → existing `LiveLeaderboard` (T37 replaces)
   → Share button. Pre-lock: `Picks lock in` countdown (keep this exact text; e2e) + `FightCardList readOnly` without picks.
   Keep the Trash Talk button and ChatPanel wiring as-is (T39 restyles).
5. Remove `LastResultBanner` usage (T37 adds the results list; T38 the flash). Keep the file until T37.

## Acceptance criteria
- [ ] Definition of Done passes; `npm run build` passes.
- [ ] Emulator seed + lifecycle `--now` after lock + one result: strip shows `Fight 2 of 5`, In the cage shows fight 2
      with avatars and swing lines; your row shows rank and movement.

## Out of scope
Leaderboard/results/PlayerSheet (T37), flash (T38), chat (T39).

## Completion notes
_(agent fills in: ≤10 lines)_
