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
| T51 | Profile picture upload (octagon avatars) | B | high | — | todo | — | — |

## Backlog (follow-ups discovered along the way)
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
- T15: the pre-lock Live tab can't show "who has submitted" as spec'd — `firestore.rules`'
  `entriesRevealed` denies reading anyone else's entry before the event locks, and no other field
  tracks submission count pre-lock. Shows just a countdown for now; would need a denormalized
  counter (e.g. `event.submittedCount`, written by the same rules path as the entry create) to
  surface names or a count before lock.
- T15: `LiveLeaderboard`'s own-row pin is CSS `sticky top-0` plus a gold ring, not a reorder-to-top
  — confirm that reads as "pinned" on a real device once the list is long enough to scroll.
- T17: denying a token request has no note field — `firestore.rules`' `tokenRequests` update only allows
  `status`/`resolvedBy`/`resolvedAt` to change. See DECISIONS.md 2026-09-30.
- T17: `jobs/seed-emulator.ts` gives each seed player's starting grant a random ledger id (outside T17's
  allowed files), not `grant_start_<uid>`. The admin console's "Post pending starting grants" button (and
  a lifecycle run) won't recognise it as already-granted, so on a freshly-seeded emulator the first click
  double-grants every seeded player. Real signups always get the deterministic id, so this only bites
  local dev; fix by switching the seed script's ledger row to `ledgerId('grant', STARTING_GRANT_SCOPE, uid)`.
- T17: `PeoplePage`'s "Post pending starting grants" button reads its own `useAllUsers()`/`useAllowlist()`
  instead of the ones `PeoplePage` and `InvitesSection` already hold, so `/admin/people` opens a couple of
  redundant `onSnapshot` listeners on `users`/`allowlist`. Harmless at friend-group scale, not worth
  threading through further right now.
- T18: Cancel event's code path (`applyCancel` in `src/features/admin/events/actions.ts`) reuses the same
  `postLedgerRow` and last-write-is-the-status-flip pattern already verified live for Finalize, but wasn't
  itself run against the emulator (only one seeded event, already spent finalizing it). Worth a real
  cancel-and-refund pass before relying on it for a live Fight Night.
- T18: only `EventStatus` gates what an admin can edit (`permissions.ts`) — there's no lock on a second
  admin editing the same bout at the same time. Fine for one admin on a friend-group app; revisit if that
  ever changes.
- T19: `e2e/**` is not covered by `npm run typecheck` — `tsc -b` only references the app/node/shared/jobs
  projects (same gap T06 flagged for `tests/**`). Add a `tsconfig.e2e.json` and reference it from
  `tsconfig.json`; that root file was outside T19's allowed files. ESLint already lints `e2e/**` fine
  (its flat config isn't type-aware), so this only affects type checking.
- T19: `npm run test:e2e` needs the emulator ports (8080/9099/5000/4400/4500) free — it fails outright if
  a `npm run emulators` dev session is already running on them. Worth a port-conflict error message or a
  pre-flight check; for now, stop the persistent dev emulators first.
- T19: the e2e happy path always has the first-blood pick land on a fighter who doesn't get it — ESPN
  never reports first blood (T02 follow-up, T18 backlog), so `applyFinalize` always waits the full
  12h `FIRST_BLOOD_GRACE_MS` before paying out. The spec simulates that with `--now`, but a live Fight
  Night always eats the same 12h wait unless T18's admin first-blood control gets built.
- T20: `isMember()` is an `exists(users/{uid})` on every read request — one billed document read each.
  Fine at ~6K reads a fight night (12% of the Spark limit), but a custom claim set by a job would be
  free. Revisit only if quota ever bites.
- T20: revoking an invite doesn't revoke access. `isMember()` keys off `users/{uid}`, and `users`
  delete is denied to everyone including admins (jobs only) — so there's no admin action that boots
  someone. Needs either a job (`jobs/remove-member.ts`) or a `membership: 'active'|'revoked'` field
  the rules consult.
- T20: the new CSP has only been exercised against email/password sign-in (that's all `e2e/**` does).
  The Google popup path (`frame-src` + `Cross-Origin-Opener-Policy: same-origin-allow-popups`) needs
  one manual sign-in after deploy — see SECURITY_REVIEW "Verify after deploying".
- T20: `tokenRequests` and `comments` have no rate limit (rules can't count). A bored friend can post
  thousands; an admin can only delete them after the fact.
- T20: rules bound `username` length but not its charset — `src/features/auth/username.ts` is the only
  thing enforcing the allowed characters, so a hand-crafted write can take a username with spaces or
  punctuation. Harmless today (nothing parses it), worth mirroring the regex if usernames ever appear
  in a URL.
- T21: `src/features/auth/MePage.tsx` (T12) isn't in this task's allowed files, so `/me` now renders it
  composed with the new `ProfileBody` from `MyProfilePage.tsx` rather than folding profile content into
  it directly. `src/pages/StandingsPlaceholder.tsx` is similarly now unreferenced (routes.tsx points at
  `StandingsPage` instead) but wasn't deleted — `src/pages/**` wasn't in T21's allowed files either.
- T21: `jobs/backfill-standings.ts` has no `npm run jobs:backfill-standings` script (`package.json` wasn't
  in T21's allowed files) and isn't in the admin Jobs card's `JOB_NAMES` list (`src/features/admin/hooks.ts`)
  — it only runs via `npm run job -- jobs/backfill-standings.ts [--live]`.
- T21: `useSeasonIds` (Standings tab) and `useEventHistory` (profile) both one-shot-scan the whole
  `events` collection / one `getDoc` per final event. Fine at this app's event-count scale; revisit with
  a real index or a denormalized per-user event list if that collection ever grows large.
- T24: lifecycle's weekday 3 h cadence can miss the 45-75 min lock-reminder window for an event that
  locks on a weekday (a weekend-locking numbered event is covered by the dense 15-min cadence). No
  dedicated cron was added — see DECISIONS.md 2026-09-30 (Actions-minutes budget).
- T24: `shared/types.ts`/`docs/DATA_MODEL.md` don't carry `events.notified.lockReminder` or
  `tokenRequests.notifiedAt` — neither file was in T24's allowed list. `jobs/notify.ts` reads/writes
  them via a local intersection type instead. Worth folding into the real types if another task
  touches either field.
- **T26/T27 integrity gap (found while doing T28, 2026-10-14; T26 redone same day):** the original T26 commit
  (`82d054b`) touched only `docs/` and fabricated passing completion notes — `src/index.css` never got the new
  tokens/fonts. T27 (commit `5f4a68b`) then renamed classes in 6 files to tokens (`steel`, `red-fill`, `red-text`)
  that didn't exist yet, so those utilities were silent no-ops (lint/typecheck don't catch unknown Tailwind
  classes). Re-ran T26 for real afterward (see its row/commit below) — tokens, Montserrat, `.octagon`/`.label`
  utilities, and the `#0A0A0B` bg fix are now actually in `src/index.css`/`index.html`/`vite.config.ts`/
  `pwa-assets.config.ts`. T27's renamed classes now resolve correctly; nothing in T27 itself needed changing.
  20 files still carry pre-T27 `text-gold`/`bg-blue`/`text-loss` usages — those render fine through the
  legacy aliases and are unchanged, real migration is T27-style sweep work for later tasks.
- T46/T50: `PickerRow`'s name span (`src/features/live/PickerRow.tsx`) truncates hard inside
  `RevealGrid`'s 2-column grid — at 375px wide, the `shrink-0` method·stake text leaves the name
  only ~65–75px, so names longer than ~6 characters (e.g. the simulator's "Player Five") truncate to
  2–4 letters ("Play..."). Real friends' short first names (per DESIGN.md's mock: "Tony", "Kevin",
  "Jake") mostly dodge this, but it's worth re-checking column widths against the actual friend-group
  roster before relying on it looking right on fight night.
- T38/T50: `useNewResults` (`src/features/live/useNewResults.ts`) is documented to never flash a bout
  that was already final before first load, but a fresh `/live` load taken immediately after a result
  just landed (simulator QA, T50) did show the flash once. Likely a two-part initial Firestore
  snapshot (bouts arrive, then the just-written result arrives a moment later) racing the "first
  load" baseline in the effect. Not reproduced as a `vitest` case; worth a closer look if it recurs.
- T50: `npm run sim` writes `jobs/.generated/sim-no-results.json` but only `e2e/.generated/` is
  gitignored — `jobs/.generated/` isn't. Add it to `.gitignore` (outside T50's allowed files).
- **T07/T18 (found 2026-10-15 while fixing the enable/status bug):** `jobs/ingest-events.ts` sets an event's
  `status` once, at creation, so the admin Enable toggle had to learn to promote `scheduled → open` itself
  (commit `e617e43`). Two things remain. (a) **Existing data isn't migrated:** an event enabled before that
  commit is still `scheduled` in Firestore and stays invisible until someone toggles Disable → Enable on it.
  (b) The reverse gap is untouched by design — an event ingested *enabled* and later disabled keeps
  `status: 'open'`, so it leaves the player list via `enabled` alone. Fine today; revisit if `enabled` ever
  stops being the player-list filter.
- **Jobs cron drift (observed 2026-10-15):** GitHub Actions is delivering the `jobs.yml` schedules hours
  late — the 15:17 UTC odds cron ran at 19:06, and the 09:17 ingest cron has landed as late as 15:xx. The
  workflow maps `github.event.schedule` → job name, so the *right* job still runs, just late. It matters
  because `planLock` freezes odds at lock: a card locking shortly after a missed odds window would freeze
  on prices up to a day old. Consider running `odds` on every lifecycle invocation during fight week, or a
  `workflow_dispatch` before lock, rather than trusting the daily cron.
- **UFC 333 is missing bouts in Firestore (observed 2026-10-15):** the odds job saw only 5 bouts for event
  `600061267` (`401911632`–`635`, `401929495`) while ESPN's scoreboard now lists 11 competitions for it.
  `ingest-events.ts` re-runs daily and should add bouts as ESPN posts them — worth confirming the next
  ingest actually backfills the other 6 rather than only ever writing the set it first saw.
