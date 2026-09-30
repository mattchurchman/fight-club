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
| T07 | Job: ESPN events/bouts/fighters | B | T02, T03, T05 | done | 2026-09-29 | 3a83153 |
| T08 | Job: moneyline odds 👤 | B | T07 | done | 2026-09-29 | 6318e7d |
| T09 | Job: lifecycle (lock/results/score/finalize) | A | T04, T06, T07 | done | 2026-09-29 | aabeb92 |
| T10 | GitHub Actions: CI, schedules, deploy 👤 | C | T06–T09 | done | 2026-09-30 | cd315bd |

## Milestone 3 — App MVP
| ID | Task | Tier | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|
| T11 | Design system, app shell, PWA | B | T01 | done | 2026-09-30 | 52972c3 |
| T12 | Auth, invite gate, onboarding 👤 | B | T05, T06, T11 | done | 2026-09-30 | 511214b |
| T13 | Fights tab: event page & bout cards | B | T07, T11, T12 | done | 2026-09-29 | 35270d3 |
| T14 | Pick builder & submission | B | T04, T13 | done | 2026-09-29 | 8e7b114 |
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
- Tooling: `npm run seed` seeds no entries, so T09's emulator smoke needed a throwaway script to create
  them. Seeding 3–4 entries (and one player too broke to pay) would make the lifecycle path runnable from
  `npm run seed` alone (`jobs/seed-emulator.ts` was outside T09's allowed files).
- T18: nothing writes `bout.result.firstBlood` — ESPN has no such field, so every event with
  `firstBloodEnabled` waits the full `FIRST_BLOOD_GRACE_MS` (12 h) and then scores the prop 0. The admin
  result screen needs a first-blood control, or the prop is dead on arrival.
- T17: admin `grant`/`adjust` rows must keep random ledger ids (`ledgerId` returns null for them). Giving
  them a derived id would make a second identical grant a silent no-op. See DECISIONS.md 2026-09-29.
- T10: `jobs/lifecycle.ts` loads cancelled events whose `finalizedAt` is null with no date bound, so the
  candidate query grows with the number of cancelled events ever. Fine at this scale; revisit if it ever
  needs an index.
- T18: an admin who moves a `final` event back to `live` would make the next lifecycle run re-apply the
  finalize stage, double-counting season standings, h2h and `users.stats` (the ledger is protected by its
  derived ids, those three collections are not). Either block that transition or have it undo the fold.
- Tooling: the production JS bundle is one ~910 KB chunk (firebase + react-router + app code, no
  code-splitting). Fine at T11's placeholder-screen size; revisit with `build.rollupOptions` manual
  chunks or route-level `lazy` once real screens (T13+) add weight.
- T12: `jobs/seed-emulator.ts` seeds every player fully onboarded (allowlist + auth + `users/{uid}`
  in one batch), so there's no seeded "invited, signed in, not yet onboarded" fixture to exercise
  the onboarding screen — verified it manually instead (allowlist an email with no matching auth
  user via `bootstrap-admin`, then sign up with that email through the UI). Outside T12's allowed
  files (`jobs/seed-emulator.ts` isn't in its list).
- T14: `BudgetMeter`'s sticky offset above the tab bar (`bottom-16`) is a fixed guess at the tab
  bar's rendered height, not measured — confirm it clears the tab bar on a real iOS device (safe-area
  inset) rather than only desktop Chrome.
