# Progress board

Agents: update **only your task's row** (status, date, commit) and the Backlog section when told to.
Status values: `todo` · `in-progress` · `done` · `BLOCKED: <reason>`.
"Next task" = the first `todo` row, top to bottom, whose dependencies are all `done`.

## Milestone 1 — Foundation
| ID | Task | Tier | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|
| T01 | Project scaffold & tooling 👤 | B | — | done | 2026-09-29 | 55ee09f |
| T02 | Data-source spike & fixtures 👤 | A | T01 | done | 2026-09-29 | e2cbed1 |
| T03 | Shared domain types, constants & helpers | B | T01, T02 | done | 2026-09-29 | 4e5a299 |
| T04 | Scoring, validation & payout engine | A | T03 | done | 2026-09-29 | 0d55fe6 |
| T05 | Firebase wiring & emulators 👤 | B | T01, T03 | done | 2026-09-29 | b51df1d |
| T06 | Firestore security rules + tests | A | T03, T05 | done | 2026-09-29 | cc85e7c |

## Milestone 2 — Data pipeline
| ID | Task | Tier | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|
| T07 | Job: ESPN events/bouts/fighters | B | T02, T03, T05 | done | 2026-09-29 | pending |
| T08 | Job: moneyline odds 👤 | B | T07 | todo | | |
| T09 | Job: lifecycle (lock/results/score/finalize) | A | T04, T06, T07 | todo | | |
| T10 | GitHub Actions: CI, schedules, deploy 👤 | C | T06–T09 | todo | | |

## Milestone 3 — App MVP
| ID | Task | Tier | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|
| T11 | Design system, app shell, PWA | B | T01 | todo | | |
| T12 | Auth, invite gate, onboarding 👤 | B | T05, T06, T11 | todo | | |
| T13 | Fights tab: event page & bout cards | B | T07, T11, T12 | todo | | |
| T14 | Pick builder & submission | B | T04, T13 | todo | | |
| T15 | Pick reveal & live leaderboard | B | T09, T14 | todo | | |
| T16 | Wallet & token requests | C | T12 | todo | | |
| T17 | Admin: invites, people, tokens | B | T06, T09, T16 | todo | | |
| T18 | Admin: event controls & manual results | B | T09, T13, T17 | todo | | |

## Milestone 4 — Launch 🚀 (invite friends after T20)
| ID | Task | Tier | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|
| T19 | End-to-end smoke tests & polish | B | T14–T18 | todo | | |
| T20 | Security & launch review 👤 | A | T19 | todo | | |

## Milestone 5 — Fun
| ID | Task | Tier | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|
| T21 | Season standings, profiles, head-to-head | B | T09, T15 | todo | | |
| T22 | Shareable results card | B | T15 | todo | | |
| T23 | Badges | C | T09, T21 | todo | | |
| T24 | Push notifications 👤 | B | T10, T11, T12 | todo | | |
| T25 | Fight-night trash talk | C | T15 | todo | | |

👤 = has a USER ACTION REQUIRED step (see the task file / docs/SETUP.md).

## Backlog (follow-ups discovered along the way)
- T11: scaffold has no favicon/app icons (demo assets were removed in T01) — add real ones via
  `@vite-pwa/assets-generator` when PWA/design-system work happens.
- T08: rescope to ESPN odds (no key, no quota, matched by athlete id) — the owner approved this on
  2026-09-29, and `odds.source` / `events.kind` now carry `'espn'` / `'special'`. See DECISIONS.md.
  The Odds API half of T02 stays ☐ because no `ODDS_API_KEY` was available; it is now a fallback only.
- T11/T13: hotlink headshots through `a.espncdn.com/combiner/i?img=...&w=160` (30 KB, not 220 KB) and add an
  initials fallback — ~10% of athletes 404 (debutants).
- Tooling: add `fixtures` to `.prettierignore` so `npm run format` stops rewriting captured JSON
  (outside T02's allowed files).
- T04: move `DEFAULT_AMERICAN_ODDS` (100, GAME_RULES §4) out of `shared/scoring.ts` and
  `UPSET_AMERICAN_ODDS` (200, §9) out of `shared/standings.ts` into `shared/constants.ts` — that file
  was outside T04's allowed files, and every other game number lives there.
- Tooling: `shared/names.test.ts` fails `prettier --check` (predates T04, outside its allowed files).
- Tooling: add `firestore.rules` and `.firebaserc` to `.prettierignore` — prettier has no parser for either,
  so `npm run format` errors on them (outside T05's allowed files).
- Tooling: `tests/**` is not covered by `npm run typecheck` — `tsc -b` only references the app/node/shared/jobs
  projects. Add a `tsconfig.tests.json` (node types, `allowImportingTsExtensions`) and reference it from
  `tsconfig.json`; that root file was outside T06's allowed files. T06's rules tests were typechecked by hand.
- T09/T13: entries are capped at 8 picks by `firestore.rules` (see DECISIONS.md). An event whose
  `mainCardBoutIds` is longer than 8 cannot be entered — surface that as an admin warning rather than letting
  players hit a bare `permission-denied`.
- T12: nothing writes `allowlist/{email}.claimedBy` / `claimedAt` at onboarding. DATA_MODEL gives the allowlist
  `W: Adm`, so the rules deny the claiming user; either a job/admin action marks it, or the spec needs a
  narrow owner-claim rule.
- T17: `tokenRequests` updates are restricted to `status`, `resolvedBy` and `resolvedAt`, and `status` must
  become `approved` or `denied` — admin UI cannot reopen a resolved request or edit its amount.
