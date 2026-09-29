# T11 — Design system, app shell & installable PWA

**Tier:** B · **Size:** L · **Depends on:** T01
**USER ACTION REQUIRED:** none

## Goal
The visual foundation: theme tokens, fonts, UI primitives, routed app shell with bottom tabs, and a PWA that installs
cleanly on iPhone. The screens are placeholders, but the whole app already looks and feels like the final product.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` (all)

## Files you may touch
`src/index.css`, `src/main.tsx`, `src/app/**`, `src/components/ui/**`, `src/pages/*Placeholder*.tsx`, `src/features/install/**`,
`public/**` (icons, manifest assets), `vite.config.ts` (PWA plugin), `index.html` (meta tags), `pwa-assets.config.ts`, `package.json`

## Steps
1. Theme: CSS variables from DESIGN.md mapped into Tailwind's theme. Load Anton and Inter via @fontsource. Set safe-area insets (`env(safe-area-inset-*)`).
2. Primitives in `src/components/ui/`: `Button` (primary/secondary/ghost/danger, loading state), `Card`, `Chip` (selectable),
   `Stepper`, `Avatar` (image + initials fallback + corner color ring), `Sheet` (bottom sheet), `Toast` (provider + `useToast`),
   `Skeleton`, `Countdown` (to a timestamp, pure formatting helper tested), `TokenPill`, `EmptyState`, `Tabs`.
   Keep each one small, with no external UI kits.
3. Router (`react-router-dom`): `/` (Fights), `/live`, `/standings`, `/wallet`, `/me`, `/admin/*`, `/install`, `/login`, `*` (404).
   Layout: header (title slot, TokenPill slot, admin gear slot) plus a bottom tab bar with icons (inline SVG, no icon library) and an active state.
4. A `/dev/ui` gallery page (dev builds only) that renders every primitive. It's used for visual QA by later tasks.
5. PWA: `vite-plugin-pwa` (generateSW, `registerType: 'autoUpdate'`, navigateFallback `index.html`), a manifest per DESIGN.md, and an
   original SVG icon in `public/icon.svg` → generate PNGs and the apple-touch-icon with `@vite-pwa/assets-generator`.
   iOS meta tags: `apple-mobile-web-app-capable`, status-bar style `black-translucent`, theme-color.
   Show an "Update available, tap to refresh" toast when a new SW is waiting.
6. `/install` page: iOS Safari instructions (Share → Add to Home Screen) and Android (install prompt via `beforeinstallprompt`).
7. Tests: Countdown formatting, Stepper bounds, Chip selection, and the router renders every route.

## Acceptance criteria
- [ ] `npm run build` produces a manifest and service worker. Lighthouse "installable" passes (run `npx lighthouse` on `npm run preview` if available; otherwise verify the manifest fields by hand)
- [ ] At 375px every screen has no horizontal scroll and the tab bar respects the safe area
- [ ] Definition of Done passes

## Out of scope
Data fetching, auth, real screens.

## Completion notes
_(agent fills in)_
