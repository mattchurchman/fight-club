# Decision log

Append-only. Format: `## YYYY-MM-DD — <title> (Txx or "planning")`, then 2–5 lines covering the context, the decision and its consequences.

## 2026-09-29 — Stack: Firebase Spark + GitHub Actions (planning)
The owner won't enter a credit card and already knows Firebase. Spark has Auth, Firestore, Hosting and FCM but not Functions or Storage,
so server work runs as Node scripts in GitHub Actions using the Admin SDK. Headshots are hotlinked, not stored.

## 2026-09-29 — Rebuild rather than refactor (planning)
The legacy app (Express + Postgres, hand-built cards) had cross-event score corruption, admin checks done only in the browser,
and a reset-token leak. A clean rebuild is cheaper than a refactor. We start fresh with no data migration.

## 2026-09-29 — Game changes vs v1 (planning)
Confidence ranking is replaced by a Lock of the Night (drag-and-drop was broken on iOS, and stake already signals confidence).
Method odds are replaced by fixed multipliers (no free data source). The economy is a buy-in pot with an admin-granted token wallet.
First Blood stays as an optional manual prop.

## 2026-09-29 — Auth methods (planning)
Google + email/password, gated by an admin-managed allowlist. We don't use email-link sign-in (Spark caps it at 5 emails/day).

## 2026-09-29 — Odds come from ESPN, not The Odds API (T02)
T02 found `core/events/{id}/competitions/{id}/odds`: DraftKings moneylines keyed by **athlete id**, no key, no
quota (`docs/DATA_SOURCES.md` §6; 14/14 bouts priced 4 days before UFC 332). That removes the 500-credit/month
budget *and* the fighter-name matching `shared/names.ts` existed for. Decided: ESPN is the primary odds source;
The Odds API is demoted to an unverified documented fallback. **Needs the owner's OK** because it changes T08's
scope and `DATA_MODEL.md`: `bouts.odds.source` must gain `'espn'` (proposed: `'espn'|'oddsapi'|'manual'|'default'`).
Name matching is still worth keeping for manual admin entry, but no longer blocks the odds pipeline.

## 2026-09-29 — Event `kind` needs a third value (T02)
The UFC calendar carries cards that are neither numbered nor Fight Night: `Noche UFC: Silva vs. Delgado` and
`UFC Freedom 250: Topuria vs. Gaethje` (a special PPV whose "250" is not a UFC sequence number, so the numbered
regex must match `shortName`, not `name`). Dana White's Contender Series is also on the same calendar and is
excluded from import outright. **Proposal for the owner:** add `kind: 'special'` to `DATA_MODEL.md` and treat it
like `fightnight` for scoring but never auto-enable it. Until that's approved, T07 ingests these as
`kind: 'fightnight'`, `number: null`, `enabled: false`. `DATA_MODEL.md` is unchanged.

## 2026-09-29 — Owner approved both T02 spec proposals (planning)
The owner approved the two proposals left open by T02. `DATA_MODEL.md` and `shared/types.ts` now read
`odds.source: 'espn'|'oddsapi'|'manual'|'default'` and `events.kind: 'numbered'|'fightnight'|'special'`.
Rationale: both fields record what something *is*, and the alternative was storing a value we know is false
(ESPN odds labelled `oddsapi`, Noche UFC labelled `fightnight`). Consequences: T08 is rescoped to ESPN odds
with The Odds API as a documented fallback; T07 ingests non-numbered, non-Fight-Night cards as
`kind: 'special'`, `number: null`, `enabled: false` — scored like `fightnight`, never auto-enabled.

## 2026-09-29 — Added `@vitest/coverage-v8` dev dependency (T03)
T03's acceptance criteria require `vitest --coverage` scoped to `shared/`, but no coverage provider was
installed. Added `@vitest/coverage-v8@5.0.2` (pinned to the installed `vitest` version) as a dev-only
dependency — it's Vitest's own official coverage provider, not a new tool. Not in AGENTS.md §5; adding it
here since removing it would make the stated acceptance check impossible to run.

## 2026-09-29 — `config/app.admins` is the only admin authority (T06)
`firestore.rules` resolves `isAdmin()` from `config/app.admins` and never reads `users/{uid}.role`. Rationale:
`config/app` is the documented bootstrap path (SETUP.md S7) and is admin/job-only, whereas `role` lives in a doc
its own owner can write — one rule bug there would hand out admin. `role` stays as display metadata, and the
rules deny a player changing it anyway. Consequence: granting admin means editing `config/app.admins`.

## 2026-09-29 — Entries carry at most 8 picks (T06)
Firestore rules have no loops, so per-pick validation (winner/method/stake bounds, GAME_RULES §3) is unrolled
over `picks.values()` at fixed indices. Firestore aborts any request after 1000 expression evaluations, and a
12-slot unroll exceeded that on a full entry (observed as `PERMISSION_DENIED: maximum of 1000 expressions`).
The cap is 8, which is headroom over a 5–6 bout main card; an entry with more picks is denied outright rather
than partially checked. Consequence: an event whose `mainCardBoutIds` exceeds 8 cannot be entered — T09/T13
should flag that rather than let players hit a bare permission error.

## 2026-09-29 — Main-card split from `site/scoreboard` alone, no core-API call (T07)
`docs/DATA_SOURCES.md` §2 gets bout order/`cardSegment` from a second per-event `core/events/{id}` call, but
no fixture captures that call for the upcoming event (`build-fixtures.ts` fetches it only to list ids for
odds, never saves it), and T07's acceptance test passes just `fixtures/espn/scoreboard-upcoming.json`.
Decided: cluster `competitions[].date` instead — the segment sharing the latest timestamp is the main card,
and array order within it already has the main event last (verified against UFC 331's known `cardSegment`
split in `event-completed-331.json`: the date-cluster split matches exactly). Consequence: T07 makes one
network call per ingest run instead of `1 + events`, and never touches the `core` API. `parseResult` (T09)
still needs it for `status`/`period`/`displayClock`.

## 2026-09-29 — T08 implemented as ESPN-only, not The Odds API (T08)
`docs/tasks/T08-ingest-odds.md` still describes The Odds API (fetch/consensus/name-matching, an
`ODDS_API_KEY` USER ACTION step). Per the earlier "Odds come from ESPN, not The Odds API" decision,
T08 was built entirely against `core/events/{id}/competitions/{id}/odds` (docs/DATA_SOURCES.md §6),
matched by athlete id — no key, no `shared/names.ts` matching. `jobs/lib/oddsApi.ts` keeps its name
from the task's file list but its contents are ESPN parsing, not an Odds API client; the Odds API
stays unimplemented (§7: unverified, no fixture). Consequence: the "USER ACTION REQUIRED" step never
applies, and `jobs/ingest-odds.ts` reads bouts from Firestore even during `--dry-run` (T07's dry run
never touches Firestore because its single fixture is self-contained; T08's odds fixture only carries
athlete ids, so bout/fighter context has to come from the DB either way).

## 2026-09-29 — Signed-in read on `config/app` and `users` (T06)
`DATA_MODEL.md` states writers for both but no reader. The pick builder needs `config/app.defaults` (budget,
stake bounds, multipliers) and every leaderboard/profile screen needs other players' `displayName`, so both are
readable by any signed-in user. Neither holds a secret: `admins` is a list of uids and `users` carries no
credentials. Writes are unchanged — balance, role and stats stay admin/job-only.

## 2026-09-29 — Deterministic ledger ids are how the lifecycle job stays re-runnable (T09)
`docs/DATA_MODEL.md` writes `ledger/{autoId}`. Decided: every row the lifecycle job posts gets a
**derived** id instead — `buyin_<eventId>_<uid>`, `payout_<eventId>_<uid>`, `refund_<eventId>_<uid>`,
`grant_start_<uid>` — so `postLedger` finds the doc already there on a re-run and does nothing. Ad-hoc
admin rows (`grant`, `adjust`) have no natural key and keep Firestore's random ids, so they can repeat.
Consequence: the job is safe to run every 15 minutes and safe to resume after a crash mid-lock; the
`autoId` in DATA_MODEL should be read as "the id is opaque to readers", not "always random". T17's admin
grants must keep using random ids, or a second grant of the same size would silently vanish.

## 2026-09-29 — A cancelled event records `finalizedAt` when its refunds are settled (T09)
`docs/DATA_MODEL.md` gives `finalizedAt` no meaning for `cancelled`. `planCancel` sets it once the refunds
are planned, which is what makes a second run a plan-level no-op rather than relying on the ledger ids alone.
Consequence: `finalizedAt != null` means "settled", not "status == final" — T18's admin UI should read it
that way, and an event re-cancelled after settling will not refund twice.

## 2026-09-29 — One missing price defaults *both* sides of a bout (T09)
`docs/GAME_RULES.md` §4 says "if odds are missing at lock, both sides are +100 and source `'default'`",
without saying what one missing side means. Decided: a bout with either side null freezes to +100/+100
with `source: 'default'`. Scoring a real price on one fighter against an invented +100 on the other would
skew the pot in a way nobody could see; defaulting both is visible in `odds.source`.

## 2026-09-29 — `--fixture` is repeatable on the lifecycle job (T09)
`docs/tasks/T09` lists a single `--fixture`. A result needs two ESPN responses — `competitors[].winner`
(only in `site/scoreboard`) and `status.result` (only in `core/.../competitions/{id}/status`) — and
`fixtures/espn/` captures them as separate files. Decided: `--fixture` may be passed more than once and
each file is classified by shape (an object with `events[]` is a scoreboard; anything else is a map of
competition id → status). No new flag, and the existing fixtures work unchanged.

## 2026-09-30 — Denying a token request carries no note (T17)
`docs/tasks/T17` step 5 asks for "deny (with an optional note)". `firestore.rules`' `tokenRequests` update
rule allows only `status`/`resolvedBy`/`resolvedAt` to change (`note` is the requester's own field, fixed at
creation), so a denial note has nowhere to persist without a rules change, which is outside this task's
files. Decided: `denyTokenRequest` takes no note; the admin UI has no note input for denial. See the
PROGRESS.md backlog — a rules change (a separate `resolutionNote` field, or letting admins touch `note`) is
a follow-up, not done here.

## 2026-09-30 — Finalize/Cancel aren't one Firestore transaction (T18)
`docs/tasks/T18` step 3 says Finalize "runs `planFinalize` in a transaction". A literal single
`runTransaction` spanning entries + ledger + standings + h2h + users + event doesn't work: the Web SDK
transaction API requires every read before any write, and posting more than one ledger row needs a
get-then-write per row (`postLedger`, from T17). Decided: mirror `jobs/lifecycle.ts#applyFinalize`
exactly instead — plain sequential writes, each idempotent (deterministic ledger ids; merges elsewhere),
with `event.status → 'final'`/cancelled-settled written **last** so a crash mid-run leaves the event still
`locked`/`live` and a retry recomputes the identical plan rather than getting stuck on `already-final`
with nothing paid out. "A second finalize is blocked" (T18's acceptance criterion) still holds — it's
`planFinalize` seeing `status === 'final'` that blocks it, not a transaction. Verified against the emulator.

## 2026-09-30 — T19 touched a few files outside its list
`docs/tasks/T19`'s "Files you may touch" names `e2e/**`, `playwright.config.ts`, `package.json` (script
`test:e2e`) and small `src/**` fixes. Getting `npm run test:e2e` to actually pass needed a handful of
small companion changes outside that list, same category as T06's noted `tsconfig.tests.json` gap:
`.gitignore` (`!.env.e2e`, `e2e/.generated/`), `.env.e2e` itself (the `VITE_USE_EMULATORS=true` flag a
built bundle needs to reach the emulators — paired with the in-scope `src/lib/firebase.ts` fix), and
`package.json`'s existing `test`/`test:watch` scripts (added `--exclude "e2e/**"`, since vitest's default
glob otherwise tries to run the Playwright spec itself and fails with "test() did not expect to be
called here"). None of these change what `npm run build` or any other script does outside of e2e.
