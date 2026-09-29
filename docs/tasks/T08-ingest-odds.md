# T08 — Job: moneyline odds from The Odds API

**Tier:** B · **Size:** S · **Depends on:** T07
**USER ACTION REQUIRED:** SETUP.md §S5 (Odds API key in `.env.local`), unless T02 already captured a fixture and you only run tests.

## Goal
`jobs/ingest-odds.ts` sets `bout.odds` for bouts in `open` events using the median American price across bookmakers.
It never changes odds once `odds.frozen` is true or the event has locked.

## Context to load (only these)
- `AGENTS.md`
- `docs/DATA_SOURCES.md` → section 2
- `docs/DATA_MODEL.md` → `bouts.odds`
- `shared/names.ts`, `shared/odds.ts` (exports only)

## Files you may touch
`jobs/lib/oddsApi.ts`, `jobs/lib/oddsApi.test.ts`, `jobs/ingest-odds.ts`, `jobs/ingest-odds.test.ts`, `package.json` (script `jobs:odds`)

## Steps
1. `oddsApi.ts`: `fetchMmaOdds(key)` (logs `x-requests-remaining`) and a pure `consensusOdds(apiEvents) → { fighterA, fighterB, priceA, priceB, commence }[]`.
2. Pure `matchOddsToBouts(bouts, consensus)` using `namesMatch`. It matches either orientation (the API's home/away may be swapped relative to A/B).
   Unmatched bouts are reported, not guessed.
3. The job loads open events whose `lockAt` is within the next 10 days, matches, and writes `odds: { a, b, source: 'oddsapi', updatedAt, frozen: false }`.
   Skip bouts with `odds.source == 'manual'` (admin override wins).
4. If `ODDS_API_KEY` is missing, log and exit 0 (it isn't an error). Same flags as T07 (`--dry-run` default, `--fixture`, `--live`). Record the job run.
5. Tests with `fixtures/odds/*.json`, including a swapped-orientation match, an accent/"Jr." name, and an unmatched bout.

## Acceptance criteria
- [ ] Dry run against the fixture prints the matched odds for each main-card bout
- [ ] Frozen or manual odds are never overwritten (test)
- [ ] Definition of Done passes

## Out of scope
Freezing odds at lock (T09).

## Completion notes
_(agent fills in)_
