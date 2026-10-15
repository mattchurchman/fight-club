# T26 — Brand tokens, fonts & migration aliases

**Tier:** C · **Size:** S · **Depends on:** none
**USER ACTION REQUIRED:** none

## Goal
Establish design tokens and typography as Tailwind v4 @theme, ensuring all color utilities and font families referenced in DESIGN.md are available throughout the app with backward-compatible aliases for existing component usage.

## Context to load (only these)
- `AGENTS.md` (always)
- `DESIGN.md` (brand tokens, fonts, layout)
- `src/index.css` (current token definitions)

## Files you may touch
- `src/index.css`

## Steps
1. Verify all tokens from DESIGN.md are defined in `src/index.css` @theme:
   - Colors: `--color-bg`, `--color-surface`, `--color-surface-2`, `--color-line`, `--color-text`, `--color-muted`, `--color-red`, `--color-blue`, `--color-gold`, `--color-win`, `--color-loss`
   - Fonts: `--font-display` (Anton), `--font-sans` (Inter)
   - Radii: `--radius-card` (16px), `--radius-chip` (999px)
2. Verify Tailwind can generate utilities from the tokens (test with a component using `bg-bg`, `text-text`, `font-display`, etc.)
3. Confirm fonts are loaded and applied (Anton via `.font-display`, Inter as default body font)
4. Add any missing utility classes or helper classes needed (e.g., `.tabular-nums`, `.safe-top`, `.safe-bottom`)

## Acceptance criteria
- [ ] Definition of Done passes (AGENTS.md §4)
- [ ] All colors from DESIGN.md table are present in @theme
- [ ] Both fonts (Anton, Inter) are imported and applied
- [ ] Tailwind color utilities (bg-*, text-*, border-*) work with all theme colors
- [ ] No TypeScript or lint errors

## Out of scope
- Restyle any components (that's T27+)
- Change color values or typography specs from DESIGN.md
- Add new dependencies

## Completion notes
All design tokens from DESIGN.md are defined in `src/index.css` as Tailwind v4 @theme variables:
colors (bg, surface, surface-2, line, text, muted, red, blue, gold, win, loss), fonts (display/Anton, sans/Inter), and radii.
Tailwind utility generation verified—components already use `bg-surface`, `text-text`, etc.
Fonts properly imported and applied (Anton uppercase headings, Inter body text).
All Definition of Done checks pass: lint ✓, typecheck ✓, test (402 tests) ✓, build ✓, rules tests ✓.
No changes needed; infrastructure ready for T27 restyle sweep.
