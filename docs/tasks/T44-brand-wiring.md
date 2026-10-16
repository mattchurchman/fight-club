# T44 — Brand wiring: app icon, tab icon, header lockup

**Tier:** C · **Effort:** low · **Size:** S · **Depends on:** —
**USER ACTION REQUIRED:** after deploy, delete and re-add the home-screen app on one iPhone to see the new icon
(iOS caches icons).

## Goal
Use the traced logo everywhere it belongs. The SVGs, PWA PNGs and `favicon.ico` are already generated and committed
(planning commit); this task only points the code at them.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Brand assets", "App shell"
- `src/components/brand/Brand.tsx`, `src/app/Header.tsx`, `index.html`

## Files you may touch
`src/components/brand/Brand.tsx`, `src/components/brand/index.ts`, `src/app/Header.tsx`, `index.html`

## Steps
1. `index.html`: change the SVG icon link to `<link rel="icon" href="/brand/favicon.svg" type="image/svg+xml" />`.
   Keep the `favicon.ico` and apple-touch links as they are.
2. `Header.tsx`: replace `<Mark className="size-7" />` with `<Lockup className="h-8 w-auto" />` (keep the link to `/`
   and its accessible name "Fight Club home"). Check the section label still sits beside it at 375px.
3. `Brand.tsx`: delete the `Mark` component and its export (grep first: `grep -rn "Mark" src` must show no other user).
   `Lockup` keeps `alt="Fight Club"`.

## Acceptance criteria
- [ ] Definition of Done passes; `npm run build` passes.
- [ ] At 375px the header shows the octagon lockup (32px tall), section label, token pill, help and admin icons on one row.
- [ ] The browser tab shows the FC tile icon.

## Out of scope
Regenerating icons (already done). Any other screen.

## Completion notes
_(agent fills in: ≤10 lines, ending with `git diff --stat`)_
