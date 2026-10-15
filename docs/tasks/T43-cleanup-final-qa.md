# T43 — Remove legacy aliases, help copy & final QA

**Tier:** B · **Effort:** medium · **Size:** M · **Depends on:** T27–T42
**USER ACTION REQUIRED:** a 10-minute phone check after deploy (step 6).

## Goal
Finish the migration: no legacy colors or props left, help copy describes the new flow, and the whole app is checked
at phone size before the next fight night.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Tokens" (mapping table), "Pick deck" (for help copy)
- `src/features/help/HelpPage.tsx` (only the sections that mention picks, colors or gold)

## Files you may touch
`src/**` (only lines matched by the greps below), `src/index.css`, `src/pages/**` (delete unused placeholders),
`docs/DESIGN.md` (fix drift only), `docs/PROGRESS.md` backlog

## Steps
1. `grep -rnE "(text|bg|border|ring|fill|stroke|from|to)-(gold|blue|loss)\b" src` → replace per the mapping table.
2. Remove the three aliases from `src/index.css`. `npm run build` must still pass.
3. Remove `Avatar`'s deprecated `corner` prop and every `corner=` caller (`grep -rn "corner=" src`).
4. Delete unreferenced `src/pages/*Placeholder.tsx` files (grep each import first; keep any still routed).
5. HelpPage: rewrite the "Making picks" section for the deck (swipe one fight at a time, review slide, auto-balance);
   remove any mention of gold, red/blue corners or the old meter. Keep the scoring explanations unchanged.
6. QA at 375×667 and 393×852 (`npm run dev` + emulator seed): login, onboarding, Fights (open/locked/final), deck
   (each slide + review), Live (pre-lock, live, final), chat, Standings, `/events`, a profile, Wallet, Me, Admin home.
   Fix only trivial issues (≤5 lines each); log the rest in the PROGRESS backlog. Write the checklist results in your
   completion notes.
7. Full checks: Definition of Done, `npm run build`, `npm run test:rules`, `npm run test:e2e`.

## Acceptance criteria
- [ ] Greps in steps 1 and 3 return nothing; no aliases in `index.css`.
- [ ] All checks in step 7 pass.
- [ ] QA checklist recorded.

## Out of scope
New features. Anything in "Deferred to a later revision" in PROGRESS.md.

## Completion notes
_(agent fills in: ≤10 lines)_
