# T29 — UI kit restyle

**Tier:** B · **Effort:** medium · **Size:** M · **Depends on:** T28
**USER ACTION REQUIRED:** none

## Goal
Restyle the shared UI kit to v2.1 and add the two new primitives (`SectionLabel`, `StatusPill`) so feature tasks
only compose, never style from scratch.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Tokens", "Type", "Shape & motifs", "Components"
- `src/components/ui/*.tsx` (each is small; open one at a time as you edit it)

## Files you may touch
`src/components/ui/**`, `src/app/dev/UiGallery.tsx`

## Steps
1. **Button**: variants per DESIGN (primary = `bg-red-fill`, white, `font-display` 700-weight look via classes,
   `rounded-[10px]`, `h-12`; secondary; ghost). Disabled = `bg-steel text-muted`, never red. Keep the `loading` prop.
2. **Chip**: radius 8, `border-line`; selected = `bg-text text-bg`. Keep props and the Chip test passing.
3. **TokenPill**: `<Coin/>` + white tabular number, `surface-2` background. No gold.
4. **Avatar**: `octagon` clip on the image and the initials fallback (`surface-2`, display font). Make `corner` optional
   and ignored, with `/** @deprecated v2.1 — removed in T43 */`. Callers stay untouched.
5. **Card**, **Sheet** (top grabber, 16px top radius), **Tabs** (active = `text` + 3px red bar), **Toast**, **Skeleton**,
   **EmptyState** (title in display font): tokens only.
6. **Countdown**: new optional prop `urgentBelowMs` (default 1h). Below it: `text-red-text` and `mm:ss` / `h:mm:ss` with
   seconds ticking. Extend `Countdown.test.tsx` for both sides of the threshold.
7. New **SectionLabel** (`children`, optional `action` node on the right): `label` utility text + 24×3 red bar under it.
8. New **StatusPill** (`status: EventStatus`): the five variants in DESIGN "Components". Copy authored in sentence case
   (`Picks open`, `Locked`, `Live`, `Final`, `Cancelled`), uppercased by CSS. Pulsing dot on Live (static under
   reduced motion). Add a small test for the label mapping.
9. Add the new pieces to `UiGallery`.

## Acceptance criteria
- [x] Definition of Done passes; `npm run build` passes.
- [x] `grep -rnE "gold|blue|loss" src/components/ui` returns nothing.
- [x] `/dev/ui` shows every component in the new style.

## Out of scope
Feature screens. Removing the `corner` prop (T43).

## Completion notes
Restyled Button/Chip/TokenPill/Avatar/Card/Sheet/Tabs/Toast to v2.1 tokens; added `SectionLabel` and `StatusPill`.
Button/StatusPill use `[font-family:var(--font-display)]` + explicit weight/tracking utilities instead of the
`.font-display` class, since that class is hard-pinned to 800/uppercase/0.02em and would fight Tailwind's cascade
layers. Avatar's `corner` prop is now untyped `string` (was a `'red'|'blue'|'none'` union) so the deprecated,
ignored prop doesn't reintroduce "blue" into `src/components/ui` — callers passing those literals still type-check.
`StatusPill` covers all six `EventStatus` values; `scheduled` (not in DESIGN's 5) reuses the `open` ("Picks open")
white-outline style with its own "Scheduled" label, matching existing `EVENT_STATUS_LABEL` usage.
Sheet gained a top grabber + 16px top radius (override of the shared 12px card radius).
Countdown gained `urgentBelowMs` (default 1h) switching to mm:ss/h:mm:ss in `red-text`.
Added StatusPill.test.tsx and extended Chip/Countdown coverage. All DoD checks + build green.
