import { describe, expect, it } from 'vitest';
import { DEFAULTS } from './constants';
import { rankEntries, scoreBout, scoreEntry, scoreFirstBlood } from './scoring';
import type { ScoredEntry } from './scoring';
import type { EntryDraft, EventRules } from './validation';
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

function pick(over: Partial<Pick> = {}): Pick {
  return { winner: 'A', method: 'DEC', stake: 100, ...over };
}

const EVENT: EventRules = { budget: DEFAULTS.budget, firstBloodEnabled: false };

function score(over: Partial<EntryScore> = {}): EntryScore {
  return { total: 0, byBout: {}, firstBlood: 0, correctWinners: 0, correctMethods: 0, ...over };
}

describe('scoreBout — worked examples from GAME_RULES §7', () => {
  it('E1: stake 200 on +150, winner correct, SUB correct, not the lock → 700', () => {
    const b = bout({
      odds: { a: 150, b: -180, source: 'espn', updatedAt: 0, frozen: true },
      result: result({ method: 'SUB' }),
    });
    expect(scoreBout(pick({ stake: 200, method: 'SUB' }), b, false)).toEqual({
      base: 500,
      method: 200,
      lock: 0,
      total: 700,
    });
  });

  it('E2: stake 200 on −200, winner correct, method wrong → 300', () => {
    const b = bout({
      odds: { a: -200, b: 170, source: 'espn', updatedAt: 0, frozen: true },
      result: result({ method: 'KO' }),
    });
    expect(scoreBout(pick({ stake: 200, method: 'DEC' }), b, false)).toEqual({
      base: 300,
      method: 0,
      lock: 0,
      total: 300,
    });
  });

  it('E3: lock doubles the base but not the method bonus → 1200', () => {
    const b = bout({
      odds: { a: 150, b: -180, source: 'espn', updatedAt: 0, frozen: true },
      result: result({ method: 'SUB' }),
    });
    expect(scoreBout(pick({ stake: 200, method: 'SUB' }), b, true)).toEqual({
      base: 500,
      method: 200,
      lock: 500,
      total: 1200,
    });
  });

  it('E4: lock on the wrong winner, stake 300 → −150', () => {
    const b = bout({ result: result({ winner: 'B' }) });
    expect(scoreBout(pick({ stake: 300 }), b, true)).toEqual({
      base: 0,
      method: 0,
      lock: -150,
      total: -150,
    });
  });

  it('E5: stake 100, draw, as the lock → 100 (push)', () => {
    const b = bout({ result: result({ winner: 'draw' }) });
    expect(scoreBout(pick({ stake: 100 }), b, true)).toEqual({
      base: 100,
      method: 0,
      lock: 0,
      total: 100,
    });
  });

  it('E6: stake 150 on −110, winner correct, KO correct → 399', () => {
    const b = bout({ result: result({ method: 'KO' }) });
    expect(scoreBout(pick({ stake: 150, method: 'KO' }), b, false)).toEqual({
      base: 286,
      method: 113,
      lock: 0,
      total: 399,
    });
  });
});

describe('scoreBout — edges', () => {
  it('returns null while the bout has no result', () => {
    expect(scoreBout(pick(), bout({ status: 'scheduled', result: null }), false)).toBeNull();
    expect(scoreBout(pick(), bout({ status: 'live', result: null }), true)).toBeNull();
  });

  it('pushes a cancelled bout, lock or not, even if a result was recorded', () => {
    const cancelled = bout({ status: 'cancelled', result: result({ winner: 'B' }) });
    expect(scoreBout(pick({ stake: 250 }), cancelled, false)).toEqual({
      base: 250,
      method: 0,
      lock: 0,
      total: 250,
    });
    expect(scoreBout(pick({ stake: 250 }), cancelled, true)).toEqual({
      base: 250,
      method: 0,
      lock: 0,
      total: 250,
    });
  });

  it('pushes a cancelled bout that never got a result', () => {
    const cancelled = bout({ status: 'cancelled', result: null });
    expect(scoreBout(pick({ stake: 50 }), cancelled, true)).toEqual({
      base: 50,
      method: 0,
      lock: 0,
      total: 50,
    });
  });

  it('pushes a no contest', () => {
    expect(
      scoreBout(pick({ stake: 175 }), bout({ result: result({ winner: 'nc' }) }), true)?.total,
    ).toBe(175);
  });

  it('never awards a method bonus for DQ or OTHER', () => {
    for (const method of ['DQ', 'OTHER'] as const) {
      const scored = scoreBout(
        pick({ stake: 200, method: 'DEC' }),
        bout({ result: result({ method }) }),
        false,
      );
      expect(scored?.method).toBe(0);
      expect(scored?.base).toBe(382);
    }
  });

  it('prices a side with no frozen odds at +100', () => {
    const b = bout({ odds: { a: null, b: null, source: 'default', updatedAt: 0, frozen: true } });
    expect(scoreBout(pick({ stake: 200 }), b, false)?.base).toBe(400);
  });

  it('reads the B-corner price when B is picked', () => {
    const b = bout({
      odds: { a: -500, b: 350, source: 'espn', updatedAt: 0, frozen: true },
      result: result({ winner: 'B' }),
    });
    expect(scoreBout(pick({ winner: 'B', stake: 100 }), b, false)?.base).toBe(450);
  });

  it('rounds the lock penalty up from a half', () => {
    const wrong = bout({ result: result({ winner: 'B' }) });
    expect(scoreBout(pick({ stake: 375 }), wrong, true)?.lock).toBe(-188);
    expect(scoreBout(pick({ stake: 350 }), wrong, true)?.lock).toBe(-175);
  });

  it('scores a wrong winner that is not the lock as a flat zero', () => {
    expect(
      scoreBout(pick({ stake: 400 }), bout({ result: result({ winner: 'B' }) }), false),
    ).toEqual({
      base: 0,
      method: 0,
      lock: 0,
      total: 0,
    });
  });

  it('honours overridden method multipliers and lock penalty', () => {
    const cfg = { ...DEFAULTS, methodMultipliers: { KO: 2, SUB: 2, DEC: 2 }, lockPenaltyPct: 1 };
    expect(scoreBout(pick({ stake: 100 }), bout(), false, cfg)?.method).toBe(200);
    expect(
      scoreBout(pick({ stake: 100 }), bout({ result: result({ winner: 'B' }) }), true, cfg)?.lock,
    ).toBe(-100);
  });
});

describe('scoreFirstBlood', () => {
  const enabled: EventRules = { ...EVENT, firstBloodEnabled: true };
  const draft = (fighter: 'A' | 'B' = 'A'): EntryDraft => ({
    picks: {},
    lockBoutId: null,
    firstBlood: { boutId: 'b1', fighter },
  });

  it('awards the bonus when the pick matches', () => {
    const bouts = { b1: bout({ result: result({ firstBlood: 'A' }) }) };
    expect(scoreFirstBlood(draft('A'), bouts, enabled)).toBe(100);
  });

  it('is independent of who won the bout', () => {
    const bouts = { b1: bout({ result: result({ winner: 'B', firstBlood: 'A' }) }) };
    expect(scoreFirstBlood(draft('A'), bouts, enabled)).toBe(100);
  });

  it('pays nothing when the pick is wrong', () => {
    const bouts = { b1: bout({ result: result({ firstBlood: 'B' }) }) };
    expect(scoreFirstBlood(draft('A'), bouts, enabled)).toBe(0);
  });

  it("voids the prop when the result is 'none'", () => {
    const bouts = { b1: bout({ result: result({ firstBlood: 'none' }) }) };
    expect(scoreFirstBlood(draft('A'), bouts, enabled)).toBe(0);
  });

  it('voids the prop when first blood was never entered', () => {
    const bouts = { b1: bout({ result: result({ firstBlood: null }) }) };
    expect(scoreFirstBlood(draft('A'), bouts, enabled)).toBe(0);
  });

  it('voids the prop when the bout has no result at all, or is off the card', () => {
    expect(scoreFirstBlood(draft('A'), { b1: bout({ result: null }) }, enabled)).toBe(0);
    expect(scoreFirstBlood(draft('A'), {}, enabled)).toBe(0);
  });

  it('pays nothing when the event has the prop disabled, or nothing was picked', () => {
    const bouts = { b1: bout({ result: result({ firstBlood: 'A' }) }) };
    expect(scoreFirstBlood(draft('A'), bouts, EVENT)).toBe(0);
    expect(scoreFirstBlood({ picks: {}, lockBoutId: null, firstBlood: null }, bouts, enabled)).toBe(
      0,
    );
  });
});

describe('scoreEntry', () => {
  const bouts: Record<string, TestBout> = {
    b1: bout({ order: 1, result: result({ method: 'KO' }) }),
    b2: bout({ order: 2, result: result({ winner: 'B' }) }),
    b3: bout({ order: 3, status: 'scheduled', result: null }),
  };

  it('sums the scored bouts and treats pending bouts as 0', () => {
    const entry: EntryDraft = {
      picks: {
        b1: pick({ stake: 150, method: 'KO' }),
        b2: pick({ stake: 300 }),
        b3: pick({ stake: 250 }),
      },
      lockBoutId: 'b1',
      firstBlood: null,
    };
    const scored = scoreEntry(entry, bouts, EVENT);
    expect(scored.byBout.b1).toEqual({ base: 286, method: 113, lock: 286, total: 685 });
    expect(scored.byBout.b2).toEqual({ base: 0, method: 0, lock: 0, total: 0 });
    expect(scored.byBout.b3).toBeNull();
    expect(scored.total).toBe(685);
    expect(scored.correctWinners).toBe(1);
    expect(scored.correctMethods).toBe(1);
  });

  it('counts a correct winner whose method missed against only the first tiebreaker', () => {
    const entry: EntryDraft = {
      picks: { b1: pick({ stake: 200, method: 'SUB' }) },
      lockBoutId: null,
      firstBlood: null,
    };
    const scored = scoreEntry(entry, { b1: bout({ result: result({ method: 'KO' }) }) }, EVENT);
    expect(scored.correctWinners).toBe(1);
    expect(scored.correctMethods).toBe(0);
    expect(scored.byBout.b1?.method).toBe(0);
  });

  it('adds the first-blood bonus to the total', () => {
    const fbBouts = { b1: bout({ result: result({ firstBlood: 'B' }) }) };
    const entry: EntryDraft = {
      picks: { b1: pick({ stake: 100 }) },
      lockBoutId: null,
      firstBlood: { boutId: 'b1', fighter: 'B' },
    };
    const scored = scoreEntry(entry, fbBouts, { ...EVENT, firstBloodEnabled: true });
    expect(scored.firstBlood).toBe(100);
    expect(scored.total).toBe(scored.byBout.b1!.total + 100);
  });

  it('can go negative when locks miss', () => {
    const allWrong = { b1: bout({ result: result({ winner: 'B' }) }) };
    const entry: EntryDraft = {
      picks: { b1: pick({ stake: 400 }) },
      lockBoutId: 'b1',
      firstBlood: null,
    };
    expect(scoreEntry(entry, allWrong, EVENT).total).toBe(-200);
  });

  it('does not count a cancelled bout as a correct winner', () => {
    const cancelled = {
      b1: bout({ status: 'cancelled', result: result({ winner: 'A', method: 'DEC' }) }),
    };
    const entry: EntryDraft = {
      picks: { b1: pick({ stake: 100 }) },
      lockBoutId: 'b1',
      firstBlood: null,
    };
    const scored = scoreEntry(entry, cancelled, EVENT);
    expect(scored.total).toBe(100);
    expect(scored.correctWinners).toBe(0);
    expect(scored.correctMethods).toBe(0);
  });

  it('ignores picks on prelims and on bouts that have vanished', () => {
    const entry: EntryDraft = {
      picks: { b1: pick({ stake: 100 }), gone: pick({ stake: 100 }), prelim: pick({ stake: 100 }) },
      lockBoutId: 'b1',
      firstBlood: null,
    };
    const scored = scoreEntry(entry, { b1: bout(), prelim: bout({ isMainCard: false }) }, EVENT);
    expect(Object.keys(scored.byBout)).toEqual(['b1']);
  });

  it('scores an entry with no picks as zero', () => {
    const empty = scoreEntry({ picks: {}, lockBoutId: null, firstBlood: null }, bouts, EVENT);
    expect(empty).toEqual(score());
  });
});

describe('rankEntries', () => {
  const entry = (
    uid: string,
    total: number,
    correctWinners = 0,
    correctMethods = 0,
  ): ScoredEntry => ({
    uid,
    score: score({ total, correctWinners, correctMethods }),
  });

  it('orders by total descending', () => {
    const ranked = rankEntries([entry('a', 100), entry('b', 300), entry('c', 200)]);
    expect(ranked.map((e) => e.uid)).toEqual(['b', 'c', 'a']);
    expect(ranked.map((e) => e.rank)).toEqual([1, 2, 3]);
  });

  it('breaks a tie on correct winners, then on correct methods', () => {
    const ranked = rankEntries([
      entry('a', 500, 2, 2),
      entry('b', 500, 3, 0),
      entry('c', 500, 2, 1),
    ]);
    expect(ranked.map((e) => e.uid)).toEqual(['b', 'a', 'c']);
    expect(ranked.map((e) => e.rank)).toEqual([1, 2, 3]);
  });

  it('shares a rank and skips the ones it swallowed', () => {
    const ranked = rankEntries([
      entry('a', 500),
      entry('b', 400),
      entry('c', 400),
      entry('d', 100),
    ]);
    expect(ranked.map((e) => e.rank)).toEqual([1, 2, 2, 4]);
  });

  it('handles a three-way tie for first', () => {
    const ranked = rankEntries([entry('a', 500), entry('b', 500), entry('c', 500), entry('d', 10)]);
    expect(ranked.map((e) => e.rank)).toEqual([1, 1, 1, 4]);
  });

  it('handles 0, 1 and 2 entrants', () => {
    expect(rankEntries([])).toEqual([]);
    expect(rankEntries([entry('a', 10)]).map((e) => e.rank)).toEqual([1]);
    expect(rankEntries([entry('a', 10), entry('b', 20)]).map((e) => e.uid)).toEqual(['b', 'a']);
  });

  it('does not mutate its input and carries extra fields through', () => {
    const input = [
      { ...entry('a', 100), displayName: 'Ada' },
      { ...entry('b', 200), displayName: 'Bo' },
    ];
    const ranked = rankEntries(input);
    expect(ranked[0]?.displayName).toBe('Bo');
    expect(input.map((e) => e.uid)).toEqual(['a', 'b']);
    expect(input[0]).not.toHaveProperty('rank');
  });
});
