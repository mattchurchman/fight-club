import { describe, expect, it } from 'vitest';
import { currentSeasonStats } from './seasonStats.ts';
import type { EventHistoryRow } from './hooks.ts';

function row(partial: Partial<EventHistoryRow>): EventHistoryRow {
  return {
    eventId: 'e',
    name: 'Event',
    startsAtMs: 0,
    seasonId: '2026',
    rank: 5,
    points: 0,
    payout: 0,
    ...partial,
  };
}

describe('currentSeasonStats', () => {
  it('returns null with no history', () => {
    expect(currentSeasonStats([])).toBeNull();
  });

  it('aggregates only the most recent season, ignoring older ones', () => {
    const history = [
      row({ seasonId: '2026', rank: 1, points: 10 }),
      row({ seasonId: '2026', rank: 3, points: 4 }),
      row({ seasonId: '2025', rank: 1, points: 99 }),
    ];
    expect(currentSeasonStats(history)).toEqual({ points: 14, events: 2, wins: 1, podiums: 2 });
  });

  it('counts ranks 1-3 as podiums and only rank 1 as a win', () => {
    const history = [
      row({ seasonId: '2026', rank: 2, points: 1 }),
      row({ seasonId: '2026', rank: 4, points: 1 }),
    ];
    expect(currentSeasonStats(history)).toEqual({ points: 2, events: 2, wins: 0, podiums: 1 });
  });
});
