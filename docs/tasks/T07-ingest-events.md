# T07 — Job: import events, bouts & fighters from ESPN

**Tier:** B · **Size:** M · **Depends on:** T02, T03, T05
**USER ACTION REQUIRED:** for the optional live run: SETUP.md §S4 (service account + `.env.local`).

## Goal
`jobs/ingest-events.ts` finds upcoming UFC events, keeps numbered ones (and Fight Nights as disabled), and
upserts `events`, `bouts` (main card only) and `fighters` idempotently.

## Context to load (only these)
- `AGENTS.md`
- `docs/DATA_SOURCES.md` (verified by T02)
- `docs/DATA_MODEL.md` → `config/app`, `fighters`, `events`, `bouts`
- `shared/types.ts`, `shared/ids.ts` (exports only)

## Files you may touch
`jobs/lib/espn.ts`, `jobs/lib/espn.test.ts`, `jobs/ingest-events.ts`, `jobs/ingest-events.test.ts`, `package.json` (script `jobs:ingest`)

## Steps
1. `espn.ts`: `fetchJson(url)` (User-Agent, timeout, 1 retry) and **pure** parsers: `parseEvents(json) → ParsedEvent[]`,
   `parseMainCard(json) → ParsedBout[]` (ordered, main event first), `parseResult(json) → Result | null`
   (the mapping table from DATA_SOURCES.md; `parseResult` is used by T09), `headshotUrl(athleteId)`.
2. `ingest-events.ts`: look ahead 45 days. For each event:
   - `kind = numbered` if `NUMBERED_EVENT_RE` matches; `enabled = config.autoEnableNumbered && numbered`.
   - Upsert the event with `merge`. **Never** overwrite `status`, `buyIn`, `enabled` or `firstBloodEnabled` once they're set (admin may have changed them).
     New events get `status = enabled ? 'open' : 'scheduled'`, `buyIn` / `budget` from config, `firstBloodEnabled: false`.
   - Upsert bouts and fighters. If the event is `locked` or later, **don't touch** bouts except to mark a bout `cancelled`.
     A bout that's no longer in the source before lock → `cancelled`. A new bout → added. Update `mainCardBoutIds`.
   - Recompute `lockAt` from the main-card start until lock.
3. Flags: `--dry-run` (parse and print a summary, no writes), `--fixture <path>` (read a file instead of the network), `--live`.
   Default = `--dry-run` unless `--live` is passed, so a mistake can't write by accident.
4. Log a one-line summary per event and call `recordJobRun('ingest', …)`.
5. Tests: the parsers against fixtures (bout count, order, main event, records, headshot URLs, numbered detection) and the
   upsert decision logic as a pure function `planEventWrites(existing, parsed) → writes[]`, tested for: new event, admin-edited event
   not overwritten, bout cancelled before lock, event already locked.

## Acceptance criteria
- [ ] `npm run jobs:ingest -- --fixture fixtures/espn/scoreboard-upcoming.json --dry-run` prints the expected card
- [ ] With emulators running: `FIRESTORE_EMULATOR_HOST=localhost:8080 npm run jobs:ingest -- --fixture … --live` writes docs and a second run writes nothing new
- [ ] Definition of Done passes

## Out of scope
Odds (T08), results and lifecycle (T09), scheduling (T10).

## Completion notes
_(agent fills in)_
