import type { BoutResult, ResultMethod, Winner } from '../types.ts';
import type { EventPatch, LifecycleBout, LifecycleEvent, Millis, Plan } from './types.ts';

// Applies finished bouts to the card. Pure: it takes results that have *already* been parsed, so
// `shared/` never imports from `jobs/` (docs/tasks/T09) — `jobs/lib/espn.ts` owns `parseResult`.

/** What `parseResult` returns, plus the first-blood field ESPN doesn't carry (admins set it in T18). */
export interface ParsedBoutResult {
  winner: Winner;
  method: ResultMethod;
  round: number | null;
  time: string | null;
  firstBlood?: 'A' | 'B' | 'none' | null;
}

export type ResultSkipReason = 'unknown-bout' | 'cancelled' | 'manual' | 'unchanged';

export interface ResultWrite {
  boutId: string;
  status: 'final';
  result: BoutResult<Millis>;
}

export interface ResultsPlan extends Plan {
  reason: 'not-in-play' | null;
  bouts: ResultWrite[];
  skipped: { boutId: string; reason: ResultSkipReason }[];
  event: EventPatch;
}

/** `updatedAt` is deliberately excluded: re-posting the same outcome must not count as a change. */
function sameResult(current: BoutResult<Millis>, next: BoutResult<Millis>): boolean {
  return (
    current.winner === next.winner &&
    current.method === next.method &&
    current.round === next.round &&
    current.time === next.time &&
    current.firstBlood === next.firstBlood &&
    current.source === next.source
  );
}

/**
 * Writes newly finished bouts and moves the event `locked → live` on the first one.
 *
 * A result entered by an admin (`source: 'manual'`) always wins — it is the override for a bout ESPN
 * gets wrong, so an automated run must never overwrite it. First blood survives too: ESPN has no such
 * field, so an incoming result with no `firstBlood` keeps whatever is already on the bout.
 */
export function planResults(
  event: LifecycleEvent,
  bouts: Record<string, LifecycleBout>,
  results: Record<string, ParsedBoutResult>,
  now: Millis,
): ResultsPlan {
  if (event.status !== 'locked' && event.status !== 'live') {
    return { applies: false, reason: 'not-in-play', bouts: [], skipped: [], event: {} };
  }

  const writes: ResultWrite[] = [];
  const skipped: { boutId: string; reason: ResultSkipReason }[] = [];

  for (const boutId of Object.keys(results).sort()) {
    const incoming = results[boutId]!;
    const bout = bouts[boutId];
    if (!bout) {
      skipped.push({ boutId, reason: 'unknown-bout' });
      continue;
    }
    if (bout.status === 'cancelled') {
      skipped.push({ boutId, reason: 'cancelled' });
      continue;
    }
    if (bout.result?.source === 'manual') {
      skipped.push({ boutId, reason: 'manual' });
      continue;
    }

    const next: BoutResult<Millis> = {
      winner: incoming.winner,
      method: incoming.method,
      round: incoming.round,
      time: incoming.time,
      firstBlood: incoming.firstBlood ?? bout.result?.firstBlood ?? null,
      source: 'espn',
      updatedAt: now,
    };
    if (bout.status === 'final' && bout.result && sameResult(bout.result, next)) {
      skipped.push({ boutId, reason: 'unchanged' });
      continue;
    }
    writes.push({ boutId, status: 'final', result: next });
  }

  const goesLive = event.status === 'locked' && writes.length > 0;
  return {
    applies: writes.length > 0,
    reason: null,
    bouts: writes,
    skipped,
    event: goesLive ? { status: 'live' } : {},
  };
}
