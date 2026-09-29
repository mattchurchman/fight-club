import { describe, expect, it } from 'vitest';
import { applyEventToStandings, countUpsets, h2hDeltas } from './standings';
import type { SeasonTotals, StandingsEntry } from './standings';
import type { Bout, BoutResult, EntryScore, Pick } from './types';

type TestBout = Bout<number>;

function result(over: Partial<BoutResult<number>> = {}): BoutResult<number> {
  return {
    winner: 'A',
    method: 'DEC',
    round: 3,
    time: '5:00',
    firstBlood: null,
    source: 'espn',
    updatedAt: 0,
    ...over,
  };
}

function bout(over: Partial<TestBout> = {}): TestBout {
  return {
    order: 1,
    weightClass: 'Lightweight',
    rounds: 3,
    isMainEvent: false,
    isMainCard: true,
    a: { fighterId: 'ftr_a', name: 'Fighter A', record: '10-0-0', headshotUrl: null },
    b: { fighterId: 'ftr_b', name: 'Fighter B', record: '9-1-0', headshotUrl: null },
    odds: { a: -110, b: -110, source: 'espn', updatedAt: 0, frozen: true },
    status: 'final',
    result: result(),
    ...over,
  };
}

function score(over: Partial<EntryScore> = {}): EntryScore {
  return { total: 0, byBout: {}, firstBlood: 0, correctWinners: 0, correctMethods: 0, ...over };
}

function entry(uid: string, rank: number, over: Partial<StandingsEntry> = {}): StandingsEntry {
  return {
    uid,
    displayName: uid.toUpperCase(),
    rank,
    score: score({ total: 1000 - rank * 10, correctWinners: 3 }),
    picks: {},
    ...over,
  };
}

function totals(uid: string, over: Partial<SeasonTotals> = {}): SeasonTotals {
  return {
    uid,
    displayName: uid.toUpperCase(),
    points: 0,
    events: 0,
    wins: 0,
    podiums: 0,
    netTokens: 0,
    correctWinners: 0,
    upsets: 0,
    ...over,
  };
}

const pick = (over: Partial<Pick> = {}): Pick => ({
  winner: 'A',
  method: 'DEC',
  stake: 100,
  ...over,
});

describe('countUpsets', () => {
  const longshot = { a: 250, b: -400, source: 'espn' as const, updatedAt: 0, frozen: true };

  it('counts a correct pick priced at +200 or longer', () => {
    expect(countUpsets({ b1: pick() }, { b1: bout({ odds: longshot }) })).toBe(1);
    const exactly = { ...longshot, a: 200 };
    expect(countUpsets({ b1: pick() }, { b1: bout({ odds: exactly }) })).toBe(1);
  });

  it('ignores a shorter price', () => {
    expect(countUpsets({ b1: pick() }, { b1: bout({ odds: { ...longshot, a: 175 } }) })).toBe(0);
  });

  it('ignores a longshot that lost, or a bout that was cancelled or is unresolved', () => {
    const wrong = bout({ odds: longshot, result: result({ winner: 'B' }) });
    expect(countUpsets({ b1: pick() }, { b1: wrong })).toBe(0);
    expect(countUpsets({ b1: pick() }, { b1: bout({ odds: longshot, status: 'cancelled' }) })).toBe(
      0,
    );
    expect(countUpsets({ b1: pick() }, { b1: bout({ odds: longshot, result: null }) })).toBe(0);
  });

  it('reads the B-corner price when B is picked, and treats a missing price as even money', () => {
    const b = bout({
      odds: { a: -400, b: 250, source: 'espn', updatedAt: 0, frozen: true },
      result: result({ winner: 'B' }),
    });
    expect(countUpsets({ b1: pick({ winner: 'B' }) }, { b1: b })).toBe(1);
    const noPrice = bout({
      odds: { a: null, b: null, source: 'default', updatedAt: 0, frozen: true },
    });
    expect(countUpsets({ b1: pick() }, { b1: noPrice })).toBe(0);
  });

  it('ignores picks on bouts that are gone', () => {
    expect(countUpsets({ b9: pick() }, { b1: bout({ odds: longshot }) })).toBe(0);
  });
});

describe('h2hDeltas', () => {
  it('records a win for the higher score, keyed with the uids sorted', () => {
    expect(h2hDeltas([entry('zoe', 2), entry('abe', 1)])).toEqual([
      { a: 'abe', b: 'zoe', aWins: 1, bWins: 0, ties: 0 },
    ]);
  });

  it('records a win for b when b scored higher', () => {
    const deltas = h2hDeltas([entry('abe', 2), entry('zoe', 1)]);
    expect(deltas).toEqual([{ a: 'abe', b: 'zoe', aWins: 0, bWins: 1, ties: 0 }]);
  });

  it('records a tie on equal totals', () => {
    const tied = [entry('abe', 1), entry('zoe', 1)];
    expect(h2hDeltas(tied)).toEqual([{ a: 'abe', b: 'zoe', aWins: 0, bWins: 0, ties: 1 }]);
  });

  it('covers every pair exactly once', () => {
    const deltas = h2hDeltas([entry('a', 1), entry('b', 2), entry('c', 3), entry('d', 4)]);
    expect(deltas).toHaveLength(6);
    expect(new Set(deltas.map((d) => `${d.a}__${d.b}`)).size).toBe(6);
  });

  it('has nothing to say about fewer than two entrants', () => {
    expect(h2hDeltas([])).toEqual([]);
    expect(h2hDeltas([entry('a', 1)])).toEqual([]);
  });
});

describe('applyEventToStandings', () => {
  const bouts = {
    b1: bout({ odds: { a: 250, b: -400, source: 'espn', updatedAt: 0, frozen: true } }),
  };

  it('adds a first-time entrant', () => {
    const { standings } = applyEventToStandings(
      [],
      [entry('abe', 1, { score: score({ total: 900, correctWinners: 4 }), picks: { b1: pick() } })],
      [{ uid: 'abe', amount: 500 }],
      100,
      bouts,
    );
    expect(standings).toEqual([
      totals('abe', {
        points: 900,
        events: 1,
        wins: 1,
        podiums: 1,
        netTokens: 400,
        correctWinners: 4,
        upsets: 1,
      }),
    ]);
  });

  it('accumulates onto an existing row', () => {
    const prev = [
      totals('abe', {
        points: 100,
        events: 2,
        wins: 1,
        podiums: 2,
        netTokens: -50,
        correctWinners: 5,
        upsets: 1,
      }),
    ];
    const { standings } = applyEventToStandings(
      prev,
      [entry('abe', 3, { score: score({ total: 200, correctWinners: 2 }) })],
      [{ uid: 'abe', amount: 10 }],
      100,
      bouts,
    );
    expect(standings[0]).toEqual(
      totals('abe', {
        points: 300,
        events: 3,
        wins: 1,
        podiums: 3,
        netTokens: -140,
        correctWinners: 7,
        upsets: 1,
      }),
    );
  });

  it('does not mutate the rows it was given', () => {
    const prev = [totals('abe', { points: 100, events: 1 })];
    applyEventToStandings(prev, [entry('abe', 1)], [], 100, bouts);
    expect(prev[0]?.points).toBe(100);
  });

  it('counts a podium but not a win for 2nd and 3rd, and neither for 4th', () => {
    const { standings } = applyEventToStandings(
      [],
      [entry('a', 1), entry('b', 2), entry('c', 3), entry('d', 4)],
      [],
      100,
      bouts,
    );
    expect(standings.map((row) => [row.wins, row.podiums])).toEqual([
      [1, 1],
      [0, 1],
      [0, 1],
      [0, 0],
    ]);
  });

  it('counts every player in a shared 1st place as a win', () => {
    const { standings } = applyEventToStandings([], [entry('a', 1), entry('b', 1)], [], 100, bouts);
    expect(standings.every((row) => row.wins === 1)).toBe(true);
  });

  it('charges the buy-in even when nothing was won', () => {
    const { standings } = applyEventToStandings([], [entry('a', 9)], [], 100, bouts);
    expect(standings[0]?.netTokens).toBe(-100);
  });

  it('refreshes a display name that changed', () => {
    const prev = [totals('abe', { displayName: 'Old Name' })];
    const { standings } = applyEventToStandings(
      prev,
      [entry('abe', 1, { displayName: 'New Name' })],
      [],
      100,
      bouts,
    );
    expect(standings[0]?.displayName).toBe('New Name');
  });

  it('leaves players who sat the event out untouched', () => {
    const prev = [
      totals('abe', { points: 500, events: 4 }),
      totals('zoe', { points: 10, events: 1 }),
    ];
    const { standings } = applyEventToStandings(prev, [entry('zoe', 1)], [], 100, bouts);
    expect(standings[0]).toEqual(prev[0]);
    expect(standings[1]?.events).toBe(2);
  });

  it('returns the h2h deltas alongside the standings', () => {
    const { h2h } = applyEventToStandings([], [entry('abe', 1), entry('zoe', 2)], [], 100, bouts);
    expect(h2h).toEqual([{ a: 'abe', b: 'zoe', aWins: 1, bWins: 0, ties: 0 }]);
  });

  it('handles an event nobody entered', () => {
    expect(applyEventToStandings([], [], [], 100, bouts)).toEqual({ standings: [], h2h: [] });
  });
});
