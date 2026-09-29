# Data sources

Verified against live responses on **2026-09-29** (T02). Every field path below was observed; fixtures are in
`fixtures/` (see `fixtures/README.md`). Evidence counts come from 389 completed bouts across 31 events.

Two ESPN APIs are used together. Neither needs a key.

- **site** = `https://site.api.espn.com/apis/site/v2/sports/mma/ufc`
- **core** = `https://sports.core.api.espn.com/v2/sports/mma/leagues/ufc`

## 1. Which call gives what

| Need | Call | Notes |
|---|---|---|
| Season event list | `site/scoreboard` → `leagues[0].calendar[]` | 52 entries: `{ label, startDate, endDate, event.$ref }`. Event id is the `events/(\d+)` group in `$ref`. |
| Fighter names, records, flags, venue, winner flags, round/time | `site/scoreboard?dates=YYYYMMDD` | One call per event date. Both `dates=YYYYMMDD` and `dates=YYYYMMDD-YYYYMMDD` work. |
| Bout order, card segment, per-bout start time | `core/events/{eventId}` | `competitions[]` inline, no `$ref` hop. |
| Method of victory | `core/events/{eventId}/competitions/{id}/status` | One call **per bout**. Not available anywhere cheaper — there is no `summary` endpoint for MMA (404). |
| Moneylines | `core/events/{eventId}/competitions/{id}/odds` | One call per bout. Keyed by **athlete id**, so no name matching. |
| Headshot, nickname, citizenship | `core/athletes/{athleteId}` | Optional: the headshot URL can be built without this call (§5). |

`$ref` values come back pointing at the internal host `sports.core.api.espn.pvt`. **Rewrite `.pvt` → `.com`**
or build URLs yourself. Only the id inside a `$ref` is worth keeping.

## 2. Bout order, main card and `lockAt`

- `core/events/{id}.competitions[]` is ordered **opening bout first, main event last**.
  Set `order = competitions.length - index` so `order: 1` is the main event, as `DATA_MODEL.md` requires.
- **Do not use `matchNumber`.** It is correct on completed cards but not unique on scheduled ones —
  UFC 332 had two bouts at `matchNumber: 13` and no `11` (`fixtures/espn/scoreboard-upcoming.json`).
- `isMainCard = cardSegment.name === 'main'`. Observed values: `main` ("Main Card"),
  `prelims1` ("Prelims"), `prelims2` ("Early Prelims"). Small cards only have `main`.
- `lockAt` = the **earliest `competitions[].date` among `cardSegment.name === 'main'` bouts**.
  Every bout in a segment shares one timestamp (UFC 331: 21:30Z / 23:00Z / 01:00Z).
- `startsAt` = the event's own `date` (≈30 min before the first bout).
- `rounds` = `format.regulation.periods`. **5 rounds does not mean main event** — UFC 331 had two 5-round bouts.
- The `calendar[].startDate` is *not* the main-card time; it ran a flat +3h after the event `date` in every
  sample. Use it only for discovery, never for `lockAt`.

## 3. Event naming and which events to import

`name` = `shortName` + optional `": " + subtitle`. Map `shortName` → our fields:

| `shortName` | Example `name` | `kind` | `number` |
|---|---|---|---|
| `UFC 332` | `UFC 332: Silva vs. Wang` | `numbered` | 332 |
| `UFC 335` | `UFC 335` (subtitle TBA) | `numbered` | 335 |
| `UFC Fight Night` | `UFC Fight Night: Rosas Jr. vs. Barcelos` | `fightnight` | null |
| `Noche UFC` | `Noche UFC: Silva vs. Delgado` | see gap G1 | null |
| `UFC Freedom 250` | `UFC Freedom 250: Topuria vs. Gaethje` | see gap G1 | null |
| `Dana White's Contender Series` | `… : Season 10, Week 8` | **skip entirely** | — |

- Numbered detection: `/^UFC (\d{3,4})$/` on **`shortName`**, not `name`. Matching on `name` breaks on
  `UFC 335` (no subtitle) and false-matches `UFC Freedom 250`.
- Subtitle: everything after the first `": "` in `name`, else `null`.
- Separator is `vs.` but not always — `UFC Fight Night: Gamrot vs Salkilld` has no period. Never parse names
  to get fighters; read `competitors[]`.
- A scheduled card **grows**: UFC 335 had 3 bouts announced, UFC 332 had 14. Ingest must upsert, not replace.

## 4. Results → `result` (validated on 389 bouts)

Round and time come from `status`: `period` = finishing round, `displayClock` = **elapsed** time in that round
(a decision reads `5:00`, the fastest KO observed read `0:12`). Method comes from `status.result.name`:

| `status.result.name` | id | Our `method` | Count | Our `winner` |
|---|---|---|---|---|
| `kotko` ("KO/TKO") | 356 | `KO` | 145 | competitor with `winner: true` |
| `decision---unanimous` | 263 | `DEC` | 142 | competitor with `winner: true` |
| `submission` | 284 | `SUB` | 67 | competitor with `winner: true` |
| `decision---split` | 262 | `DEC` | 25 | competitor with `winner: true` |
| `decision---majority` | 261 | `DEC` | 4 | competitor with `winner: true` |
| `draw` | 269 | `DEC` | 3 | `'draw'` (no competitor has `winner: true`) |
| `no-contest` | 277 | `OTHER` | 2 | `'nc'` (no competitor has `winner: true`) |
| `dq` | 264 | `DQ` | 1 | competitor with `winner: true` |
| anything else | — | `OTHER` | 0 | log it, leave for manual entry |

- **A/B**: `A` = the competitor with `order === 1`, `B` = `order === 2`. Array position is unreliable —
  UFC 331 bout `401905385` lists `order: 2` first.
- `status.result` was present on **389/389** bouts of finished events and never needed a fallback.
  Fallback if it ever goes missing: `site/scoreboard` `competitions[].details[]` contains
  `type.text === "Unofficial Winner Kotko" | "… Decision" | "… Submission"` — one call for the whole card,
  but "unofficial", with no decision subtype and no DQ/draw/NC distinction.
- Bout status: `status.type.name` is `STATUS_SCHEDULED` → `STATUS_IN_PROGRESS` → `STATUS_FINAL`.
  Event-level `status.type.name` behaves the same way.
- `result.description` ("Rear Naked Choke") and `result.target` ("Head") are extra flavour we don't store.

## 5. Headshots

- Rule: `https://a.espncdn.com/i/headshots/mma/players/full/{athleteId}.png` — confirmed identical to
  `core/athletes/{id}.headshot.href`, so build it and skip the call.
- **Hit rate 18/20** HEAD requests. Both misses were debutants with high ids (`5450121`, `5311402`).
  A miss returns **HTTP 404 with `content-type: text/html`**, so check the status, not the body.
- Full-size files are 200–310 KB. Use the resizing combiner instead:
  `https://a.espncdn.com/combiner/i?img=/i/headshots/mma/players/full/{id}.png&w=160&h=160` → 30 KB.
  It 404s on missing ids too, so the UI still needs an initials fallback.
- `athleteId` = `competitors[].id` (the `athlete` object in the scoreboard has no `id`).
- Record for `fighters.record`: `competitors[].records[0].summary`, already in `"W-L-D"` form ("30-7-0").

## 6. Moneyline odds (ESPN)

`core/events/{eventId}/competitions/{id}/odds` → `{ count, items: [...] }`. One item per provider;
only **DraftKings** (`provider.id: "100"`, `priority: 1`) appeared in any sample.

```
items[].homeAthleteOdds / .awayAthleteOdds
  .moneyLine            // integer American price, e.g. -205 / 170
  .favorite, .underdog  // booleans
  .current.moneyLine.american, .open.moneyLine.american
  .athlete.$ref         // -> /athletes/{athleteId}
items[].details         // "N. Silva -205" (display only)
items[].overUnder       // rounds total; we don't use it
```

Match to our bout by the **athlete id in `athlete.$ref`**, never by name. In the sample, `home` was the
`order: 1` competitor, but don't rely on it.

**Availability is the constraint, not quota:** UFC 332 (4 days out) had **14/14** bouts priced;
UFC 333 (25 days out) had **1/9**. Poll during fight week, and expect `odds: null` before that.

## 7. The Odds API

Unresolved: no `ODDS_API_KEY` was available during T02, so nothing here is verified and no fixture exists — and
it is no longer needed, since ESPN gives us moneylines by athlete id for free with no quota (§6). Kept as a
documented fallback only: `GET https://api.the-odds-api.com/v4/sports/mma_mixed_martial_arts/odds?regions=us&markets=h2h&oddsFormat=american&apiKey=KEY`
(1 credit/call, 500/month free; ☐ sport key, response shape and the `x-requests-remaining` /
`x-requests-used` headers all still unverified). It would also reintroduce fighter-name matching, which §6 removes.

## 8. Known gaps & fallbacks

- **G1 — no `kind` for special cards.** `Noche UFC` and `UFC Freedom 250` are neither `numbered` nor
  `fightnight` per `DATA_MODEL.md`. Proposal logged in `DECISIONS.md` (2026-09-29); until it's resolved,
  ingest them as `kind: 'fightnight'`, `number: null`, `enabled: false`.
- **G2 — `bouts.odds.source` has no `'espn'` value** in `DATA_MODEL.md`. Proposal logged in `DECISIONS.md`.
- **G3 — no first-blood data.** The whole play-by-play `details[].type.text` vocabulary is `Fight Open/Over,
  Knockdown, Takedown(+Attempt), Submission Attempt, Reversal, Round Start/End/Pause/Unpause, Pause Reason Low
  Blow/Generic, Staredown, Walkout, Tale of the tape, Results, Unofficial Winner *` — nothing about cuts or
  blood. `result.firstBlood` is therefore **always** admin-entered (T18); `result.source: 'espn'` still applies
  to winner/method/round/time.
- **G4 — `dates=` filters on the event's UTC `date`, not its local date.** UFC 331 ran the evening of
  Sept 19 US time, so `dates=20260920` returned nothing and `dates=20260919` returned the card. Always take
  the date from `calendar[].event.$ref` → `core/events/{id}.date`, or query a ±1-day range.
- **G5 — no official ESPN contract.** Unversioned, undocumented, may change without notice. Every job must
  tolerate missing fields, write its outcome to `jobRuns/{jobName}`, and never block a lock or a score on a
  failed fetch. `ufcstats.com` event pages (HTML) and admin manual entry (T18) remain the fallbacks for
  results and odds.
- **G6 — cancelled bouts unobserved.** No sample of a pulled or cancelled bout, so the shape of
  `status.type.name` for one is unknown. Treat any bout that disappears from `competitions[]` as
  `status: 'cancelled'` and void its picks.

## 9. Etiquette

Send `User-Agent: fight-club-private/1.0`. Cache within a job run — a full event needs
`2 + bouts` calls (1 scoreboard + 1 core event + 1 status or odds per bout), so ≈30 for a 14-bout card.
Never call these APIs from the browser; only `jobs/` touches the network.
