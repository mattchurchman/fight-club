# T02 — Data-source spike & fixtures

**Tier:** A · **Size:** M · **Depends on:** T01
**USER ACTION REQUIRED:** Optional: SETUP.md §S5 (Odds API key in `.env.local`). Without it, skip the odds half
and mark it ☐ in DATA_SOURCES.md for T08. **Needs network access.** If your environment can't reach the
internet, give the user the exact `curl` commands, ask them to run them and save the output under `fixtures/`, then continue.

## Goal
Turn `docs/DATA_SOURCES.md` from leads into a verified field map, and capture trimmed real responses into
`fixtures/` so every later task can build and test **offline**.

## Context to load (only these)
- `AGENTS.md`
- `docs/DATA_SOURCES.md`
- `docs/DATA_MODEL.md` → sections `events`, `bouts`, `fighters`

## Files you may touch
`docs/DATA_SOURCES.md`, `fixtures/**`, `jobs/spike/*.ts` (throwaway probes; delete them or keep them tiny)

## Steps
1. Write small probe scripts (`npm run job -- jobs/spike/<name>.ts`) that fetch and **save** JSON. Don't paste big
   responses into the conversation. Print only the key paths and sample values.
2. ESPN: capture (a) the current scoreboard, (b) a **recently completed numbered PPV** (find its date on the event list
   and use the `dates=` param), (c) an **upcoming** event, and (d) whatever endpoint gives results, method, round and time
   for a completed bout (scoreboard vs core API).
3. For each ☐ in DATA_SOURCES.md, answer it with evidence (field path + example value). Specifically decide:
   - How to order bouts and identify the **main card** (and the main-card start time → `lockAt`).
   - How to map ESPN result data → our `result.winner/method/round/time`, including how draws, NCs and DQs look.
     Write the mapping as a table (ESPN value → our enum).
   - The headshot URL rule. HEAD-check 10 athletes and report the hit rate.
   - Numbered-event name format.
4. Odds API (if key present): capture one `/odds` response for MMA and record the header quota values.
   Confirm how fighter names appear and propose a matching rule with 3 real examples.
5. Trim fixtures to what we use (keep 1 full numbered event with all bouts, results and 2 athletes). Target under 300 KB total.
   Files: `fixtures/espn/scoreboard-upcoming.json`, `fixtures/espn/event-completed-<n>.json`,
   `fixtures/espn/<results-endpoint>.json`, `fixtures/odds/mma-odds.json`. Add `fixtures/README.md` (source URL and capture date for each).
6. Rewrite DATA_SOURCES.md: remove "DRAFT", keep it under 150 lines, and add a section "Known gaps & fallbacks".
7. If anything materially contradicts DATA_MODEL.md, log a proposal in DECISIONS.md and tell the user. Don't change DATA_MODEL.md yourself.

## Acceptance criteria
- [x] Every ☐ is resolved or explicitly marked "unresolved: <why>, fallback: <what>"
- [x] Fixtures exist, are valid JSON and total under 300 KB. `fixtures/README.md` lists their sources.
- [x] Definition of Done passes (no live network calls in tests)

## Out of scope
Writing production ingestion code (T07/T08).

## Completion notes
Rewrote `docs/DATA_SOURCES.md` as a verified field map (154 lines) and captured 231 KB of fixtures.
Every ☐ resolved except The Odds API (no key — see below). Probed 389 completed bouts across 31 events.
- ESPN needs **two** APIs: site `scoreboard` for names/records/winner flags, core `events/{id}` for
  `matchNumber` + `cardSegment`, and one core `.../status` call per bout for the method.
- **Surprise 1:** core `.../odds` serves DraftKings moneylines keyed by **athlete id**, free and unquotaed.
  That makes The Odds API and its name matching unnecessary. Proposal in DECISIONS.md — needs the owner's OK
  (`bouts.odds.source` needs `'espn'`). Availability, not quota, is the limit: 14/14 priced 4 days out, 1/9 at 25 days.
- **Surprise 2:** `matchNumber` is not unique on scheduled cards (UFC 332 had two `13`s). Order by array
  position instead: `order = competitions.length - index`.
- **Surprise 3:** `dates=` filters on the event's UTC date, so a Saturday-night US card answers to the
  *previous* day. Dana White's Contender Series shares the UFC calendar and must be excluded from import.
- `status.displayClock` is **elapsed**, not remaining. Method vocabulary is 8 values, mapped in §4.
- Follow-ups: (a) two DATA_MODEL proposals in DECISIONS.md await the owner; (b) no first-blood data exists
  anywhere in ESPN — T18 manual entry is the only path; (c) headshots are 200–310 KB full-size, so T11/T13
  should use the `combiner/i?...&w=160` URL (30 KB) with an initials fallback for the ~10% that 404.
