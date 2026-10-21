# T55 — Context diet: smaller per-session reads

**Tier:** C · **Effort:** low · **Size:** S · **Depends on:** T54
**USER ACTION REQUIRED:** none

## Goal
Cut what every agent session reads before it starts work. Today `docs/PROGRESS.md` is ~24 KB (~6k tokens)
and is read in full every session; ~15 KB of that is the Backlog prose and ~7 KB is rows for finished
milestones. Target: PROGRESS.md under 4 KB, with nothing lost. Also make Claude Code load `AGENTS.md`
automatically instead of spending a tool call to open it.

## Context to load (only these)
- `AGENTS.md` (§1 steps 1, 9 and §3)
- `docs/PROGRESS.md`
- `CLAUDE.md`, `docs/MODEL_TIERS.md`

## Files you may touch
`docs/PROGRESS.md`, `docs/PROGRESS_ARCHIVE.md` (new), `docs/BACKLOG.md` (new), `CLAUDE.md`, `AGENTS.md`,
`docs/MODEL_TIERS.md`, `.gitignore`, `package.json` (scripts only), the three files deleted in step 7, `docs/tasks/T55-context-diet.md`

## Steps
1. **Archive.** Move Milestones 1–9 (all rows `done`) verbatim into new `docs/PROGRESS_ARCHIVE.md`, under a one-line
   header saying agents never need to read it. In PROGRESS.md leave a single "Completed" line: `M1–M9, T01–T54 — see PROGRESS_ARCHIVE.md`.
2. **Backlog.** Move the Backlog section verbatim into new `docs/BACKLOG.md`. In BACKLOG.md, add a short
   `## Open` list at the top (one line each, pointing to the detail below) and mark any item already fixed by a later
   commit as `(resolved Txx)` — check with `git log --oneline` / grep, don't guess. In PROGRESS.md keep only
   `Backlog: docs/BACKLOG.md (read only if your task says so)`.
3. **Keep the header.** PROGRESS.md keeps its status legend, the "next task" rule, and the
   `## Milestone 10` section (with this task's row) unchanged except for your own row's status.
4. **CLAUDE.md.** Replace its body with an import so Claude Code loads the manual at startup:
   ```
   @AGENTS.md
   ```
   Leave GEMINI.md unchanged.
5. **AGENTS.md.** §1 step 9: follow-ups go to `docs/BACKLOG.md` (append under `## Open`), not PROGRESS.md.
   §3: add "Never open `docs/PROGRESS_ARCHIVE.md`; open `docs/BACKLOG.md` only when your task lists it."
   Add one line under §1: Claude Code users already have this file loaded via CLAUDE.md; don't re-read it.
6. **Small fix from backlog:** add `jobs/.generated/` to `.gitignore`.
7. **Remove dead files** (git history keeps them):
   - `docs/tasks/T26-brand-tokens-fonts.md` (superseded duplicate; `T26-brand-tokens.md` is the redo with an Effort field).
   - `docs/DESIGN_v2.0.md` (history only), and drop the "Never open DESIGN_v2.0.md" line from AGENTS.md §3.
   - `jobs/hello.ts` and its `jobs:hello` script in `package.json` (T01 scaffold smoke test).
   Before each delete, `grep -rn` its name outside `docs/tasks/` and fix any live reference. Keep `jobs/spike/build-fixtures.ts` (regenerates fixtures).
8. Report the before/after byte sizes of PROGRESS.md in completion notes (`wc -c`).

## Acceptance criteria
- [ ] Definition of Done passes (AGENTS.md §4)
- [ ] `wc -c docs/PROGRESS.md` < 4000
- [ ] Every row and every backlog paragraph from the old PROGRESS.md exists verbatim in the archive or BACKLOG.md (diff check)
- [ ] CLAUDE.md is exactly `@AGENTS.md`
- [ ] No code under `src/` or `shared/` changed; under `jobs/` only `hello.ts` is deleted

## Out of scope
Rewriting DECISIONS.md, editing old task files, any app code.

## Completion notes
_(agent fills in: ≤10 lines)_
