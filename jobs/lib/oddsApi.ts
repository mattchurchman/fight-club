// Moneyline odds parsing (docs/DATA_SOURCES.md §6). Source: ESPN core API, matched by athlete id —
// rescoped from The Odds API per docs/DECISIONS.md (2026-09-29 "Odds come from ESPN, not The Odds API").
// The Odds API (§7) stays a documented, unimplemented fallback: no key was ever available to capture
// a fixture or confirm its response shape, so implementing it now would be guessing.
import { fighterId as toFighterId, median } from '@shared/index.ts';
import { fetchJson } from './espn.ts';

const CORE = 'https://sports.core.api.espn.com/v2/sports/mma/leagues/ufc';

export interface EspnAthleteOdds {
  moneyLine?: number;
  athlete?: { $ref: string };
}

export interface EspnOddsItem {
  provider?: { id: string; priority?: number };
  homeAthleteOdds?: EspnAthleteOdds;
  awayAthleteOdds?: EspnAthleteOdds;
}

export interface EspnOddsResponse {
  count?: number;
  items?: EspnOddsItem[];
}

/** `core/events/{eventId}/competitions/{competitionId}/odds` (docs/DATA_SOURCES.md §6). */
export async function fetchBoutOdds(eventEspnId: string, competitionEspnId: string): Promise<EspnOddsResponse> {
  return fetchJson<EspnOddsResponse>(`${CORE}/events/${eventEspnId}/competitions/${competitionEspnId}/odds`);
}

function athleteIdFromRef(ref: string): string | null {
  const match = /athletes\/(\d+)/.exec(ref);
  return match ? match[1]! : null;
}

export interface ParsedBoutOdds {
  a: number | null;
  b: number | null;
}

/**
 * Pure. Matches by athlete id (never by name or home/away position — DATA_SOURCES.md §6: "home was
 * the order:1 competitor... but don't rely on it") and takes the median price per fighter across
 * every item, tolerating more than one bookmaker even though only DraftKings has been observed.
 * Returns null when neither fighter's id appears in any item: either odds aren't posted yet for this
 * bout (§6 — normal outside fight week) or the response belongs to a different bout. The caller treats
 * both cases the same way — leave the bout's existing odds untouched.
 */
export function parseBoutOdds(res: EspnOddsResponse, aFighterId: string, bFighterId: string): ParsedBoutOdds | null {
  const pricesA: number[] = [];
  const pricesB: number[] = [];
  for (const item of res.items ?? []) {
    for (const side of [item.homeAthleteOdds, item.awayAthleteOdds]) {
      if (!side?.athlete?.$ref || side.moneyLine === undefined) continue;
      const athleteId = athleteIdFromRef(side.athlete.$ref);
      if (athleteId === null) continue;
      const fid = toFighterId(athleteId);
      if (fid === aFighterId) pricesA.push(side.moneyLine);
      else if (fid === bFighterId) pricesB.push(side.moneyLine);
    }
  }
  if (pricesA.length === 0 && pricesB.length === 0) return null;
  return { a: pricesA.length ? median(pricesA) : null, b: pricesB.length ? median(pricesB) : null };
}
