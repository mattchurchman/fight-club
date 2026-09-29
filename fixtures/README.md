# Fixtures

Captured real API responses so tests and local development never hit the network.
Regenerate with `npm run job -- jobs/spike/build-fixtures.ts` (needs internet; it overwrites these files).
All files are pretty-printed and stripped of fields we never read (`links`, `images`, `logos`,
`highlights`, `broadcasts`, `geoBroadcasts`, `statistics`, `ranks`, …) — see `DROP` in that script.

Capture date: **2026-09-29**. Total ≈ 224 KB.

| File | Source URL | What it covers |
|---|---|---|
| `espn/scoreboard-upcoming.json` | `site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard?dates=20261003` | UFC 332 (upcoming, 14 bouts, `STATUS_SCHEDULED`). Also the only capture of `leagues[0].calendar` — the 52-event season list. |
| `espn/scoreboard-completed-331.json` | `…/scoreboard?dates=20260919` | UFC 331 (completed, 12 bouts). Fighter names, records, country flags, `competitors[].winner`, `status.period` / `displayClock`, play-by-play `details[]`. |
| `espn/event-completed-331.json` | `sports.core.api.espn.com/v2/sports/mma/leagues/ufc/events/600060963` | Same event from the core API: `matchNumber` and `cardSegment` per bout. |
| `espn/competition-status.json` | `…/events/{eventId}/competitions/{id}/status`, one per bout | 15 entries: all 12 UFC 331 bouts plus one `dq` (`401914465`), one `draw` (`401867662`) and one `no-contest` (`401864573`) from other cards. Keyed by competition id. |
| `espn/odds-upcoming.json` | `…/events/600061182/competitions/{id}/odds`, one per bout | DraftKings moneylines for all 14 UFC 332 bouts, keyed by competition id. |
| `espn/athletes.json` | `…/v2/sports/mma/athletes/{id}` | Alexandre Pantoja (`2560746`) and Joshua Van (`5120301`) — headshot, nickname, citizenship. |

## Not captured

- **The Odds API** (`fixtures/odds/mma-odds.json`): no `ODDS_API_KEY` was available at capture time,
  and ESPN turned out to serve moneylines keyed by athlete id for free. See `docs/DATA_SOURCES.md` §2
  and the 2026-09-29 decision entry.

## Rules

- Tests read these files. Tests never call `fetch`.
- Ids are real ESPN ids, so `evt_600060963`, `bout_401903509` and `ftr_2560746` are valid fixture ids.
