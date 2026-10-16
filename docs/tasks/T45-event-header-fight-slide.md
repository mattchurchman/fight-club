# T45 — Event header & fight slide layout fixes

**Tier:** B · **Effort:** medium · **Size:** S · **Depends on:** T44
**USER ACTION REQUIRED:** none

## Goal
Long event titles fit instead of cutting off, the status pill moves onto the countdown row, the main-event tag stops
pushing the fighters down (so swiping between fights feels seamless), and locked/final card rows show each fight's score.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Event header (Fights tab)", "Pick deck" (first bullet + the label line in the wireframe)
- `src/features/events/EventHeader.tsx`, `src/features/picks/FightSlide.tsx` lines 70–90,
  `src/features/events/EventPage.tsx` lines 95–125

## Files you may touch
`src/features/events/EventHeader.tsx`, `src/features/events/format.ts` (+ its test), `src/features/picks/FightSlide.tsx`,
`src/features/picks/FightSlide.test.tsx`, `src/features/events/EventPage.tsx`

## Steps
1. **EventHeader:** headline alone on its row, full width, `text-wrap: balance`, max 2 lines, no `truncate`. Size by
   length with a pure helper `headlineSize(text)` in `format.ts`: ≤18 chars → `text-2xl`, ≤26 → `text-xl`, else `text-lg`
   (unit test the three bands). Next row: date (and venue if present) in `muted`. Next row: `<StatusPill>` then the
   countdown (open) or Buy-in/Pot (locked+), `flex items-center gap-3`.
2. **FightSlide:** delete the separate red "Main event" pill. The label line becomes, for the main event,
   `<span class="text-red-text">Main event</span> / {weightClass} / {rounds} rds`; others `{weightClass} / {rounds} rds`.
   Update the test that looked for the pill so it finds "Main event" in the label line.
3. **EventPage:** the read-only `FightCardList` (locked/live/final with an entry) gets
   `scores={Object.fromEntries(Object.entries(draft.entry.score?.byBout ?? {}).map(([id, s]) => [id, s?.total ?? null]))}`
   (closes the T33 backlog item; remove that item from PROGRESS.md Backlog).

## Acceptance criteria
- [ ] Definition of Done passes; `npm run build` passes.
- [ ] At 375px, "DELLA MADDALENA VS. PRATES" shows in full on ≤2 lines; pill and "Locks in…" share one row.
- [ ] Swiping from the main event to fight 2 in the deck, the fighter panels don't move vertically.

## Out of scope
Reveal grid (T46), Live tab (T47–T48).

## Completion notes
_(agent fills in: ≤10 lines, ending with `git diff --stat`)_
