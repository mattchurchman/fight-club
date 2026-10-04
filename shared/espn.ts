// Pure ESPN parsing helpers (docs/DATA_SOURCES.md). No Firestore/Admin SDK imports here —
// everything below is a pure function over plain JSON so it can be unit-tested against fixtures,
// and reused directly from the browser bundle (docs/tasks/T18 admin "Check ESPN now") as well as
// from jobs/.
import {
  fighterId as toFighterId,
  boutId as toBoutId,
  parseEventNumber,
  type EventKind,
  type ResultMethod,
  type Winner,
} from './index.ts';

const USER_AGENT = 'fight-club-private/1.0';
const TIMEOUT_MS = 10_000;
const CONTENDER_SERIES_PREFIX = "Dana White's Contender Series";

/** GETs `url` as JSON with a User-Agent, a timeout and one retry on any failure. */
export async function fetchJson<T>(url: string, attempt = 0): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal });
    if (!res.ok) throw new Error(`ESPN ${res.status} on ${url}`);
    return (await res.json()) as T;
  } catch (err) {
    if (attempt === 0) return fetchJson<T>(url, attempt + 1);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** `https://a.espncdn.com/i/headshots/mma/players/full/{id}.png` (docs/DATA_SOURCES.md §5). */
export function headshotUrl(athleteId: string): string {
  return `https://a.espncdn.com/i/headshots/mma/players/full/${athleteId}.png`;
}

// ---- Raw ESPN shapes (site.api.espn.com scoreboard) — only the fields we read ----

export interface EspnCompetitor {
  id: string;
  order: number;
  winner?: boolean;
  athlete: { fullName: string; flag?: { alt?: string } };
  records: { summary: string }[];
}

export interface EspnCompetition {
  id: string;
  date: string;
  type: { abbreviation: string };
  format: { regulation: { periods: number } };
  competitors: EspnCompetitor[];
}

export interface EspnVenue {
  fullName: string;
  address: { city: string; state?: string };
}

export interface EspnEvent {
  id: string;
  name: string;
  shortName: string;
  date: string;
  competitions: EspnCompetition[];
  venues?: EspnVenue[];
}

export interface EspnScoreboard {
  events: EspnEvent[];
}

export interface EspnStatus {
  period?: number;
  displayClock?: string;
  // ESPN sends a present-but-empty `result: {}` for a bout that hasn't finished yet, not an
  // absent field — `id`/`name` only populate once there's an actual decision. Both optional.
  result?: { id?: number; name?: string };
}

// ---- Parsed output ----

export interface ParsedFighter {
  espnId: string;
  fighterId: string;
  name: string;
  record: string;
  country: string | null;
  headshotUrl: string;
}

export interface ParsedBout {
  espnId: string;
  boutId: string;
  order: number;
  isMainEvent: boolean;
  weightClass: string;
  rounds: 3 | 5;
  startsAt: string;
  a: ParsedFighter;
  b: ParsedFighter;
}

export interface ParsedEvent {
  espnId: string;
  name: string;
  subtitle: string | null;
  number: number | null;
  kind: EventKind;
  startsAt: string;
  lockAt: string;
  venue: string | null;
  bouts: ParsedBout[];
}

export interface ParsedResult {
  winner: Winner;
  method: ResultMethod;
  round: number | null;
  time: string | null;
}

function titleCaseWeightClass(abbreviation: string): string {
  return abbreviation.startsWith('W ') ? `Women's ${abbreviation.slice(2)}` : abbreviation;
}

function toParsedFighter(c: EspnCompetitor): ParsedFighter {
  return {
    espnId: c.id,
    fighterId: toFighterId(c.id),
    name: c.athlete.fullName,
    record: c.records[0]?.summary ?? '0-0-0',
    country: c.athlete.flag?.alt ?? null,
    headshotUrl: headshotUrl(c.id),
  };
}

/**
 * The competitions sharing the latest start time are the main card (docs/DATA_SOURCES.md §2:
 * "every bout in a segment shares one timestamp" and the main card always broadcasts last).
 * The site scoreboard has no `cardSegment` field, unlike the core API — this timestamp-clustering
 * gives the same split without a second (per-event) network call.
 */
function mainCardCompetitions(event: EspnEvent): EspnCompetition[] {
  const comps = event.competitions ?? [];
  if (comps.length === 0) return [];
  const latest = Math.max(...comps.map((c) => Date.parse(c.date)));
  return comps.filter((c) => Date.parse(c.date) === latest);
}

/** Ordered bouts of the main card only, main event first (opening bout of the segment last). */
export function parseMainCard(event: EspnEvent): ParsedBout[] {
  const comps = mainCardCompetitions(event);
  const n = comps.length;
  return comps
    .map((comp, indexFromStart): ParsedBout => {
      const order = n - indexFromStart;
      const a = comp.competitors.find((c) => c.order === 1);
      const b = comp.competitors.find((c) => c.order === 2);
      if (!a || !b) throw new Error(`bout ${comp.id} is missing a competitor`);
      return {
        espnId: comp.id,
        boutId: toBoutId(comp.id),
        order,
        isMainEvent: order === 1,
        weightClass: titleCaseWeightClass(comp.type.abbreviation),
        rounds: comp.format.regulation.periods === 5 ? 5 : 3,
        startsAt: comp.date,
        a: toParsedFighter(a),
        b: toParsedFighter(b),
      };
    })
    .sort((x, y) => x.order - y.order);
}

function subtitleOf(name: string): string | null {
  const idx = name.indexOf(': ');
  return idx === -1 ? null : name.slice(idx + 2);
}

/** docs/DATA_SOURCES.md §3. Numbered detection matches `shortName`, never `name`. */
function kindOf(shortName: string): EventKind | 'skip' {
  if (parseEventNumber(shortName) !== null) return 'numbered';
  if (shortName.startsWith(CONTENDER_SERIES_PREFIX)) return 'skip';
  if (shortName === 'UFC Fight Night') return 'fightnight';
  return 'special';
}

/** Upcoming UFC events from a `site/scoreboard` response, skipping Contender Series entirely. */
export function parseEvents(json: EspnScoreboard): ParsedEvent[] {
  const out: ParsedEvent[] = [];
  for (const event of json.events ?? []) {
    const kind = kindOf(event.shortName);
    if (kind === 'skip') continue;
    const bouts = parseMainCard(event);
    const venue = event.venues?.[0];
    out.push({
      espnId: event.id,
      name: event.name,
      subtitle: subtitleOf(event.name),
      number: parseEventNumber(event.shortName),
      kind,
      startsAt: event.date,
      lockAt: bouts[0]?.startsAt ?? event.date,
      venue: venue ? `${venue.fullName}, ${venue.address.city}${venue.address.state ? `, ${venue.address.state}` : ''}` : null,
      bouts,
    });
  }
  return out;
}

// docs/DATA_SOURCES.md §4, validated on 389 completed bouts.
const RESULT_TABLE: Record<string, { method: ResultMethod; mode: 'competitor' | 'draw' | 'nc' }> = {
  kotko: { method: 'KO', mode: 'competitor' },
  'decision---unanimous': { method: 'DEC', mode: 'competitor' },
  submission: { method: 'SUB', mode: 'competitor' },
  'decision---split': { method: 'DEC', mode: 'competitor' },
  'decision---majority': { method: 'DEC', mode: 'competitor' },
  draw: { method: 'DEC', mode: 'draw' },
  'no-contest': { method: 'OTHER', mode: 'nc' },
  dq: { method: 'DQ', mode: 'competitor' },
};

/**
 * `status` is `core/events/{id}/competitions/{id}/status`; `competitors` is that same
 * competition's `competitors[]` (for their `order`/`winner` flags — status has no winner info).
 * Returns null when the bout hasn't finished (`status.result` absent).
 */
export function parseResult(
  status: EspnStatus,
  competitors: { order: number; winner?: boolean }[],
): ParsedResult | null {
  const result = status.result;
  if (!result || !result.name) return null;
  const round = status.period ?? null;
  const time = status.displayClock ?? null;
  const entry = RESULT_TABLE[result.name];
  if (!entry) {
    console.warn(`[espn] unmapped result "${result.name}" (id ${result.id})`);
    return { winner: 'nc', method: 'OTHER', round, time };
  }
  if (entry.mode === 'draw') return { winner: 'draw', method: entry.method, round, time };
  if (entry.mode === 'nc') return { winner: 'nc', method: entry.method, round, time };
  const winning = competitors.find((c) => c.winner);
  const winner: Winner = winning ? (winning.order === 1 ? 'A' : 'B') : 'nc';
  return { winner, method: entry.method, round, time };
}
