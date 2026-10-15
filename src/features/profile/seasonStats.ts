// Pure "this season" aggregation from event history rows (docs/tasks/T41).
import type { EventHistoryRow } from './hooks.ts';

export interface SeasonStats {
  points: number;
  events: number;
  wins: number;
  podiums: number;
}

/** Aggregates `history` down to its most recent season (history is newest-first). `null` when the
 * player has no scored events at all. */
export function currentSeasonStats(history: readonly EventHistoryRow[]): SeasonStats | null {
  if (history.length === 0) return null;
  const latestSeasonId = history[0]!.seasonId;
  const rows = history.filter((row) => row.seasonId === latestSeasonId);

  return {
    points: rows.reduce((sum, row) => sum + row.points, 0),
    events: rows.length,
    wins: rows.filter((row) => row.rank === 1).length,
    podiums: rows.filter((row) => row.rank <= 3).length,
  };
}
