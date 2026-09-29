import { NUMBERED_EVENT_RE } from './constants.ts';

export function eventId(espnId: string): string {
  return `evt_${espnId}`;
}

export function boutId(espnId: string): string {
  return `bout_${espnId}`;
}

export function fighterId(espnId: string): string {
  return `ftr_${espnId}`;
}

/** docs/DATA_MODEL.md: `h2h/{uidA__uidB}` with uids sorted, so the id is order-independent. */
export function h2hId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('__');
}

/** Matches NUMBERED_EVENT_RE against `shortName` (see docs/DATA_SOURCES.md §3); null when it doesn't apply. */
export function parseEventNumber(shortName: string): number | null {
  const match = NUMBERED_EVENT_RE.exec(shortName);
  return match ? Number(match[1]!) : null;
}
