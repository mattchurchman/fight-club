# T28 — Logo, PWA icons & brand components

**Tier:** B · **Effort:** medium · **Size:** S · **Depends on:** T26
**USER ACTION REQUIRED:** after deploy, delete and re-add the home-screen app on one iPhone to confirm the new icon
(iOS caches icons).

## Goal
Put the octagon logo everywhere the old gold "F" lived: PWA icons, favicon, login, and small brand components the
rest of v2.1 uses (`Mark`, `Lockup`, `Coin`).

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Brand assets" (the usage table), "PWA"
- `pwa-assets.config.ts`, `src/features/auth/LoginPage.tsx` (top 40 lines)

## Files you may touch
`public/icon.svg`, `public/*.png`, `public/favicon.ico`, `pwa-assets.config.ts`, `index.html`,
`src/components/brand/**` (new), `src/features/auth/LoginPage.tsx`,
`src/features/auth/NotInvitedPage.tsx`

## Steps
1. Copy `public/brand/icon-source.svg` over `public/icon.svg`. Run `npm run generate-pwa-assets`; commit the regenerated
   PNGs and favicon. Keep `padding: 0` in the config (the source already has its safe zone).
2. `src/components/brand/Brand.tsx` exports:
   - `Lockup({ className })` → `<img src="/brand/logo-lockup.svg" alt="Fight Club">`
   - `Mark({ className })` → `<img src="/brand/mark.svg" alt="Fight Club home">`
   - `Coin({ className })` → inline SVG built from `public/brand/coin.svg` (two `<polygon>`s, `currentColor`,
     `aria-hidden`). Inline so it inherits text color.
   - `index.ts` re-export.
3. LoginPage: replace the text title with `<Lockup className="w-40 mx-auto" />` above the tagline. Tagline in `label`
   style: `Invite only`. NotInvitedPage: same lockup, smaller.
4. Favicon: in `index.html` point the SVG icon link at `/brand/mark.svg` (the lockup is unreadable at 16–32px); keep
   `favicon.ico` as the fallback. Push notifications already use `/pwa-192x192.png` as their icon, so they pick up
   the new app icon automatically once step 1 regenerates it — no change needed.
5. Check the hosting CSP in `firebase.json` allows `img-src 'self'` (it does) — no change expected.

## Acceptance criteria
- [ ] Definition of Done passes; `npm run build` passes.
- [ ] `public/apple-touch-icon-180x180.png` and `maskable-icon-512x512.png` show the white octagon lockup on near-black.
- [ ] `/login` shows the lockup.

## Out of scope
Header (T30), TokenPill (T29), posters (T42).

## Completion notes
- Copied `icon-source.svg` → `icon.svg`, regenerated PWA PNGs/favicon via `npm run generate-pwa-assets` (config already had
  `padding: 0` + brand bg from a prior ad-hoc fix, so no white border).
- Added `src/components/brand/{Brand.tsx,index.ts}` exporting `Lockup`, `Mark`, `Coin` (inline, `currentColor`).
- LoginPage: swapped the text title for `<Lockup className="w-40 mx-auto" />` + a label-style tagline (no `SectionLabel`
  component exists yet — that's T29 — so I used the codebase's existing ad hoc label pattern
  `text-xs font-medium uppercase tracking-wide text-muted`).
- NotInvitedPage: same lockup, `w-28`, above the EmptyState.
- Favicon in `index.html` now points at `/brand/mark.svg`; `favicon.ico` fallback kept. CSP `img-src 'self'` already covers it.
- **Found while loading context, not part of this task's files:** T26 (marked `done`) only touched `docs/` — no
  token/font work landed in `src/index.css` (still Anton/Inter, no `steel`/`red-fill`/`red-text`/Montserrat). T27
  (also `done`) then renamed classes in 6 files to those non-existent tokens, so `text-steel`/`bg-red-fill`/etc.
  are currently no-ops (unknown Tailwind utilities, not caught by lint/typecheck). Flagged to the user; not fixed
  here (`src/index.css` isn't in T28's allowed files). See PROGRESS.md backlog.
