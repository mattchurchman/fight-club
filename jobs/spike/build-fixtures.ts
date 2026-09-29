// T02 probe: capture the fixtures used by later tasks' tests. Re-runnable.
// usage: npm run job -- jobs/spike/build-fixtures.ts
import { mkdir, writeFile } from 'node:fs/promises';

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/mma/ufc';
const CORE = 'https://sports.core.api.espn.com/v2/sports/mma/leagues/ufc';
const UA = { 'User-Agent': 'fight-club-private/1.0' };
const OUT = 'fixtures';

// UFC 331 (completed, 12 bouts) and UFC 332 (upcoming, 14 bouts).
const COMPLETED = { eventId: '600060963', date: '20260919' };
const UPCOMING = { eventId: '600061182', date: '20261003' };
// Rare result types live on other cards; captured so the mapping table has tests.
const RARE = [
  { eventId: '600061266', competitionId: '401914465', label: 'dq' },
  { eventId: '600058745', competitionId: '401867662', label: 'draw' },
  { eventId: '600058517', competitionId: '401864573', label: 'no-contest' },
];
const ATHLETES = ['2560746', '5120301']; // Pantoja, Van

// Fields we never read: drop them so fixtures stay small and diffs stay readable.
const DROP = new Set([
  'links',
  'logos',
  'images',
  'highlights',
  'broadcasts',
  'geoBroadcasts',
  'league',
  'linked',
  'eventLog',
  'statistics',
  'ranks',
  'styles',
  'association',
  'defaultLeague',
  'leagues',
]);

type Json = unknown;
const trim = (v: Json): Json => {
  if (Array.isArray(v)) return v.map(trim);
  if (v && typeof v === 'object') {
    const out: Record<string, Json> = {};
    for (const [k, val] of Object.entries(v as Record<string, Json>)) {
      if (DROP.has(k)) continue;
      out[k] = trim(val);
    }
    return out;
  }
  return v;
};

const get = async (url: string): Promise<Json> => {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

const save = async (name: string, data: Json) => {
  const path = `${OUT}/${name}`;
  const body = `${JSON.stringify(trim(data), null, 2)}\n`;
  await mkdir(path.slice(0, path.lastIndexOf('/')), { recursive: true });
  await writeFile(path, body);
  console.log(`${name}  ${(body.length / 1024).toFixed(1)} KB`);
};

const compIds = (ev: Json) =>
  ((ev as { competitions?: { id: string }[] }).competitions ?? []).map((c) => c.id);

// 1. Upcoming numbered event, site scoreboard (names, records, venue, season calendar).
await save(
  'espn/scoreboard-upcoming.json',
  await get(`${SITE}/scoreboard?dates=${UPCOMING.date}`),
);

// 2. Completed numbered event: scoreboard (winner flags, period/clock) + core (order, segments).
await save(
  'espn/scoreboard-completed-331.json',
  await get(`${SITE}/scoreboard?dates=${COMPLETED.date}`),
);
const completedCore = await get(`${CORE}/events/${COMPLETED.eventId}`);
await save('espn/event-completed-331.json', completedCore);

// 3. Results: one status doc per bout, keyed by competition id, plus the rare result types.
const statuses: Record<string, Json> = {};
for (const id of compIds(completedCore)) {
  statuses[id] = await get(`${CORE}/events/${COMPLETED.eventId}/competitions/${id}/status`);
}
for (const r of RARE) {
  statuses[r.competitionId] = await get(
    `${CORE}/events/${r.eventId}/competitions/${r.competitionId}/status`,
  );
}
await save('espn/competition-status.json', statuses);

// 4. Moneyline odds for the upcoming card, keyed by competition id.
const upcomingCore = await get(`${CORE}/events/${UPCOMING.eventId}`);
const odds: Record<string, Json> = {};
for (const id of compIds(upcomingCore)) {
  odds[id] = await get(`${CORE}/events/${UPCOMING.eventId}/competitions/${id}/odds`);
}
await save('espn/odds-upcoming.json', odds);

// 5. Two athlete docs (headshot, nickname, citizenship).
const athletes: Record<string, Json> = {};
for (const id of ATHLETES) athletes[id] = await get(`${CORE}/athletes/${id}`);
await save('espn/athletes.json', athletes);
