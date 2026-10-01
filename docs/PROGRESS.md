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
- T18: `AdminHomePage.tsx` has no link to `/admin/events` — it wasn't in T18's allowed files
  (`src/features/admin/events/**`, `src/app/routes`). An admin has to type the URL until a future task
  adds a nav entry (a `StatCard` like the other three, or a row in the Jobs card).
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
- T24: `NotificationsSection` (the `/me` "Enable notifications" toggle) isn't wired into `/me` —
  `src/features/auth/MePage.tsx` and `src/features/profile/MyProfilePage.tsx` weren't in T24's allowed
  files (same gap T18 hit for `AdminHomePage.tsx`). Add `<NotificationsSection uid={user.uid} />` to one
  of them.
- T24: lifecycle's weekday 3 h cadence can miss the 45-75 min lock-reminder window for an event that
  locks on a weekday (a weekend-locking numbered event is covered by the dense 15-min cadence). No
  dedicated cron was added — see DECISIONS.md 2026-09-30 (Actions-minutes budget).
- T24: `shared/types.ts`/`docs/DATA_MODEL.md` don't carry `events.notified.lockReminder` or
  `tokenRequests.notifiedAt` — neither file was in T24's allowed list. `jobs/notify.ts` reads/writes
  them via a local intersection type instead. Worth folding into the real types if another task
  touches either field.
