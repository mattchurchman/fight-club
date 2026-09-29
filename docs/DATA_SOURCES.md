# Data sources

> **Status: DRAFT.** T02 verifies every item marked ☐ against live responses, saves fixtures, and rewrites this
> file as the definitive field map. Until then, treat it as leads, not facts.

## 1. ESPN (unofficial, no key): events, bouts, fighters, results, headshots
- Scoreboard (current and upcoming): `https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard`
  - ☐ date filter param: try `?dates=YYYYMMDD` and `?dates=YYYYMMDD-YYYYMMDD`
  - Known (Sept 2026 sample): `events[].id`, `events[].name` ("UFC Fight Night: Rosas Jr. vs. Barcelos"),
    `events[].date` (ISO), `events[].competitions[]` = bouts, `competitions[].type.abbreviation` = weight class,
    `competitions[].format.regulation.periods` = rounds (5 ⇒ main event / title),
    `competitions[].competitors[].athlete.fullName`, `.records[0].summary` ("12-1-0"), `.order` (1|2)
  - ☐ bout order within the card, and how to identify **main card vs prelims** (per-bout `startDate`? a card
    segment field? `competitions[].status`?). Fallback rule: the main card = the last 5 bouts by start order.
  - ☐ results: `competitors[].winner` (bool), method, round and time (maybe `competitions[].status.result`,
    `status.type.detail`, or the core API `.../competitions/{id}/status`)
  - ☐ headshots: likely `https://a.espncdn.com/i/headshots/mma/players/full/{athleteId}.png`. Verify with HEAD requests and note the 404 rate.
- Core API (richer, paginated `$ref` links): `https://sports.core.api.espn.com/v2/sports/mma/leagues/ufc/events/{eventId}`
  and `.../competitions/{competitionId}` ☐ check for odds (`/odds`), status and method details.
- Numbered-event detection: regex `^UFC (\d{3})\b` on `events[].name`. ☐ confirm the name format for PPVs ("UFC 320: X vs. Y").

## 2. The Odds API (free key, 500 credits/month): moneylines only
- `GET https://api.the-odds-api.com/v4/sports/mma_mixed_martial_arts/odds?regions=us&markets=h2h&oddsFormat=american&apiKey=KEY`
  - 1 credit per call (1 region × 1 market). Our schedule uses ≈150 per month.
  - Response: `[ { id, commence_time, home_team, away_team, bookmakers: [ { key, markets: [ { key:'h2h', outcomes:[{name, price}] } ] } ] } ]`
  - Fighter names appear as `home_team` / `away_team` and `outcomes[].name`, so we match them to our bouts by normalized name
    (`shared/names.ts`: lowercase, strip accents and punctuation, compare last names, allow initials).
  - Consensus price = **median** across bookmakers for each fighter, rounded to an integer.
  - ☐ confirm the sport key and shape, and check the response headers `x-requests-remaining` / `x-requests-used`.
- No method-of-victory market on the free tier, which is why GAME_RULES uses fixed method multipliers.

## 3. Fallbacks
- ufcstats.com event pages (HTML) have results with method, round and time. Only use them if ESPN results prove unreliable (log a decision first).
- Manual admin entry (T18) is always available for odds, results and first blood.

## 4. Etiquette
Identify requests with a `User-Agent: fight-club-private/1.0`. Cache responses within a job run. Never call from the browser.
