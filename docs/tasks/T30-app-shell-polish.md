# T30 — App shell & polish pass

**Tier:** B · **Effort:** medium · **Size:** M · **Depends on:** T29
**USER ACTION REQUIRED:** none

## Goal
New header and tab bar, a tidier event header, and the small fixes the owner approved: no duplicated event title,
a real status pill, an urgent countdown, Sign out moved to the bottom of Me, and the push-notification toggle wired in.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "App shell", "Event header"
- `src/app/Header.tsx`, `src/app/AppShell.tsx`, `src/app/TabBar.tsx`, `src/features/events/EventHeader.tsx`
- Exports only: `src/components/brand/index.ts`, `src/components/ui/SectionLabel.tsx`, `src/components/ui/StatusPill.tsx`

## Files you may touch
`src/app/Header.tsx`, `src/app/AppShell.tsx`, `src/app/TabBar.tsx`, `src/app/icons.tsx`,
`src/features/events/EventHeader.tsx`, `src/features/events/EventSwitcher.tsx`, `src/features/events/format.ts`,
`src/features/auth/MePage.tsx`, `src/features/profile/MyProfilePage.tsx`

## Steps
1. **Header**: left = `<Mark/>` (28px, links to `/`) + section name in `label` style; right unchanged (TokenPill, help,
   admin). Height 56px + safe area. `AppShell.titleFor` stays as the section-name source.
2. **TabBar**: inactive `muted`, active `text` + 3px red bar on the tab's top edge. `aria-current` stays (NavLink).
3. **EventHeader**: label line `UFC 332` (the part of `name` before `:`), headline = `subtitle` in display font
   (fallback: `name`), so the name never shows twice. Date · venue in `muted`. `<StatusPill status>` replaces the old
   chip. Countdown uses `urgentBelowMs`. Buy-in/Pot use TokenPill.
4. **EventSwitcher**: chips per DESIGN (radius 8, selected inverted).
5. **Me**: move `Sign out` to the very bottom as a `secondary` button. Add `<NotificationsSection uid={user.uid} />`
   above it (from `src/features/notifications`; see PROGRESS backlog T24). Section headings use `SectionLabel`.
6. Remove the matching items from the PROGRESS.md Backlog (T24 NotificationsSection line) — this task fixes them.

## Acceptance criteria
- [ ] Definition of Done passes; `npm run build` passes.
- [ ] At 375px: header shows mark + section label; event name appears once; under 1h to lock the countdown is red with seconds.
- [ ] Me page: notifications toggle visible; Sign out is last.

## Out of scope
Pick UI (T31–T33), Live tab (T35–T38), profile body restyle (T41).

## Completion notes
_(agent fills in: ≤10 lines)_
