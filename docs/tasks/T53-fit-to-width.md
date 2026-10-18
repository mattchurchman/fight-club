# T53 — Fit-to-width: final leaderboard fix + overflow check on every screen

**Tier:** B · **Effort:** medium · **Size:** M · **Depends on:** T52
**USER ACTION REQUIRED:** none

## Goal
No screen is ever wider than the phone. Today the finished-event view (`/event/:id` with status `final`) is
wider than a 375px iPhone, so iOS zooms out and the payout tokens on the far right get cut off. Fix it
**without dropping any data**, and add an automated width check across the app's screens so this can't
quietly regress.

## Root cause (already diagnosed)
`src/features/live/LiveLeaderboard.tsx` (row ~L95–150, header ~L82–97). Each row puts these side by side at
fixed widths with `gap-3`: rank (24) · move arrow (24) · avatar (36) · name (flex) · points (56) · one 16px
dot per main-card fight + gaps · payout (56, final only), inside `p-3` and the list's `px-4`. With 5–6 main-card
fights that's ~440px — the name shrinks to 0 and the row still overflows.
The "move" column is the ▲/▼ rank-change number. In the final view `moves` is always `{}` (`EventPage`
passes `moves={}`), so that column is empty there — hiding it in final mode removes no information.

## Context to load (only these)
- `AGENTS.md`
- `src/features/live/LiveLeaderboard.tsx`, `src/features/live/ResultsList.tsx`
- `src/features/events/EventPage.tsx` (final branch only, ~L95–110)
- `src/app/AppShell.tsx`
- `e2e/happy-path.spec.ts` (skim for where the event is final and which routes it already visits), `playwright.config.ts`

## Files you may touch
`src/features/live/LiveLeaderboard.tsx` (+ its test), `src/features/live/ResultsList.tsx`,
`src/app/AppShell.tsx`, `e2e/happy-path.spec.ts`, `e2e/fitWidth.ts` (new helper)

## Steps
1. **Leaderboard row (final + live).** Keep every value. Required: hide the move cell and its header
   spacer when `final`; `gap-3` → `gap-2`. Then choose whichever reads best at 320px:
   (a) move the per-fight dots to a second line beneath the name, or (b) shrink the avatar to 28–32px and
   the points/payout columns to content width. Payout must be fully visible; only the name may truncate.
   Live mode (with moves) must also fit at 375px.
2. **Width helper.** `e2e/fitWidth.ts` exporting
   `expectFitsWidth(page)` → asserts `document.documentElement.scrollWidth <= window.innerWidth`
   (report the widest offending element's tag/class in the failure message to make fixes cheap).
3. **Audit in the existing happy path** (no new seed — reuse its state). Once the event is final, for widths
   320, 375 and 430 (`page.setViewportSize`), visit and check: `/`, the final `/event/:id`, `/live`,
   `/standings`, `/events`, `/wallet`, `/me`, a `/u/:username`. Also check `/event/:id` with "By person"
   selected.
4. **Fix what the audit finds** if it's inside your allowed files. Anything outside → don't fix; list file +
   element in completion notes as follow-ups (T54 already owns `PickerRow`, `ByPersonGrid`, `PicksSection`).
5. **Safety net last:** add `overflow-x-clip` (not `hidden`, which breaks `sticky`) on `<main>` in
   `AppShell`. Run the audit **before** adding it so it can't mask a real overflow, and make `expectFitsWidth`
   measure `main.scrollWidth` too so clipped overflow still fails.

## Acceptance criteria
- [ ] Definition of Done passes + `npm run build` + `npm run test:e2e`
- [ ] Final leaderboard at 320/375/430: no horizontal overflow, payout fully visible, no value removed
- [ ] Width check runs on every route listed in step 3 and passes (or each remaining failure is a listed follow-up owned by T54)

## Out of scope
Everyone's picks layout (T54), new data or columns, desktop layout.

## Completion notes
Moved fight marks beneath names, removed final-mode movement cells, and verified every audited route at 320/375/430px.
docs/PROGRESS.md                           |   2 +-
docs/tasks/T53-fit-to-width.md             |  10 ++-
e2e/fitWidth.ts                            |  37 +++++++++
e2e/happy-path.spec.ts                     |  29 +++++++
src/app/AppShell.tsx                       |   2 +-
src/features/live/LiveLeaderboard.test.tsx |   1 +
src/features/live/LiveLeaderboard.tsx      | 127 +++++++++++++++--------------
7 files changed, 146 insertions(+), 62 deletions(-)
