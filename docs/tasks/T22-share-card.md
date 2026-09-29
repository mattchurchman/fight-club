# T22 — Shareable results card (for the group chat)

**Tier:** B · **Size:** S · **Depends on:** T15
**USER ACTION REQUIRED:** none

## Goal
One tap produces a poster-style image of an event's results (podium, your line, best call of the night) and opens the
phone's share sheet. This is bragging rights, delivered.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → tokens, type, "Voice"
- Exports only: `src/features/live/index.ts`, `src/components/ui/index.ts`

## Files you may touch
`src/features/share/**`, `src/features/live/*` (add the Share button only), `package.json` (add `html-to-image`)

## Steps
1. `ResultsPoster` component rendered offscreen at 1080×1350 (4:5): event name, a podium with avatars and points, the "Call of the night"
   (the correct pick with the longest odds, player + fighter + odds), and your own rank line. Use the Anton headings and corner colors.
   Avatars: remote headshots may be blocked by CORS in canvas. Use initials avatars for players and a fighter-name text for fighters, not fighter images.
2. `sharePoster()`: convert with `html-to-image` → a PNG blob → `navigator.share({ files })` when `canShare`, else download.
3. Also a "Share my picks" variant after lock (your card with 🔒).
4. Tests: the "call of the night" selector and the share fallback path.

## Acceptance criteria
- [ ] On a finalized seed event: tapping Share produces a correct PNG (verify by downloading on desktop)
- [ ] Definition of Done passes. Build passes.

## Out of scope
Server-side image generation.

## Completion notes
_(agent fills in)_
