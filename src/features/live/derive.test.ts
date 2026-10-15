import { describe, expect, it } from 'vitest';
import type { Bout, BoutResult, EntryScore, EventRules, Pick } from '@shared/index.ts';
import { DEFAULTS, scoreEntry } from '@shared/index.ts';
import {
  currentBout,
  fightOrder,
  projectOutcome,
  rankMoves,
  resultsFeed,
  swingLines,
} from './derive.ts';
import type { LiveEntryLike } from './derive.ts';

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
    odds: { a: 100, b: 100, source: 'espn', updatedAt: 0, frozen: true },
    status: 'scheduled',
    result: null,
    ...over,
  };
}

function pick(over: Partial<Pick> = {}): Pick {
  return { winner: 'A', method: 'DEC', stake: 100, ...over };
}

function score(over: Partial<EntryScore> = {}): EntryScore {
  return { total: 0, byBout: {}, firstBlood: 0, correctWinners: 0, correctMethods: 0, ...over };
}

function entry(uid: string, over: Partial<LiveEntryLike> = {}): LiveEntryLike {
  return { uid, picks: {}, lockBoutId: null, firstBlood: null, score: score(), ...over };
}

const EVENT: EventRules = { budget: DEFAULTS.budget, firstBloodEnabled: false };

describe('fightOrder', () => {
  it('sorts main-card bouts descending by order, main event last', () => {
    const bouts = { main: bout({ order: 1 }), co: bout({ order: 2 }), three: bout({ order: 3 }) };
    expect(fightOrder(bouts)).toEqual(['three', 'co', 'main']);
  });

  it('includes a cancelled bout but excludes a prelim', () => {
    const bouts = {
      main: bout({ order: 1 }),
      cancelled: bout({ order: 2, status: 'cancelled' }),
      prelim: bout({ order: 3, isMainCard: false }),
    };
    expect(fightOrder(bouts)).toEqual(['cancelled', 'main']);
  });
});

describe('currentBout', () => {
  it('is the first unresolved, non-cancelled bout in fight order', () => {
    const bouts = {
      main: bout({ order: 1, status: 'scheduled', result: null }),
      co: bout({ order: 2, status: 'final', result: result() }),
      three: bout({ order: 3, status: 'final', result: result() }),
    };
    expect(currentBout(bouts)).toBe('main');
  });

  it('skips a cancelled bout even without a result', () => {
    const bouts = {
      main: bout({ order: 1, status: 'scheduled', result: null }),
      co: bout({ order: 2, status: 'cancelled', result: null }),
    };
    expect(currentBout(bouts)).toBe('main');
  });

  it('prefers a bout an admin marked live over fight order', () => {
    const bouts = {
      main: bout({ order: 1, status: 'scheduled', result: null }),
      co: bout({ order: 2, status: 'live', result: null }),
    };
    expect(currentBout(bouts)).toBe('co');
  });

  it('returns null once every main-card bout has a result', () => {
    const bouts = { main: bout({ order: 1, status: 'final', result: result() }) };
    expect(currentBout(bouts)).toBeNull();
  });
});

describe('projectOutcome', () => {
  it('matches scoreEntry when the hypothetical equals a real result scored as method OTHER', () => {
    const bouts = { main: bout({ status: 'final', result: result({ winner: 'A', method: 'OTHER' }) }) };
    const entries: LiveEntryLike[] = [
      entry('a', { picks: { main: pick({ winner: 'A', stake: 100 }) } }),
      entry('b', { picks: { main: pick({ winner: 'B', stake: 100 }) } }),
    ];

    const projected = projectOutcome(entries, bouts, 'main', 'A', EVENT);
    expect(projected.find((p) => p.uid === 'a')?.total).toBe(scoreEntry(entries[0]!, bouts, EVENT).total);
    expect(projected.find((p) => p.uid === 'b')?.total).toBe(scoreEntry(entries[1]!, bouts, EVENT).total);
  });

  it('does not mutate the bouts passed in', () => {
    const bouts = { main: bout({ status: 'scheduled', result: null }) };
    const entries: LiveEntryLike[] = [entry('a', { picks: { main: pick() } })];
    projectOutcome(entries, bouts, 'main', 'B', EVENT);
    expect(bouts.main.result).toBeNull();
  });

  it('shares rank between tied projected totals, skipping the rank it swallowed', () => {
    const bouts = { main: bout({ status: 'scheduled', result: null }) };
    const entries: LiveEntryLike[] = [
      entry('a', { picks: { main: pick({ winner: 'A', stake: 100 }) } }),
      entry('b', { picks: { main: pick({ winner: 'A', stake: 100 }) } }),
      entry('c', { picks: { main: pick({ winner: 'B', stake: 100 }) } }),
    ];
    const projected = projectOutcome(entries, bouts, 'main', 'A', EVENT);
    expect(projected.map((p) => p.rank)).toEqual([1, 1, 3]);
  });
});

describe('swingLines', () => {
  const b0 = bout({ order: 2, status: 'final', result: result({ winner: 'A', method: 'DEC' }) });
  const main = bout({ order: 1, status: 'scheduled', result: null });
  const bouts = { b0, main };

  const entries: LiveEntryLike[] = [
    entry('self', {
      picks: { b0: pick({ winner: 'A', stake: 100 }), main: pick({ winner: 'A', stake: 100 }) },
      lockBoutId: 'main',
      score: score({ total: 250 }),
    }),
    entry('other', {
      picks: { b0: pick({ winner: 'B', stake: 100 }), main: pick({ winner: 'B', stake: 300 }) },
      lockBoutId: null,
      score: score({ total: 0 }),
    }),
  ];
  const names = { self: 'Self', other: 'Other' };

  it("doubles the viewer's lock when their side wins, and keeps them the sole leader", () => {
    const [sideA] = swingLines(entries, bouts, 'main', 'self', names, EVENT);
    expect(sideA?.fighterName).toBe('Fighter A');
    expect(sideA?.self).toEqual({ rank: 1, delta: 400 });
    expect(sideA?.newLeader).toBeNull();
  });

  it('applies the lock penalty and hands the lead to whoever is now ahead', () => {
    const [, sideB] = swingLines(entries, bouts, 'main', 'self', names, EVENT);
    expect(sideB?.fighterName).toBe('Fighter B');
    expect(sideB?.self).toEqual({ rank: 2, delta: -50 });
    expect(sideB?.newLeader).toEqual({ uid: 'other', name: 'Other' });
  });

  it('has no self line for a spectator', () => {
    const [sideA] = swingLines(entries, bouts, 'main', null, names, EVENT);
    expect(sideA?.self).toBeNull();
  });

  it('has no self line for a viewer with no entry', () => {
    const [sideA] = swingLines(entries, bouts, 'main', 'nobody', names, EVENT);
    expect(sideA?.self).toBeNull();
  });
});

describe('rankMoves', () => {
  it('reports positive deltas for uids that moved up, negative for down', () => {
    expect(rankMoves({ a: 3, b: 1, c: 2 }, { a: 1, b: 3, c: 2 })).toEqual({ a: 2, b: -2 });
  });

  it('omits a uid with no previous rank to compare against', () => {
    expect(rankMoves({ a: 1 }, { a: 1, b: 2 })).toEqual({});
  });
});

describe('resultsFeed', () => {
  it('lists finished bouts most recently fought first, skipping cancelled and pending', () => {
    const bouts = {
      main: bout({ order: 1, status: 'final', result: result({ winner: 'B', method: 'SUB', round: 2 }) }),
      co: bout({ order: 2, status: 'final', result: result({ winner: 'A', method: 'KO', round: 1 }) }),
      skipped: bout({ order: 3, status: 'cancelled', result: null }),
      opener: bout({ order: 4, status: 'scheduled', result: null }),
    };
    const entries: LiveEntryLike[] = [
      entry('self', {
        picks: { main: pick({ winner: 'B' }), co: pick({ winner: 'A' }) },
        score: score({
          byBout: {
            main: { base: 0, method: 0, lock: 0, total: 0 },
            co: { base: 200, method: 150, lock: 0, total: 350 },
          },
        }),
      }),
      entry('other', { picks: { main: pick({ winner: 'A' }), co: pick({ winner: 'A' }) } }),
    ];

    const rows = resultsFeed(bouts, entries, 'self');

    expect(rows.map((r) => r.boutId)).toEqual(['main', 'co']);
    expect(rows[0]).toEqual({
      boutId: 'main',
      winnerName: 'Fighter B',
      loserName: 'Fighter A',
      method: 'SUB',
      round: 2,
      pickedWinner: 1,
      total: 2,
      selfDelta: 0,
    });
    expect(rows[1]).toEqual({
      boutId: 'co',
      winnerName: 'Fighter A',
      loserName: 'Fighter B',
      method: 'KO',
      round: 1,
      pickedWinner: 2,
      total: 2,
      selfDelta: 350,
    });
  });

  it('labels a draw with no picked-winner count and no loser', () => {
    const bouts = { main: bout({ status: 'final', result: result({ winner: 'draw' }) }) };
    const rows = resultsFeed(bouts, [entry('self', { picks: { main: pick() } })], 'self');
    expect(rows[0]).toMatchObject({ winnerName: 'Draw', loserName: null, pickedWinner: 0 });
  });

  it('labels a no contest', () => {
    const bouts = { main: bout({ status: 'final', result: result({ winner: 'nc' }) }) };
    const rows = resultsFeed(bouts, [entry('self')], 'self');
    expect(rows[0]).toMatchObject({ winnerName: 'No Contest', loserName: null, pickedWinner: 0 });
  });

  it('returns null selfDelta for a spectator with no entry', () => {
    const bouts = { main: bout({ status: 'final', result: result() }) };
    expect(resultsFeed(bouts, [], 'ghost')[0]?.selfDelta).toBeNull();
  });
});
