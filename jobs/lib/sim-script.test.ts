import { describe, expect, it } from 'vitest';
import { DEFAULTS, validateEntry } from '@shared/index.ts';
import type { Bout } from '@shared/index.ts';
import { buildFriendEntry, fightNightOrder, scriptedResult, SIM_CARD_ORDERS } from './sim-script.ts';

/** Minimal 5-bout main card, `order` 1 (the main event, 5 rounds) through 5 (3 rounds), matching
 * what `jobs/simulate-night.ts` seeds from `fixtures/espn/scoreboard-upcoming.json`. */
function makeBouts(): Record<string, Bout<number>> {
  const bouts: Record<string, Bout<number>> = {};
  for (const order of SIM_CARD_ORDERS) {
    bouts[`bout_${order}`] = {
      order,
      weightClass: 'Lightweight',
      rounds: order === 1 ? 5 : 3,
      isMainEvent: order === 1,
      isMainCard: true,
      a: { fighterId: 'ftr_a', name: 'Fighter A', record: '1-0-0', headshotUrl: null },
      b: { fighterId: 'ftr_b', name: 'Fighter B', record: '1-0-0', headshotUrl: null },
      odds: { a: null, b: null, source: 'default', updatedAt: 0, frozen: false },
      status: 'scheduled',
      result: null,
    };
  }
  return bouts;
}

describe('fightNightOrder', () => {
  it('runs the card from the lowest-billed bout to the main event', () => {
    const bouts = SIM_CARD_ORDERS.map((order) => ({ order }));
    const order = fightNightOrder(bouts).map((b) => b.order);
    expect(order).toEqual([...SIM_CARD_ORDERS].sort((a, b) => b - a));
    expect(order[order.length - 1]).toBe(1); // main event fights last
  });
});

describe('scriptedResult', () => {
  it('has a result for every bout on the card that fits its round count', () => {
    for (const order of SIM_CARD_ORDERS) {
      const rounds = order === 1 ? 5 : 3;
      const result = scriptedResult(order, rounds);
      expect(result.round).toBeLessThanOrEqual(rounds);
      expect(result.round).toBeGreaterThan(0);
    }
  });

  it('includes at least one decision and one clear underdog win', () => {
    const results = SIM_CARD_ORDERS.map((order) => scriptedResult(order, order === 1 ? 5 : 3));
    expect(results.some((r) => r.method === 'DEC')).toBe(true);
    expect(
      results.some((r) => (r.winner === 'A' ? r.odds.a : r.odds.b) >= 200),
    ).toBe(true);
  });

  it('rejects a round count the script was not written for', () => {
    // order 5 is scripted for a 3-round decision; a 1-round card can't fit that.
    expect(() => scriptedResult(5, 1 as unknown as 3)).toThrow();
  });

  it('throws for a bout order the script does not cover', () => {
    expect(() => scriptedResult(99, 3)).toThrow();
  });
});

describe('buildFriendEntry', () => {
  const bouts = makeBouts();
  const activeBouts = SIM_CARD_ORDERS.map((order) => ({ boutId: `bout_${order}` }));

  it('produces a valid, budget-exact entry for every friend', () => {
    for (let friendIndex = 0; friendIndex < 5; friendIndex++) {
      const draft = buildFriendEntry(friendIndex, activeBouts);
      const result = validateEntry(draft, bouts, { budget: DEFAULTS.budget, firstBloodEnabled: true });
      expect(result.errors).toEqual([]);
      expect(result.ok).toBe(true);

      const staked = Object.values(draft.picks).reduce((sum, pick) => sum + pick.stake, 0);
      expect(staked).toBe(DEFAULTS.budget);
    }
  });

  it('varies picks across friends so the leaderboard is not a dead tie', () => {
    const entries = [0, 1, 2, 3, 4].map((i) => buildFriendEntry(i, activeBouts));
    const winnerPatterns = entries.map((e) => activeBouts.map(({ boutId }) => e.picks[boutId]!.winner).join(''));
    expect(new Set(winnerPatterns).size).toBeGreaterThan(1);
  });
});
