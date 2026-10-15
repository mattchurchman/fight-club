# T32 — Fight slide

**Tier:** B · **Effort:** high · **Size:** M · **Depends on:** T31
**USER ACTION REQUIRED:** none

## Goal
Replace the temporary `BoutCard` slide with the real one-fight screen: two tall fighter panels with headshots,
method chips, a stake picker with **no default**, the lock toggle, the "If right" preview and a Next button.
No errors until the player tries to submit.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Pick deck" (the wireframe and its bullets)
- `src/features/picks/PickDeck.tsx` (from T31), `src/features/picks/preview.ts`
- Exports only: `src/features/events/format.ts`, `src/components/ui/Chip.tsx`

## Files you may touch
`src/features/picks/**`

## Steps
1. **FighterPanel** (`fighter`, `odds`, `picked`, `dimmed`, `onSelect`): button, `aria-pressed`, keep
   `aria-label={"Pick " + fighter.name}` (e2e relies on it). Headshot (`headshotUrl`) in an `octagon` frame, ~96px,
   initials fallback. First name small, surname display font. Record, American odds, implied %. Picked: 2px `text`
   outline, red bar under the name, `✓ Your pick` label. The other panel: `opacity-40`.
2. **StakePicker** (`value: number | undefined`, `min`, `max`, `step`, `onChange`): preset chips 50/100/150/200/300/400
   (selected inverted), plus `−` / `+` buttons (step 25, clamp). Shows `—` when `value` is undefined; `+` from
   undefined starts at `min`. Labels `Decrease stake` / `Increase stake`. Unit test the clamp/undefined rules.
   Stop using `src/components/ui/Stepper.tsx` in picks (leave the component).
3. **FightSlide**: layout from the wireframe. Main event gets a `red-fill` "Main event" tag. Method chips `KO`, `SUB`,
   `DEC` (exact text). Lock row: `🔒 Make this my lock` toggle (`aria-pressed`). `If right +N pts` in `win` when
   complete (from `previewPickScore`). `Next fight →` button when complete (on the last fight: `Review picks →`).
4. **Auto-advance**: after choosing a method on a fight that already has winner + stake, scroll to the next slide after
   400ms, unless `prefers-reduced-motion`.
5. **Errors**: `PickDeckPage` holds `attemptedSubmit` (false until T33's submit). Only when true does a slide show its
   one-line `red-text` reason and the top bar mark incomplete segments with a `red-text` dot.
6. Slides scroll vertically inside themselves if taller than the viewport (short phones); fighter panels stay on top.

## Acceptance criteria
- [ ] Definition of Done passes; `npm run build` passes.
- [ ] A fresh entry shows `—` for stake and no red text anywhere.
- [ ] At 375×667: the whole slide fits without page scroll; tap targets ≥44px.

## Out of scope
Review slide & submit (T33).

## Completion notes
_(agent fills in: ≤10 lines)_
