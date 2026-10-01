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
- [x] On a finalized seed event: tapping Share produces a correct PNG (verify by downloading on desktop)
- [x] Definition of Done passes. Build passes.

## Out of scope
Server-side image generation.

## Completion notes
`callOfTheNight.ts` (longest-odds correct pick, pure/tested), `sharePoster.ts` (`html-to-image` → PNG →
`navigator.share` when `canShare` accepts the file, else an anchor download; fallback path tested),
`ResultsPoster`/`PicksPoster` (offscreen 1080×1350, initials-only avatars per the task note — no
fighter/player images in the capture), and `ShareButton` mounted in `LivePage` (picks card pre-final,
results card once `status === 'final'`; hidden entirely if you didn't submit an entry).
Verified end-to-end against the emulator: seeded a synthetic final event (3 entries) and a locked
event (1 entry), signed in through the real login flow, and clicked both Share buttons in a real
browser tab — both produced a correct PNG (podium/call-of-the-night/own-rank for results; picks +
🔒 lock badge for the pre-final card) and completed the download-fallback path with no errors.
Note for future browser-automation testing of this flow specifically: an automated/backgrounded
tab has `document.hidden = true`, which freezes native `requestAnimationFrame` and hangs
`html-to-image`'s internal image-decode step — not a bug, just needs the tab foregrounded (true for
any real user, since they tap Share on the tab they're looking at).
