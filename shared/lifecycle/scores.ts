import { DEFAULTS } from '../constants.ts';
import { rankEntries, scoreEntry } from '../scoring.ts';
import type { Ranked, ScoredEntry } from '../scoring.ts';
import type { AppDefaults, EntryScore, Pick } from '../types.ts';
import type { LifecycleBout, LifecycleEntry, LifecycleEvent, Plan } from './types.ts';

// docs/GAME_RULES.md §4–§5, re-run every time a result lands. Pure.

/** A scored entry carrying what `shared/standings.ts` needs, so a ranked one satisfies `StandingsEntry`. */
export interface ScoredLifecycleEntry extends ScoredEntry {
  displayName: string;
  picks: Record<string, Pick>;
}

export interface ScoreWrite {
  uid: string;
  score: EntryScore;
  rank: number;
}

export interface ScoresPlan extends Plan {
  reason: 'not-in-play' | 'no-entries' | null;
  /** Only the entries whose stored score or rank is now wrong. */
  entries: ScoreWrite[];
  /** Everyone in the running, ranked — what `planFinalize` and the live leaderboard read. */
  ranked: Ranked<ScoredLifecycleEntry>[];
}

/** An entry is in the running unless it was voided at lock. */
export function isLive(entry: LifecycleEntry): boolean {
  return entry.status !== 'void';
}

/** An entry shares the pot only if the buy-in was actually taken (docs/GAME_RULES.md §6). */
export function isPaid(entry: LifecycleEntry): boolean {
  return entry.charged && entry.status !== 'void';
}

/** Scores `entries` against the card as it stands and ranks them (docs/GAME_RULES.md §5). */
export function scoreAndRank(
  event: LifecycleEvent,
  bouts: Record<string, LifecycleBout>,
  entries: readonly LifecycleEntry[],
  cfg: AppDefaults = DEFAULTS,
): Ranked<ScoredLifecycleEntry>[] {
  const rules = { budget: event.budget, firstBloodEnabled: event.firstBloodEnabled };
  return rankEntries(
    entries.map((entry) => ({
      uid: entry.uid,
      displayName: entry.displayName,
      picks: entry.picks,
      submittedAt: entry.submittedAt,
      score: scoreEntry(entry, bouts, rules, cfg),
    })),
  );
}

function sameScore(current: EntryScore | null, next: EntryScore): boolean {
  if (!current) {
    return false;
  }
  if (
    current.total !== next.total ||
    current.firstBlood !== next.firstBlood ||
    current.correctWinners !== next.correctWinners ||
    current.correctMethods !== next.correctMethods
  ) {
    return false;
  }
  const keys = new Set([...Object.keys(current.byBout), ...Object.keys(next.byBout)]);
  for (const key of keys) {
    const a = current.byBout[key] ?? null;
    const b = next.byBout[key] ?? null;
    if (a === null || b === null) {
      if (a !== b) {
        return false;
      }
      continue;
    }
    if (a.base !== b.base || a.method !== b.method || a.lock !== b.lock || a.total !== b.total) {
      return false;
    }
  }
  return true;
}

/**
 * Recomputes every live entry's score and rank. Only entries whose stored values actually moved are
 * returned, so a run over an unchanged card writes nothing.
 */
export function planScores(
  event: LifecycleEvent,
  bouts: Record<string, LifecycleBout>,
  entries: readonly LifecycleEntry[],
  cfg: AppDefaults = DEFAULTS,
): ScoresPlan {
  if (event.status !== 'locked' && event.status !== 'live') {
    return { applies: false, reason: 'not-in-play', entries: [], ranked: [] };
  }

  const live = entries.filter(isLive);
  if (live.length === 0) {
    return { applies: false, reason: 'no-entries', entries: [], ranked: [] };
  }

  const ranked = scoreAndRank(event, bouts, live, cfg);
  const stored = new Map(live.map((entry) => [entry.uid, entry]));
  const writes: ScoreWrite[] = [];
  for (const entry of ranked) {
    const current = stored.get(entry.uid)!;
    if (current.rank === entry.rank && sameScore(current.score, entry.score)) {
      continue;
    }
    writes.push({ uid: entry.uid, score: entry.score, rank: entry.rank });
  }

  return { applies: writes.length > 0, reason: null, entries: writes, ranked };
}
