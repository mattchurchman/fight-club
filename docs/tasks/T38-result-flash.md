# T38 — Result flash

**Tier:** B · **Effort:** medium · **Size:** S · **Depends on:** T37
**USER ACTION REQUIRED:** none

## Goal
When a result lands while someone has the Live tab open, show a short, bold overlay with the result and what it
did to them. This is the moment people react to on the couch.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Live tab" (Result flash bullet)
- Exports only: `src/features/live/derive.ts`, `src/features/live/hooks.ts`

## Files you may touch
`src/features/live/ResultFlash.tsx` (new), `src/features/live/useNewResults.ts` (new) + test,
`src/features/live/LivePage.tsx`

## Steps
1. `useNewResults(bouts)`: records the set of finished bout ids on first load (those never flash); returns the newest
   bout that became final afterwards, and a `dismiss()`. Test with a sequence of bout snapshots.
2. **ResultFlash**: fixed top overlay below the header, `surface` with 3px red top bar. Line 1 (display):
   `SOLDIĆ def. WILLIAMS`; line 2: `Dec · R3`; line 3: your delta (`+466 ✓` in `win` or `0 ✗` in `muted`) and rank move
   (`▲2 to #2`). Hidden for viewers without an entry except lines 1–2. `role="status"`, tap or 2.5s to dismiss.
   Slide-down 200ms; under reduced motion it just appears.
3. Mount in LivePage when revealed.

## Acceptance criteria
- [ ] Definition of Done passes; `npm run build` passes.
- [ ] Applying a result in the emulator while `/live` is open shows the flash once; reloading doesn't replay it.

## Out of scope
Vibration/sound, push notifications.

## Completion notes
_(agent fills in: ≤10 lines)_
