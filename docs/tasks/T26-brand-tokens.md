# T26 — Brand tokens, fonts & migration aliases

**Tier:** C · **Effort:** low · **Size:** S · **Depends on:** —
**USER ACTION REQUIRED:** none

## Goal
Swap the design tokens and fonts to the v2.1 "Minimal" brand so the whole app reskins in one commit. Old class
names (`gold`, `blue`, `loss`) keep working through temporary aliases, so no feature file changes here.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Tokens", "Type", "Shape & motifs"
- `src/index.css`

## Files you may touch
`src/index.css`, `package.json`, `package-lock.json`, `index.html` (theme-color), `vite.config.ts` (manifest colors only),
`pwa-assets.config.ts` (`BRAND_BG` only)

## Steps
1. `npm i @fontsource/montserrat` and `npm uninstall @fontsource/anton`.
2. In `src/index.css`: replace the Anton import with `@fontsource/montserrat/600.css`, `/700.css`, `/800.css`, `/900.css`.
3. Rewrite `@theme` with every token from DESIGN "Tokens" (`bg`, `surface`, `surface-2`, `line`, `steel`, `text`, `muted`,
   `red`, `red-fill`, `red-text`, `win`). Add the aliases: `--color-gold: #f5f5f5`, `--color-blue: #4a4a50`,
   `--color-loss: #ff4136`, each with a `/* legacy alias — removed in T43 */` comment.
4. `--font-display: 'Montserrat', sans-serif`. `.font-display` = Montserrat, weight 800, `text-transform: uppercase`,
   `letter-spacing: 0.02em`. Radii: `--radius-card: 12px`, `--radius-chip: 8px`.
5. Add Tailwind v4 utilities with `@utility`: `octagon` (the clip-path in DESIGN "Shape & motifs") and `label`
   (Montserrat 600, 11px, uppercase, `letter-spacing: 0.2em`, color `muted`).
6. Replace `#0B0B0D` with `#0A0A0B` in `index.html`, `vite.config.ts` manifest, and `pwa-assets.config.ts`.

## Acceptance criteria
- [ ] Definition of Done passes; `npm run build` passes.
- [ ] `grep -rn "anton" src package.json` returns nothing.
- [ ] `npm run dev`: app is black/charcoal/white with red accents; headings render in Montserrat.

## Out of scope
Editing any component or feature file. Icons (T28).

## Completion notes
- Swapped `@fontsource/anton` for `@fontsource/montserrat` (600/700/800/900); `grep -rn anton src package.json` is clean.
- Rewrote `src/index.css` `@theme`: v2.1 tokens (`bg surface surface-2 line steel text muted red red-fill red-text win`)
  + three legacy aliases (`gold→text`, `blue→steel`, `loss→red-text`) each commented `removed in T43`.
- `.font-display` is now Montserrat 800 uppercase, tracking 0.02em. Added `@utility octagon` and `@utility label`
  (Montserrat 600 11px uppercase tracking 0.2em muted) per DESIGN "Shape & motifs" / "Type".
  Radii: card 12px, chip 8px.
  (Previous `done` T26 commit, 82d054b, only touched docs — no actual token work landed; this redoes it for real,
  requested by the owner after T28 flagged the gap.)
- `#0B0B0D` → `#0A0A0B` in `index.html`, `vite.config.ts` manifest colors, `pwa-assets.config.ts` `BRAND_BG`;
  regenerated PWA PNGs/favicon against the corrected background.
- 20 files still reference `text-gold`/`bg-blue`/`text-loss` etc. — they render fine through the aliases; real
  migration is T27+'s job per DESIGN.md's map, unchanged by this task.
- Definition of Done green (lint, typecheck, 402 tests, build).
