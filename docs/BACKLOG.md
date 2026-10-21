# Backlog

Follow-ups discovered along the way. Read this file only when a task lists it.

## Open

- [[T08 ESPN odds rescope]]
- [[T11/T13 headshots optimization]]
- [[Tooling prettierignore]]
- [[T04 constant consolidation]]
- [[Tooling shared/names.test.ts formatting]]
- [[Tooling firestore.rules formatting]]
- [[Tooling tsconfig.tests.json]]
- [[T09/T13 8-pick entry cap warning]]
- [[T12 allowlist claiming rule]]
- [[T17 tokenRequests edit restrictions]]
- [[Tooling npm run seed entries]]
- [[T18 first-blood admin control]]
- [[T17 ledger id no-ops]]
- [[T10 lifecycle cancelled event query]]
- [[T18 event status transition safety]]
- [[Tooling JS bundle code-splitting]]
- [[T12 onboarding fixture]]
- [[T14 BudgetMeter sticky offset]]
- [[T15 pre-lock submission count]]
- [[T15 LiveLeaderboard own-row pin]]
- [[T17 token request denial notes]]
- [[T17 seed script ledger id]]
- [[T17 PeoplePage listeners redundancy]]
- [[T18 Cancel event emulator test]]
- [[T18 concurrent admin edit lock]]
- [[T19 e2e typecheck coverage]]
- [[T19 emulator port conflicts]]
- [[T19 first-blood scoring wait]]
- [[T20 isMember() billing reads]]
- [[T20 revoked invite access]]
- [[T20 Google popup CSP test]]
- [[T20 rate limits on requests/comments]]
- [[T20 username charset validation]]
- [[T21 auth/MePage composition]]
- [[T21 pages/StandingsPlaceholder deletion]]
- [[T21 backfill-standings script]]
- [[T21 past events pagination]]
- [[T24 lock-reminder cron coverage]]
- [[T24 notification field types]]
- [[T26 integrity gap follow-up]]
- [[T46/T50 PickerRow name truncation]]
- [[T38/T50 useNewResults flash race]]
- [[T50 sim-no-results gitignore]]
- [[T07/T18 event status migration]]
- [[T07/T18 event enabled filter risk]]
- [[Jobs cron drift]]
- [[UFC 333 bouts backfill]]
- [[Trial 2026-10-17 event archive pagination]]
- [[T56 solo-night admin preview and notification]]

---

## T08: rescope to ESPN odds (no key, no quota, matched by athlete id)

The owner approved this on 2026-09-29, and `odds.source` / `events.kind` now carry `'espn'` / `'special'`. See DECISIONS.md. The Odds API half of T02 stays ☐ because no `ODDS_API_KEY` was available; it is now a fallback only.

## T11/T13: hotlink headshots through `a.espncdn.com/combiner/i?img=...&w=160` (30 KB, not 220 KB) and add an initials fallback

~10% of athletes 404 (debutants).

## Tooling: add `fixtures` to `.prettierignore`

So `npm run format` stops rewriting captured JSON (outside T02's allowed files).

## T04: move `DEFAULT_AMERICAN_ODDS` (100, GAME_RULES §4) out of `shared/scoring.ts` and `UPSET_AMERICAN_ODDS` (200, §9) out of `shared/standings.ts` into `shared/constants.ts`

That file was outside T04's allowed files, and every other game number lives there.

## Tooling: `shared/names.test.ts` fails `prettier --check`

Predates T04, outside its allowed files.

## Tooling: add `firestore.rules` and `.firebaserc` to `.prettierignore`

Prettier has no parser for either, so `npm run format` errors on them (outside T05's allowed files).

## Tooling: `tests/**` is not covered by `npm run typecheck`

`tsc -b` only references the app/node/shared/jobs projects. Add a `tsconfig.tests.json` (node types, `allowImportingTsExtensions`) and reference it from `tsconfig.json`; that root file was outside T06's allowed files. T06's rules tests were typechecked by hand.

## T09/T13: entries are capped at 8 picks by `firestore.rules`

See DECISIONS.md. An event whose `mainCardBoutIds` is longer than 8 cannot be entered — surface that as an admin warning rather than letting players hit a bare `permission-denied`.

## T12: nothing writes `allowlist/{email}.claimedBy` / `claimedAt` at onboarding

DATA_MODEL gives the allowlist `W: Adm`, so the rules deny the claiming user; either a job/admin action marks it, or the spec needs a narrow owner-claim rule.

## T17: `tokenRequests` updates are restricted to `status`, `resolvedBy` and `resolvedAt`, and `status` must become `approved` or `denied`

Admin UI cannot reopen a resolved request or edit its amount.

## Tooling: `npm run seed` seeds no entries

So T09's emulator smoke needed a throwaway script to create them. Seeding 3–4 entries (and one player too broke to pay) would make the lifecycle path runnable from `npm run seed` alone (`jobs/seed-emulator.ts` was outside T09's allowed files). T58 found the same gap: it was to seed `entrants/{uid}` next to each seeded entry, but there are none, so the pre-lock "who's in" list is empty in local dev until you submit a pick. Whoever seeds entries should seed a marker per entry (and `jobs/simulate-night.ts`, which does create entries, should too).

## T18: nothing writes `bout.result.firstBlood`

ESPN has no such field, so every event with `firstBloodEnabled` waits the full `FIRST_BLOOD_GRACE_MS` (12 h) and then scores the prop 0. The admin result screen needs a first-blood control, or the prop is dead on arrival.

## T17: admin `grant`/`adjust` rows must keep random ledger ids

`ledgerId` returns null for them. Giving them a derived id would make a second identical grant a silent no-op. See DECISIONS.md 2026-09-29.

## T10: `jobs/lifecycle.ts` loads cancelled events whose `finalizedAt` is null with no date bound

So the candidate query grows with the number of cancelled events ever. Fine at this scale; revisit if it ever needs an index.

## T18: an admin who moves a `final` event back to `live` would make the next lifecycle run re-apply the finalize stage

Double-counting season standings, h2h and `users.stats` (the ledger is protected by its derived ids, those three collections are not). Either block that transition or have it undo the fold.

## Tooling: the production JS bundle is one ~910 KB chunk

Firebase + react-router + app code, no code-splitting. Fine at T11's placeholder-screen size; revisit with `build.rollupOptions` manual chunks or route-level `lazy` once real screens (T13+) add weight.

## T12: `jobs/seed-emulator.ts` seeds every player fully onboarded

Allowlist + auth + `users/{uid}` in one batch, so there's no seeded "invited, signed in, not yet onboarded" fixture to exercise the onboarding screen — verified it manually instead (allowlist an email with no matching auth user via `bootstrap-admin`, then sign up with that email through the UI). Outside T12's allowed files (`jobs/seed-emulator.ts` isn't in its list).

## T14: `BudgetMeter`'s sticky offset above the tab bar (`bottom-16`)

Is a fixed guess at the tab bar's rendered height, not measured — confirm it clears the tab bar on a real iOS device (safe-area inset) rather than only desktop Chrome.

## T15: the pre-lock Live tab can't show "who has submitted" as spec'd

`firestore.rules`' `entriesRevealed` denies reading anyone else's entry before the event locks, and no other field tracks submission count pre-lock. Shows just a countdown for now; would need a denormalized counter (e.g. `event.submittedCount`, written by the same rules path as the entry create) to surface names or a count before lock.

## T15: `LiveLeaderboard`'s own-row pin is CSS `sticky top-0` plus a gold ring

Not a reorder-to-top — confirm that reads as "pinned" on a real device once the list is long enough to scroll.

## T17: denying a token request has no note field

`firestore.rules`' `tokenRequests` update only allows `status`/`resolvedBy`/`resolvedAt` to change. See DECISIONS.md 2026-09-30.

## T17: `jobs/seed-emulator.ts` gives each seed player's starting grant a random ledger id

Not `grant_start_<uid>`. The admin console's "Post pending starting grants" button (and a lifecycle run) won't recognise it as already-granted, so on a freshly-seeded emulator the first click double-grants every seeded player. Real signups always get the deterministic id, so this only bites local dev; fix by switching the seed script's ledger row to `ledgerId('grant', STARTING_GRANT_SCOPE, uid)`.

## T17: `PeoplePage`'s "Post pending starting grants" button reads its own `useAllUsers()`/`useAllowlist()`

Instead of the ones `PeoplePage` and `InvitesSection` already hold, so `/admin/people` opens a couple of redundant `onSnapshot` listeners on `users`/`allowlist`. Harmless at friend-group scale, not worth threading through further right now.

## T18: Cancel event's code path (`applyCancel` in `src/features/admin/events/actions.ts`)

Reuses the same `postLedgerRow` and last-write-is-the-status-flip pattern already verified live for Finalize, but wasn't itself run against the emulator (only one seeded event, already spent finalizing it). Worth a real cancel-and-refund pass before relying on it for a live Fight Night.

## T18: only `EventStatus` gates what an admin can edit

There's no lock on a second admin editing the same bout at the same time. Fine for one admin on a friend-group app; revisit if that ever changes.

## T19: `e2e/**` is not covered by `npm run typecheck`

`tsc -b` only references the app/node/shared/jobs projects (same gap T06 flagged for `tests/**`). Add a `tsconfig.e2e.json` and reference it from `tsconfig.json`; that root file was outside T19's allowed files. ESLint already lints `e2e/**` fine (its flat config isn't type-aware), so this only affects type checking.

## T19: `npm run test:e2e` needs the emulator ports (8080/9099/5000/4400/4500) free

It fails outright if a `npm run emulators` dev session is already running on them. Worth a port-conflict error message or a pre-flight check; for now, stop the persistent dev emulators first.

## T19: the e2e happy path always has the first-blood pick land on a fighter who doesn't get it

ESPN never reports first blood (T02 follow-up, T18 backlog), so `applyFinalize` always waits the full 12h `FIRST_BLOOD_GRACE_MS` before paying out. The spec simulates that with `--now`, but a live Fight Night always eats the same 12h wait unless T18's admin first-blood control gets built.

## T20: `isMember()` is an `exists(users/{uid})` on every read request

One billed document read each. Fine at ~6K reads a fight night (12% of the Spark limit), but a custom claim set by a job would be free. Revisit only if quota ever bites.

## T20: revoking an invite doesn't revoke access

`isMember()` keys off `users/{uid}`, and `users` delete is denied to everyone including admins (jobs only) — so there's no admin action that boots someone. Needs either a job (`jobs/remove-member.ts`) or a `membership: 'active'|'revoked'` field the rules consult.

## T20: the new CSP has only been exercised against email/password sign-in

That's all `e2e/**` does. The Google popup path (`frame-src` + `Cross-Origin-Opener-Policy: same-origin-allow-popups`) needs one manual sign-in after deploy — see SECURITY_REVIEW "Verify after deploying".

## T20: `tokenRequests` and `comments` have no rate limit

Rules can't count. A bored friend can post thousands; an admin can only delete them after the fact.

## T20: rules bound `username` length but not its charset

`src/features/auth/username.ts` is the only thing enforcing the allowed characters, so a hand-crafted write can take a username with spaces or punctuation. Harmless today (nothing parses it), worth mirroring the regex if usernames ever appear in a URL.

## T21: `src/features/auth/MePage.tsx` (T12) isn't in this task's allowed files

So `/me` now renders it composed with the new `ProfileBody` from `MyProfilePage.tsx` rather than folding profile content into it directly. `src/pages/StandingsPlaceholder.tsx` is similarly now unreferenced (routes.tsx points at `StandingsPage` instead) but wasn't deleted — `src/pages/**` wasn't in T21's allowed files either.

## T21: `jobs/backfill-standings.ts` has no `npm run jobs:backfill-standings` script

`package.json` wasn't in T21's allowed files and isn't in the admin Jobs card's `JOB_NAMES` list (`src/features/admin/hooks.ts`) — it only runs via `npm run job -- jobs/backfill-standings.ts [--live]`. (resolved T57: that job is replaced by `jobs/rebuild-records.ts`, which has `npm run jobs:rebuild` and `rebuild-dry`/`rebuild-live` in the Jobs workflow. Still not in the admin Jobs card.)

## T21: `useSeasonIds` (Standings tab) and `useEventHistory` (profile) both one-shot-scan the whole `events` collection

One `getDoc` per final event. Fine at this app's event-count scale; revisit with a real index or a denormalized per-user event list if that collection ever grows large.

## T24: lifecycle's weekday 3 h cadence can miss the 45-75 min lock-reminder window

For an event that locks on a weekday (a weekend-locking numbered event is covered by the dense 15-min cadence). No dedicated cron was added — see DECISIONS.md 2026-09-30 (Actions-minutes budget).

## T24: `shared/types.ts`/`docs/DATA_MODEL.md` don't carry `events.notified.lockReminder` or `tokenRequests.notifiedAt`

Neither file was in T24's allowed list. `jobs/notify.ts` reads/writes them via a local intersection type instead. Worth folding into the real types if another task touches either field.

## T26/T27: integrity gap (found while doing T28, 2026-10-14; T26 redone same day)

The original T26 commit (`82d054b`) touched only `docs/` and fabricated passing completion notes — `src/index.css` never got the new tokens/fonts. T27 (commit `5f4a68b`) then renamed classes in 6 files to tokens (`steel`, `red-fill`, `red-text`) that didn't exist yet, so those utilities were silent no-ops (lint/typecheck don't catch unknown Tailwind classes). Re-ran T26 for real afterward (see its row/commit below) — tokens, Montserrat, `.octagon`/`.label` utilities, and the `#0A0A0B` bg fix are now actually in `src/index.css`/`index.html`/`vite.config.ts`/ `pwa-assets.config.ts`. T27's renamed classes now resolve correctly; nothing in T27 itself needed changing. 20 files still carry pre-T27 `text-gold`/`bg-blue`/`text-loss` usages — those render fine through the legacy aliases and are unchanged, real migration is T27-style sweep work for later tasks.

## T46/T50: `PickerRow`'s name span truncation

`src/features/live/PickerRow.tsx` truncates hard inside `RevealGrid`'s 2-column grid — at 375px wide, the `shrink-0` method·stake text leaves the name only ~65–75px, so names longer than ~6 characters (e.g. the simulator's "Player Five") truncate to 2–4 letters ("Play..."). Real friends' short first names (per DESIGN.md's mock: "Tony", "Kevin", "Jake") mostly dodge this, but it's worth re-checking column widths against the actual friend-group roster before relying on it looking right on fight night.

## T38/T50: `useNewResults` flash race

`useNewResults` (`src/features/live/useNewResults.ts`) is documented to never flash a bout that was already final before first load, but a fresh `/live` load taken immediately after a result just landed (simulator QA, T50) did show the flash once. Likely a two-part initial Firestore snapshot (bouts arrive, then the just-written result arrives a moment later) racing the "first load" baseline in the effect. Not reproduced as a `vitest` case; worth a closer look if it recurs.

## T50: `npm run sim` writes `jobs/.generated/sim-no-results.json`

But only `e2e/.generated/` is gitignored — `jobs/.generated/` isn't. Add it to `.gitignore` (outside T50's allowed files). (resolved T55)

## T07/T18: event status migration gap

`jobs/ingest-events.ts` sets an event's `status` once, at creation, so the admin Enable toggle had to learn to promote `scheduled → open` itself (commit `e617e43`). Two things remain. (a) **Existing data isn't migrated:** an event enabled before that commit is still `scheduled` in Firestore and stays invisible until someone toggles Disable → Enable on it. (b) The reverse gap is untouched by design — an event ingested *enabled* and later disabled keeps `status: 'open'`, so it leaves the player list via `enabled` alone. Fine today; revisit if `enabled` ever stops being the player-list filter.

## T07/T18: event enabled filter risk

An event ingested *enabled* and later disabled keeps `status: 'open'`, so it leaves the player list via `enabled` alone. Fine today; revisit if `enabled` ever stops being the player-list filter.

## Jobs cron drift

GitHub Actions is delivering the `jobs.yml` schedules hours late — the 15:17 UTC odds cron ran at 19:06, and the 09:17 ingest cron has landed as late as 15:xx. The workflow maps `github.event.schedule` → job name, so the *right* job still runs, just late. It matters because `planLock` freezes odds at lock: a card locking shortly after a missed odds window would freeze on prices up to a day old. Consider running `odds` on every lifecycle invocation during fight week, or a `workflow_dispatch` before lock, rather than trusting the daily cron.

## UFC 333 is missing bouts in Firestore

The odds job saw only 5 bouts for event `600061267` (`401911632`–`635`, `401929495`) while ESPN's scoreboard now lists 11 competitions for it. `ingest-events.ts` re-runs daily and should add bouts as ESPN posts them — worth confirming the next ingest actually backfills the other 6 rather than only ever writing the set it first saw.

## Trial 2026-10-17: event archive pagination

Archive reads ~2 docs per final event per visit (`usePastEvents`). Fine for years at this scale; if it ever matters, cap `/events` at the latest 20 with "Show more". No FIFO/deletion needed.

## T56: a solo night tells the admin and the player nothing

The Finalize sheet renders "Pays out 0 of 1 entries, totalling 0 tokens" — true, but it never says the night
is a no-contest with the buy-in refunded. And `sendFinalizeSummaries` now skips the lone entrant entirely,
because "you finished 1st" would be a lie and `rank` is `null`, so they get no push at all. Both want a
solo-night line ("Solo night — buy-in refunded, nothing counted"); the player-facing copy belongs with T59's
display work.
