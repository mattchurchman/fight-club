# T03 — Shared domain types, constants & helpers

**Tier:** B · **Size:** M · **Depends on:** T01, T02
**USER ACTION REQUIRED:** none

## Goal
`shared/` holds the TypeScript contract for the whole app: types that mirror DATA_MODEL.md, constants from
GAME_RULES.md, and small pure helpers (odds math, name normalization, IDs). Everything is fully unit-tested.

## Context to load (only these)
- `AGENTS.md`
- `docs/DATA_MODEL.md`
- `docs/GAME_RULES.md` → sections 1, 3, 4 (the formulas only)
- `docs/DATA_SOURCES.md` → the name-matching notes

## Files you may touch
`shared/types.ts`, `shared/constants.ts`, `shared/odds.ts`, `shared/names.ts`, `shared/ids.ts`,
`shared/index.ts`, `shared/*.test.ts`

## Steps
1. `types.ts`: one exported type per collection/subcollection in DATA_MODEL.md, plus the enums (`Corner = 'A'|'B'`,
   `Method`, `ResultMethod`, `EventStatus`, `BoutStatus`, `LedgerType`, …). Use a generic `Ts` type parameter
   or a local `Timestamp` interface (`{ toMillis(): number }`) so `shared/` doesn't depend on the firebase packages.
2. `constants.ts`: `RULES_VERSION`, `DEFAULTS` (exactly the `config/app.defaults` values), `PAYOUT_TABLE`, `NUMBERED_EVENT_RE`.
3. `odds.ts`: `americanToDecimal(o)`, `formatAmerican(o)` ("+150", "−200"), `impliedProbability(o)`,
   `median(nums)`.
4. `names.ts`: `normalizeName(s)` (lowercase, strip diacritics and punctuation, collapse spaces, drop Jr/Sr/II),
   `namesMatch(a, b)` (exact normalized, or same last name + first-initial match). Test it with the real examples from DATA_SOURCES.md.
5. `ids.ts`: `eventId(espnId)`, `boutId(espnId)`, `fighterId(espnId)`, `h2hId(uidA, uidB)` (sorted), `parseEventNumber(name)`.
6. Tests for every helper, including edge cases (odds of ±100, huge underdogs, accented names, "Jr.").

## Acceptance criteria
- [x] Types compile and cover every field in DATA_MODEL.md (a reviewer can diff them side by side)
- [x] ≥95% line coverage on `shared/` helpers (`vitest --coverage` scoped to `shared`)
- [x] Definition of Done passes

## Out of scope
Scoring, payouts and validation (T04).

## Completion notes
Built `types.ts` (one interface per DATA_MODEL.md doc, generic `Ts` for Timestamp), `constants.ts`
(RULES_VERSION, DEFAULTS, PAYOUT_TABLE, NUMBERED_EVENT_RE), `odds.ts`, `names.ts` (normalize + match with
Jr/Sr/II + diacritics), `ids.ts`. 100% line coverage on the four helper files (types.ts has no runtime code).
`bouts.odds.source` and `events.kind` kept as currently specified in DATA_MODEL.md — the two proposals in
DECISIONS.md are still unapproved. Added `@vitest/coverage-v8` dev dep to run the coverage check (see
DECISIONS.md); kept `APP_NAME` in `shared/index.ts` since `jobs/hello.ts` (T01) imports it.
