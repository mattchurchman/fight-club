# Progress board

Agents: update **only your task's row** (status, date, commit) and the Backlog section when told to.
Status values: `todo` · `in-progress` · `done` · `BLOCKED: <reason>`.
"Next task" = the first `todo` row, top to bottom, whose dependencies are all `done`.

**Completed:** M1–M9, T01–T54 — see `PROGRESS_ARCHIVE.md`.

## Milestone 10 — v2.5: housekeeping, solo nights, badges, who's in
Kickoff `Run the next task. Model tier: <X>. Effort: <effort>`. One task per session; clear context between tasks.
Spec changes for T56–T60 are already in GAME_RULES §6.1/§9, DATA_MODEL and DESIGN (DECISIONS 2026-10-21).

**Run 1 — Housekeeping** (Tier C)
| ID | Task | Tier | Effort | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|---|
| T55 | Context diet: archive progress, split backlog, prune dead files | C | low | T54 | done | 2026-10-21 | 01722d1 |

**Run 2 — Correctness & data** (Tier A throughout: only clear the context between tasks)
| ID | Task | Tier | Effort | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|---|
| T56 | Finalize: solo nights don’t count; both paths write badges + counts | A | high | T55 | done | 2026-10-21 | 871337b |
| T57 | Rebuild player records job (solo-night scrub + badge backfill) 👤 | A | high | T56 | done | 2026-10-21 | 179e5ad |
| T58 | "Who's in" data: entrant marker + rules | A | medium | T55 | done | 2026-10-21 | 1ab3131 |

**Run 3 — Screens** (Tier B throughout)
| ID | Task | Tier | Effort | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|---|
| T59 | Badge counter on profiles + solo-night display | B | medium | T56 | done | 2026-10-21 | 3802796 |
| T60 | Live tab before lock: "Who's in" | B | medium | T58 | done | 2026-10-21 | f3d1c35 |
| T61 | Deploy Firestore rules + indexes in CI, before Hosting 👤 | B | medium | T60 | todo | | |

## Backlog

Read `docs/BACKLOG.md` only if your task lists it.
