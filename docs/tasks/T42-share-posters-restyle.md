# T42 — Share posters restyle

**Tier:** B · **Effort:** medium · **Size:** S · **Depends on:** T29
**USER ACTION REQUIRED:** none

## Goal
The images people drop in the group chat carry the new brand: lockup, black, white type, one red bar.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Tokens", "Type", "Brand assets"
- `src/features/share/PicksPoster.tsx`, `src/features/share/ResultsPoster.tsx`

## Files you may touch
`src/features/share/**`

## Steps
1. Both posters (1080×1350): top = `Lockup` (~220px wide) instead of the gold `APP_NAME` text; event label + headline in
   display font; 24×3 → scale to 96×10 red bar under the headline.
2. ResultsPoster: medal emojis → rank numbers in display font; #1 row gets a 3px `text` outline (no gold); points white;
   "Call of the night" box: `surface` + red top bar.
3. PicksPoster: one row per fight, picked fighter surname in display font, method + stake in `muted`, 🔒 on the lock.
4. `html-to-image` must embed the `<img>` lockup: if it renders blank, inline the SVG markup instead (fetch
   `/brand/logo-lockup.svg` as text once). Make sure Montserrat is loaded before capture (`document.fonts.ready`).

## Acceptance criteria
- [ ] Definition of Done passes; `npm run build` passes.
- [ ] Share on the emulator: the downloaded PNG shows the lockup and Montserrat (not a fallback font).

## Out of scope
New poster types.

## Completion notes
_(agent fills in: ≤10 lines)_
