# Progress archive

**Agents never need to read this file.** See `docs/PROGRESS.md` for the current task. Completed tasks T01–T54 (Milestones 1–9) are archived here.

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
| T15 | Pick reveal & live leaderboard | B | T09, T14 | done | 2026-09-29 | 2304d80 |
| T16 | Wallet & token requests | C | T12 | done | 2026-09-30 | 0f3327f |
| T17 | Admin: invites, people, tokens | B | T06, T09, T16 | done | 2026-09-30 | 7263ba4 |
| T18 | Admin: event controls & manual results | B | T09, T13, T17 | done | 2026-09-30 | d9eb454 |

## Milestone 4 — Launch 🚀 (invite friends after T20)
| ID | Task | Tier | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|
| T19 | End-to-end smoke tests & polish | B | T14–T18 | done | 2026-09-30 | 284a3b1 |
| T20 | Security & launch review 👤 | A | T19 | done | 2026-09-30 | 891d7c0 |

## Milestone 5 — Fun
| ID | Task | Tier | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|
| T21 | Season standings, profiles, head-to-head | B | T09, T15 | done | 2026-09-30 | 5dba887 |
| T22 | Shareable results card | B | T15 | done | 2026-09-30 | c03252b |
| T23 | Badges | C | T09, T21 | done | 2026-09-30 | dd1fa14 |
| T24 | Push notifications 👤 | B | T10, T11, T12 | done | 2026-09-30 | fed82f1 |
| T25 | Fight-night trash talk | C | T15 | done | 2026-09-30 | 53221d5 |

## Milestone 6 — v2.1: "The Minimal" facelift, pick deck, live tab, history
Plan of record: `docs/DESIGN.md` (v2.1). Tasks are grouped into **runs**; inside a run the tier is the same,
so between tasks you only clear the context (and change effort when the column changes).
Kickoff: `Run the next task. Model tier: <X>. Effort: <effort>`

**Run 1 — Brand base** (Tier C): new tokens/fonts reskin the whole app at once; mechanical sweep of low-traffic screens.
| ID | Task | Tier | Effort | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|---|
| T26 | Brand tokens, fonts & migration aliases | C | low | — | done | 2026-10-14 | 6644289 |
| T27 | Restyle sweep: admin, auth, wallet, help, install, notifications | C | low | T26 | done | 2026-10-14 | 5f4a68b |

**Run 2 — Brand kit** (Tier B): logo, PWA icons, UI kit and shell.
| ID | Task | Tier | Effort | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|---|
| T28 | Logo, PWA icons & brand components | B | medium | T26 | done | 2026-10-14 | d396d46 |
| T29 | UI kit restyle | B | medium | T28 | done | 2026-10-14 | d44b733 |
| T30 | App shell & polish pass | B | medium | T29 | done | 2026-10-14 | 5d44fbd |

**Run 3 — Pick deck** (Tier B): one fight per screen, swiped horizontally, plus a review slide.
| ID | Task | Tier | Effort | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|---|
| T31 | Fights tab card list & pick-deck route | B | medium | T30 | done | 2026-10-14 | 88d1c80 |
| T32 | Fight slide | B | high | T31 | done | 2026-10-14 | 1655e18 |
| T33 | Review slide, submit & locked view | B | high | T32 | done | 2026-10-14 | 6faf404 |
| T34 | Pick flow tests & e2e update | B | low | T33 | done | 2026-10-14 | 76d99fd |

**Run 4 — Live tab** (Tier B): now / me / standings / results.
| ID | Task | Tier | Effort | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|---|
| T35 | Live derivations: current fight, swings, rank moves | B | high | T29 | done | 2026-10-14 | d6fa174 |
| T36 | Live page v2: status strip, In the Cage, your row | B | medium | T35 | done | 2026-10-14 | 63ec8d0 |
| T37 | Leaderboard v2, results list & PlayerSheet | B | medium | T36 | done | 2026-10-15 | 9dd2173 |
| T38 | Result flash | B | medium | T37 | done | 2026-10-15 | 1609ab9 |

**Run 5 — Social & history** (Tier B).
| ID | Task | Tier | Effort | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|---|
| T39 | Trash talk opens with picks | B | medium | T31, T36 | done | 2026-10-15 | 8ab5c61 |
| T40 | Past events & final event view | B | medium | T37 | done | 2026-10-15 | 9b78284 |
| T41 | Profiles everywhere | B | medium | T40 | done | 2026-10-15 | 8b3d8f8 |

**Run 6 — Finish** (Tier B).
| ID | Task | Tier | Effort | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|---|
| T42 | Share posters restyle | B | medium | T29 | done | 2026-10-15 | 35ed2cf |
| T43 | Remove legacy aliases, help copy & final QA | B | medium | T27–T42 | done | 2026-10-15 | 943ba49 |

Deferred to a later revision (owner, 2026-10-14): profile photo upload & fight nicknames; event winner takeover screen &
the passing championship belt.

👤 = has a USER ACTION REQUIRED step (see the task file / docs/SETUP.md).

## Milestone 7 — v2.2: traced brand, everyone's picks, live fixes, simulator
Plan of record: `docs/DESIGN.md` (v2.2 sections). Same rules as Milestone 6: one task per session, clear context
between tasks, kickoff `Run the next task. Model tier: <X>. Effort: <effort>`.

**Run 1 — Brand** (Tier C): wire the traced logo and icons in. The SVGs are already in `public/brand/`.
| ID | Task | Tier | Effort | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|---|
| T44 | Brand wiring: app icon, tab icon, header lockup | C | low | — | done | 2026-10-15 | 70d6a42 |

**Run 2 — Screens** (Tier B): Fights tab polish, everyone's picks, live fixes.
| ID | Task | Tier | Effort | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|---|
| T45 | Event header & fight slide layout fixes | B | medium | T44 | done | 2026-10-15 | 4d52e7b |
| T46 | Everyone's picks: name rows, lock & first blood | B | high | T44 | done | 2026-10-15 | 651a140 |
| T47 | By-person view & In the Cage names | B | medium | T46 | done | 2026-10-15 | 9c16781 |
| T48 | Live tab fixes: "you", clipping, Trash Talk overlap | B | medium | T47 | done | 2026-10-15 | 47b156c |

**Run 3 — Rehearsal** (Tier B): the simulator, then a full QA pass using it.
| ID | Task | Tier | Effort | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|---|
| T49 | Fight-night simulator (`npm run sim`) | B | high | — | done | 2026-10-15 | aa3ea18 |
| T50 | v2.2 QA pass with the simulator & e2e | B | medium | T44–T49 | done | 2026-10-15 | dc69eb1 |

Deferred to a later revision (owner): nicknames; winner takeover screen & championship belt.
(Profile photos came out of this deferred list and are now T51.)

## Milestone 8 — v2.3: player identity
Same rules as Milestone 7: one task per session, clear context between tasks, kickoff
`Run the next task. Model tier: <X>. Effort: <effort>`.

| ID | Task | Tier | Effort | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|---|
| T51 | Profile picture upload (octagon avatars) | B | high | — | done | 2026-10-15 | 5a62044 |

## Milestone 9 — v2.4: trial-event fixes (2026-10-17 trial)
Same rules as Milestone 7: one task per session, clear context between tasks, kickoff
`Run the next task. Model tier: <X>. Effort: <effort>`. Works with any agent (Claude Code, Codex, …) — see the
vendor column in `docs/MODEL_TIERS.md`.

**Run 1 — Fixes & fit** (Tier B throughout: only clear the context between tasks, never switch model).
| ID | Task | Tier | Effort | Depends | Status | Date | Commit |
|---|---|---|---|---|---|---|---|
| T52 | Fix past-events/profile history query & iPhone avatar upload | B | medium | — | done | 2026-10-18 | 7f1e7c1 |
| T53 | Fit-to-width: final leaderboard + overflow check on every screen | B | medium | T52 | done | 2026-10-18 | 30f4628 |
| T54 | Avatars + first names in Everyone's picks; current photo everywhere | B | medium | T53 | done | 2026-10-18 | 82e4c2a |
