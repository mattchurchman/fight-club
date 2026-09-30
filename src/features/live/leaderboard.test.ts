import { describe, expect, it } from 'vitest';
import type { EntryScore } from '@shared/index.ts';
import { buildLeaderboard } from './leaderboard.ts';
import type { LeaderboardEntryLike } from './leaderboard.ts';

function score(overrides: Partial<EntryScore> = {}): EntryScore {
  return { total: 0, byBout: {}, firstBlood: 0, correctWinners: 0, correctMethods: 0, ...overrides };
}

function entry(uid: string, overrides: Partial<LeaderboardEntryLike> = {}): LeaderboardEntryLike {
  return { uid, displayName: uid, photoURL: null, status: 'submitted', picks: {}, score: null, ...overrides };
}

describe('buildLeaderboard', () => {
  it('orders by total points, highest first', () => {
    const rows = buildLeaderboard([
      entry('low', { score: score({ total: 50 }) }),
      entry('high', { score: score({ total: 200 }) }),
      entry('mid', { score: score({ total: 100 }) }),
    ]);
    expect(rows.map((r) => r.uid)).toEqual(['high', 'mid', 'low']);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('shares rank between ties on every tiebreaker, per shared/scoring.ts', () => {
    const rows = buildLeaderboard([
      entry('a', { score: score({ total: 100, correctWinners: 3 }) }),
      entry('b', { score: score({ total: 100, correctWinners: 3 }) }),
      entry('c', { score: score({ total: 50 }) }),
    ]);
    expect(rows.map((r) => ({ uid: r.uid, rank: r.rank }))).toEqual([
      { uid: 'a', rank: 1 },
      { uid: 'b', rank: 1 },
      { uid: 'c', rank: 3 },
    ]);
  });

  it('treats an unscored entry (no results yet) as tied at zero', () => {
    const rows = buildLeaderboard([entry('a', { score: null }), entry('b', { score: null })]);
    expect(rows.map((r) => r.rank)).toEqual([1, 1]);
    expect(rows.every((r) => r.score.total === 0)).toBe(true);
  });

  it('drops void entries', () => {
    const rows = buildLeaderboard([
      entry('a', { status: 'void', score: score({ total: 999 }) }),
      entry('b', { score: score({ total: 10 }) }),
    ]);
    expect(rows.map((r) => r.uid)).toEqual(['b']);
  });
});
