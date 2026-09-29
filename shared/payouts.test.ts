import { describe, expect, it } from 'vitest';
import { computePayouts, payoutTableFor } from './payouts';
import { rankEntries } from './scoring';
import type { Ranked, ScoredEntry } from './scoring';
import type { EntryScore } from './types';

function score(total: number): EntryScore {
  return { total, byBout: {}, firstBlood: 0, correctWinners: 0, correctMethods: 0 };
}

/** A pre-ranked entry, so payout behaviour can be tested without leaning on rankEntries. */
function ranked(uid: string, rank: number, submittedAt?: number): Ranked<ScoredEntry> {
  return {
    uid,
    rank,
    score: score(1000 - rank),
    ...(submittedAt === undefined ? {} : { submittedAt }),
  };
}

/** `n` entrants, all on distinct scores, ranked 1..n. */
function field(n: number): Ranked<ScoredEntry>[] {
  return Array.from({ length: n }, (_, i) => ranked(`u${i + 1}`, i + 1));
}

const total = (payouts: readonly { amount: number }[]): number =>
  payouts.reduce((sum, p) => sum + p.amount, 0);

/** Deterministic LCG, so the property loop below never flakes. */
function rng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

describe('payoutTableFor', () => {
  it('pays nobody with fewer than 2 paid entrants (1 is a refund)', () => {
    expect(payoutTableFor(0)).toEqual([]);
    expect(payoutTableFor(1)).toEqual([]);
  });

  it('is winner-take-all for 2–3', () => {
    expect(payoutTableFor(2)).toEqual([1]);
    expect(payoutTableFor(3)).toEqual([1]);
  });

  it('pays two places for 4–6', () => {
    expect(payoutTableFor(4)).toEqual([0.7, 0.3]);
    expect(payoutTableFor(6)).toEqual([0.7, 0.3]);
  });

  it('pays three places for 7 and up', () => {
    expect(payoutTableFor(7)).toEqual([0.6, 0.3, 0.1]);
    expect(payoutTableFor(500)).toEqual([0.6, 0.3, 0.1]);
  });
});

describe('computePayouts — worked examples from GAME_RULES §7', () => {
  it('E7: 5 players x 100 = 500 → [350, 150]', () => {
    expect(computePayouts(field(5), 100)).toEqual([
      { uid: 'u1', amount: 350 },
      { uid: 'u2', amount: 150 },
    ]);
  });

  it('E8: 8 players x 100 = 800 with 2nd tied by two → 480, then 160 each', () => {
    const entries: Ranked<ScoredEntry>[] = [
      ranked('u1', 1),
      { ...ranked('u2', 2), submittedAt: 10 },
      { ...ranked('u3', 2), submittedAt: 20 },
      ranked('u4', 4),
      ranked('u5', 5),
      ranked('u6', 6),
      ranked('u7', 7),
      ranked('u8', 8),
    ];
    expect(computePayouts(entries, 100)).toEqual([
      { uid: 'u1', amount: 480 },
      { uid: 'u2', amount: 160 },
      { uid: 'u3', amount: 160 },
    ]);
  });

  it('E9: 7 players x 100 = 700 → 420 / 210 / 70', () => {
    expect(computePayouts(field(7), 100).map((p) => p.amount)).toEqual([420, 210, 70]);
  });

  it('E10: a single paid entrant is refunded, never paid', () => {
    expect(computePayouts(field(1), 100)).toEqual([]);
  });
});

describe('computePayouts — edges', () => {
  it('pays nobody when there are no entrants or no buy-in', () => {
    expect(computePayouts([], 100)).toEqual([]);
    expect(computePayouts(field(5), 0)).toEqual([]);
  });

  it('gives the whole pot to the winner with 2 entrants', () => {
    expect(computePayouts(field(2), 100)).toEqual([{ uid: 'u1', amount: 200 }]);
  });

  it('splits the pot evenly when 2 entrants tie', () => {
    const entries = [
      { ...ranked('u1', 1), submittedAt: 5 },
      { ...ranked('u2', 1), submittedAt: 9 },
    ];
    expect(computePayouts(entries, 100)).toEqual([
      { uid: 'u1', amount: 100 },
      { uid: 'u2', amount: 100 },
    ]);
  });

  it('sends the flooring leftover to 1st place', () => {
    // pot 165 → floor(115.5) + floor(49.5) = 164, so 1st takes the spare point.
    const payouts = computePayouts(field(5), 33);
    expect(payouts).toEqual([
      { uid: 'u1', amount: 116 },
      { uid: 'u2', amount: 49 },
    ]);
    expect(total(payouts)).toBe(165);
  });

  it('pools all three places for a three-way tie for 1st and gives the remainder to the earliest entry', () => {
    const entries = [
      { ...ranked('u1', 1), submittedAt: 300 },
      { ...ranked('u2', 1), submittedAt: 100 },
      { ...ranked('u3', 1), submittedAt: 200 },
      ranked('u4', 4),
      ranked('u5', 5),
      ranked('u6', 6),
      ranked('u7', 7),
    ];
    const payouts = computePayouts(entries, 100);
    expect(payouts).toEqual([
      { uid: 'u1', amount: 233 },
      { uid: 'u2', amount: 234 },
      { uid: 'u3', amount: 233 },
    ]);
    expect(total(payouts)).toBe(700);
  });

  it('pools across the paid/unpaid boundary when the last paid place is tied', () => {
    const entries = [
      ranked('u1', 1),
      ranked('u2', 2),
      { ...ranked('u3', 3), submittedAt: 10 },
      { ...ranked('u4', 3), submittedAt: 20 },
      ranked('u5', 5),
      ranked('u6', 6),
      ranked('u7', 7),
    ];
    // 3rd place is worth 70 and 4th nothing, so the two tied players split 70.
    expect(computePayouts(entries, 100)).toEqual([
      { uid: 'u1', amount: 420 },
      { uid: 'u2', amount: 210 },
      { uid: 'u3', amount: 35 },
      { uid: 'u4', amount: 35 },
    ]);
  });

  it('drops a tied group that sits entirely outside the table', () => {
    const entries = [
      ranked('u1', 1),
      ranked('u2', 2),
      ranked('u3', 3),
      ranked('u4', 4),
      ranked('u5', 4),
    ];
    const payouts = computePayouts(entries, 100);
    expect(payouts.map((p) => p.uid)).toEqual(['u1', 'u2']);
    expect(total(payouts)).toBe(500);
  });

  it('breaks a leftover tie on uid when submittedAt is missing or equal', () => {
    const entries = [
      ranked('zz', 1),
      ranked('aa', 1),
      ranked('mm', 1),
      ranked('u4', 4),
      ranked('u5', 5),
      ranked('u6', 6),
      ranked('u7', 7),
    ];
    const payouts = computePayouts(entries, 100);
    expect(payouts.find((p) => p.uid === 'aa')?.amount).toBe(234);
    expect(total(payouts)).toBe(700);
  });

  it('conserves the pot for n = 1..20 with random ties', () => {
    const random = rng(20260929);
    for (let n = 1; n <= 20; n += 1) {
      for (let trial = 0; trial < 25; trial += 1) {
        const buyIn = 1 + Math.floor(random() * 250);
        // A small score pool guarantees plenty of ties, including at the boundaries.
        const entries: ScoredEntry[] = Array.from({ length: n }, (_, i) => ({
          uid: `u${i + 1}`,
          score: score(Math.floor(random() * 3) * 100),
          submittedAt: Math.floor(random() * 1000),
        }));
        const payouts = computePayouts(rankEntries(entries), buyIn);
        const pot = buyIn * n;
        if (n === 1) {
          expect(payouts).toEqual([]); // refunded, not paid
        } else {
          expect(total(payouts)).toBe(pot);
        }
        expect(payouts.every((p) => p.amount > 0)).toBe(true);
        expect(new Set(payouts.map((p) => p.uid)).size).toBe(payouts.length);
      }
    }
  });
});
