# T31 — Fights tab card list & pick-deck route

**Tier:** B · **Effort:** medium · **Size:** M · **Depends on:** T30
**USER ACTION REQUIRED:** none

## Goal
Split "looking at the card" from "making picks". The Fights tab becomes a compact card list with one big button;
picks happen in a new full-screen, horizontally swiped deck at `/event/:id/picks` with no header or tab bar.
This task builds the list, the route and the deck **shell**; slides temporarily reuse the old `BoutCard` pick mode so
the app keeps working (T32/T33 replace them).

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Pick deck" (shell, progress strip, entry point bullets only)
- `src/features/events/EventPage.tsx`, `src/features/picks/PickBuilder.tsx`, `src/app/routes.tsx`
- Exports only: `src/features/picks/usePickDraft.ts` (the `UsePickDraftResult` interface)

## Files you may touch
`src/app/routes.tsx`, `src/app/AppShell.tsx`, `src/features/events/EventPage.tsx`,
`src/features/events/FightCardList.tsx` (new), `src/features/picks/**`

## Steps
1. **Route**: add `/event/:id/picks` → `PickDeckPage`, wrapped in `RequireReady` inside a `DeckLayout` (exported from
   `AppShell.tsx`: full height, safe areas, no Header/TabBar). If the event isn't `open`, redirect to `/event/:id`.
2. **FightCardList** (`bouts`, `picks?`, `readOnly`, `onSelect?(boutId)`): main card in card order. Each row: weight
   class label, `A name vs B name`, odds, and — if picked — `✓ <surname> · <method> · <stake>` and 🔒. 64px rows.
3. **EventPage** (open event): EventHeader → `FightCardList` → full-width primary button `Make your picks` (no entry) or
   `Edit picks` (entry exists) linking to the deck. Row tap → deck at that fight (`?fight=<boutId>`).
   Locked/final events: `FightCardList readOnly` with the user's picks, then the existing `PicksSection`.
   Remove `PickBuilder` from EventPage (keep the file until T33).
4. **PickDeckPage**: calls `usePickDraft` once and passes it down. Renders `DeckTopBar` + `PickDeck`.
5. **DeckTopBar**: ✕ (back to `/event/:id`, `aria-label="Close picks"`), `Fight n / N`, one progress segment per fight
   plus one for review (filled = complete: winner+method+stake), `allocated / budget pts` (✓ at budget).
6. **PickDeck**: horizontal `overflow-x-auto snap-x snap-mandatory`, one `w-full shrink-0 snap-center` slide per fight
   + a review slide. Track the visible slide with `IntersectionObserver`; sync to `?fight=` via `replace`. ←/→ keys and
   visually-hidden Previous/Next buttons move one slide. Slide content for now: the existing `BoutCard` with `pick`
   props (copy the prop wiring from `PickBuilder`); review slide = existing `BudgetMeter` + `FirstBloodPicker`.
7. Pure helper `deckProgress.ts`: `isPickComplete(pick)`, `completedCount(draft, activeIds)` + tests.

## Acceptance criteria
- [ ] Definition of Done passes; `npm run build` passes.
- [ ] Fights tab (open event) shows list + `Make your picks`; tapping a row opens the deck on that fight.
- [ ] In the deck: no header/tab bar; swiping changes `Fight n / N`; a full entry can still be submitted.

## Out of scope
New slide designs (T32), review slide (T33), e2e changes (T34).

## Completion notes
Built `FightCardList`, `/event/:id/picks` (via new `DeckLayout`), `PickDeckPage`, `PickDeck` (scroll-snap
container, `IntersectionObserver`-tracked index, `?fight=` sync via `replace`, arrow-key + visually-hidden
prev/next nav) and `deckProgress.ts`. `EventPage` now calls `usePickDraft` directly to feed the list/button
and `PickBuilder` is unused but left in place per the task. Slides reuse `BoutCard` pick mode and the review
slide reuses `BudgetMeter`/`FirstBloodPicker` unchanged, as specced.
Deviation: added an optional `lockBoutId` prop to `FightCardList` (beyond the 4 listed) so a row can show
the 🔒 badge from the spec's "if picked" line — no DECISIONS.md entry, it's additive and doesn't change any
existing prop's contract.
Follow-up: `BudgetMeter`'s `sticky bottom-16` offset (sized for the tab bar) leaves an empty gap at the
bottom of the review slide now that the deck has no tab bar — cosmetic only, worth fixing when T33 gives
the review slide its own design.
