import { describe, expect, it } from 'vitest';
import { computeBadges } from './badges.ts';
import type { BoutOdds, Pick } from './types.ts';
import type { LifecycleBout, Millis } from './lifecycle/types.ts';
import type { Ranked } from './scoring.ts';
import type { ScoredLifecycleEntry } from './lifecycle/scores.ts';

// Test data helpers
function pick(winner: 'A' | 'B', method: 'KO' | 'SUB' | 'DEC', stake: number): Pick {
  return { winner, method, stake };
}

function odds(a: number | null, b: number | null): BoutOdds<Millis> {
  return { a, b, source: a === null ? 'default' : 'espn', updatedAt: 0, frozen: false };
}

function bout(_id: string, order: number, price: BoutOdds<Millis>): LifecycleBout {
  return {
    order,
    weightClass: 'Lightweight',
    rounds: order === 1 ? 5 : 3,
    isMainEvent: order === 1,
    isMainCard: true,
    a: { fighterId: `ftr_a${order}`, name: `Fighter A${order}`, record: '10-0-0', headshotUrl: null },
    b: { fighterId: `ftr_b${order}`, name: `Fighter B${order}`, record: '9-1-0', headshotUrl: null },
    odds: price,
    status: 'final',
    result: null,
  };
}

function scoredBout(base: number, method: number = 0, lock: number = 0, total: number = 0) {
  return { base, method, lock, total: total || base + method + lock };
}

function rankedEntry(
  uid: string,
  rank: number,
  picks: Record<string, Pick>,
  correctWinners: number,
  byBout: Record<string, ReturnType<typeof scoredBout>>,
  firstBlood: number = 0,
): Ranked<ScoredLifecycleEntry> {
  return {
    uid,
    displayName: uid.toUpperCase(),
    submittedAt: 0,
    rank,
    picks,
    score: {
      total: Object.values(byBout).reduce((sum, b) => sum + b.total, 0) + firstBlood,
      byBout,
      firstBlood,
      correctWinners,
      correctMethods: 0,
    },
  };
}

describe('computeBadges', () => {
  describe('champion badge', () => {
    it('awards champion when rank is 1', () => {
      const bouts = { b1: bout('b1', 1, odds(-200, 150)) };
      const entry = rankedEntry(
        'u1',
        1,
        { b1: pick('A', 'KO', 400) },
        1,
        { b1: scoredBout(300, 225, 525, 1050) },
      );

      const { badges } = computeBadges(entry, bouts, 'b1', 600, 0);

      expect(badges).toContain('champion');
    });

    it('does not award champion for rank 2+', () => {
      const bouts = { b1: bout('b1', 1, odds(-200, 150)) };
      const entry = rankedEntry(
        'u2',
        2,
        { b1: pick('A', 'KO', 400) },
        1,
        { b1: scoredBout(300, 225, 0, 525) },
      );

      const { badges } = computeBadges(entry, bouts, 'b1', 400, 0);

      expect(badges).not.toContain('champion');
    });
  });

  describe('perfect-card badge', () => {
    it('awards perfect-card when all winners correct on 4+ bouts', () => {
      const bouts = {
        b1: bout('b1', 1, odds(-200, 150)),
        b2: bout('b2', 2, odds(150, -200)),
        b3: bout('b3', 3, odds(200, -250)),
        b4: bout('b4', 4, odds(-100, 100)),
      };
      const entry = rankedEntry(
        'u1',
        1,
        {
          b1: pick('A', 'KO', 250),
          b2: pick('B', 'DEC', 250),
          b3: pick('A', 'SUB', 250),
          b4: pick('A', 'DEC', 250),
        },
        4, // all 4 winners correct
        {
          b1: scoredBout(300, 225, 0, 525),
          b2: scoredBout(350, 0, 0, 350),
          b3: scoredBout(300, 300, 0, 600),
          b4: scoredBout(250, 125, 0, 375),
        },
      );

      const { badges } = computeBadges(entry, bouts, 'b1', 600, 0);

      expect(badges).toContain('perfect-card');
    });

    it('does not award perfect-card with only 3 bouts', () => {
      const bouts = {
        b1: bout('b1', 1, odds(-200, 150)),
        b2: bout('b2', 2, odds(150, -200)),
        b3: bout('b3', 3, odds(200, -250)),
      };
      const entry = rankedEntry(
        'u1',
        1,
        {
          b1: pick('A', 'KO', 333),
          b2: pick('B', 'DEC', 333),
          b3: pick('A', 'SUB', 334),
        },
        3,
        {
          b1: scoredBout(300, 225, 0, 525),
          b2: scoredBout(350, 0, 0, 350),
          b3: scoredBout(300, 300, 0, 600),
        },
      );

      const { badges } = computeBadges(entry, bouts, 'b1', 600, 0);

      expect(badges).not.toContain('perfect-card');
    });

    it('does not award perfect-card if any winner is wrong', () => {
      const bouts = {
        b1: bout('b1', 1, odds(-200, 150)),
        b2: bout('b2', 2, odds(150, -200)),
        b3: bout('b3', 3, odds(200, -250)),
        b4: bout('b4', 4, odds(-100, 100)),
      };
      const entry = rankedEntry(
        'u1',
        1,
        {
          b1: pick('A', 'KO', 250),
          b2: pick('A', 'DEC', 250), // wrong
          b3: pick('A', 'SUB', 250),
          b4: pick('A', 'DEC', 250),
        },
        3, // only 3 winners correct
        {
          b1: scoredBout(300, 225, 0, 525),
          b2: scoredBout(0, 0, 0, 0), // base = 0, winner wrong
          b3: scoredBout(300, 300, 0, 600),
          b4: scoredBout(250, 125, 0, 375),
        },
      );

      const { badges } = computeBadges(entry, bouts, 'b1', 600, 0);

      expect(badges).not.toContain('perfect-card');
    });
  });

  describe('upset-artist badge', () => {
    it('awards upset-artist for correct pick at +200 odds', () => {
      const bouts = {
        b1: bout('b1', 1, odds(200, -250)),
        b2: bout('b2', 2, odds(150, -200)),
      };
      const entry = rankedEntry(
        'u1',
        2,
        {
          b1: pick('A', 'KO', 300), // picked A at +200
          b2: pick('B', 'DEC', 700),
        },
        2,
        {
          b1: scoredBout(300, 225, 0, 525), // base > 0 = winner correct
          b2: scoredBout(350, 0, 0, 350),
        },
      );

      const { badges } = computeBadges(entry, bouts, 'b1', 400, 0);

      expect(badges).toContain('upset-artist');
    });

    it('awards upset-artist for correct pick at +300 or higher', () => {
      const bouts = {
        b1: bout('b1', 1, odds(300, -400)),
      };
      const entry = rankedEntry(
        'u1',
        1,
        { b1: pick('A', 'KO', 400) },
        1,
        { b1: scoredBout(400, 300, 700, 1400) },
      );

      const { badges } = computeBadges(entry, bouts, 'b1', 900, 0);

      expect(badges).toContain('upset-artist');
    });

    it('does not award upset-artist for wrong winner at upset odds', () => {
      const bouts = {
        b1: bout('b1', 1, odds(200, -250)),
      };
      const entry = rankedEntry(
        'u1',
        3,
        { b1: pick('A', 'KO', 400) },
        0,
        { b1: scoredBout(0, 0, -200, -200) }, // base = 0, winner wrong
      );

      const { badges } = computeBadges(entry, bouts, 'b1', 100, 0);

      expect(badges).not.toContain('upset-artist');
    });

    it('does not award upset-artist for correct pick at -200 odds (favorite)', () => {
      const bouts = {
        b1: bout('b1', 1, odds(-200, 150)),
      };
      const entry = rankedEntry(
        'u1',
        2,
        { b1: pick('A', 'KO', 400) },
        1,
        { b1: scoredBout(300, 225, 0, 525) },
      );

      const { badges } = computeBadges(entry, bouts, 'b1', 400, 0);

      expect(badges).not.toContain('upset-artist');
    });
  });

  describe('bleeder badge', () => {
    it('awards bleeder when first blood is correct', () => {
      const bouts = { b1: bout('b1', 1, odds(-200, 150)) };
      const entry = rankedEntry(
        'u1',
        1,
        { b1: pick('A', 'KO', 400) },
        1,
        { b1: scoredBout(300, 225, 0, 525) },
        100, // firstBlood = 100
      );

      const { badges } = computeBadges(entry, bouts, 'b1', 600, 0);

      expect(badges).toContain('bleeder');
    });

    it('does not award bleeder when first blood is 0', () => {
      const bouts = { b1: bout('b1', 1, odds(-200, 150)) };
      const entry = rankedEntry(
        'u1',
        1,
        { b1: pick('A', 'KO', 400) },
        1,
        { b1: scoredBout(300, 225, 0, 525) },
        0, // firstBlood = 0
      );

      const { badges } = computeBadges(entry, bouts, 'b1', 600, 0);

      expect(badges).not.toContain('bleeder');
    });
  });

  describe('lock-smith badge', () => {
    it('increments lock streak when lock is correct', () => {
      const bouts = { b1: bout('b1', 1, odds(-200, 150)) };
      const entry = rankedEntry(
        'u1',
        1,
        { b1: pick('A', 'KO', 400) },
        1,
        { b1: scoredBout(300, 225, 525, 1050) }, // lock score > 0 = correct
      );

      const { lockStreak } = computeBadges(entry, bouts, 'b1', 600, 2); // was 2, should become 3

      expect(lockStreak).toBe(3);
    });

    it('awards lock-smith at 3rd consecutive correct lock', () => {
      const bouts = { b1: bout('b1', 1, odds(-200, 150)) };
      const entry = rankedEntry(
        'u1',
        1,
        { b1: pick('A', 'KO', 400) },
        1,
        { b1: scoredBout(300, 225, 525, 1050) },
      );

      const { badges } = computeBadges(entry, bouts, 'b1', 600, 2); // was 2, lock correct → 3

      expect(badges).toContain('lock-smith');
    });

    it('resets lock streak when lock is wrong', () => {
      const bouts = { b1: bout('b1', 1, odds(-200, 150)) };
      const entry = rankedEntry(
        'u1',
        2,
        { b1: pick('A', 'KO', 400) },
        0,
        { b1: scoredBout(0, 0, -200, -200) }, // lock score < 0 or base = 0 = wrong
      );

      const { lockStreak } = computeBadges(entry, bouts, 'b1', 100, 2); // was 2, lock wrong → 0

      expect(lockStreak).toBe(0);
    });

    it('handles lock on a draw/push correctly', () => {
      const bouts = { b1: bout('b1', 1, odds(-200, 150)) };
      const entry = rankedEntry(
        'u1',
        2,
        { b1: pick('A', 'KO', 400) },
        0,
        { b1: scoredBout(400, 0, 0, 400) }, // push: base = stake, lock = 0
      );

      const { lockStreak } = computeBadges(entry, bouts, 'b1', 400, 1); // lock push → increments

      expect(lockStreak).toBe(2);
    });

    it('does not award lock-smith before reaching 3', () => {
      const bouts = { b1: bout('b1', 1, odds(-200, 150)) };
      const entry = rankedEntry(
        'u1',
        1,
        { b1: pick('A', 'KO', 400) },
        1,
        { b1: scoredBout(300, 225, 525, 1050) },
      );

      const { badges } = computeBadges(entry, bouts, 'b1', 600, 1); // was 1, correct → 2

      expect(badges).not.toContain('lock-smith');
    });
  });

  describe('busted badge', () => {
    it('awards busted when balance is 0', () => {
      const bouts = { b1: bout('b1', 1, odds(-200, 150)) };
      const entry = rankedEntry(
        'u1',
        4,
        { b1: pick('A', 'KO', 400) },
        0,
        { b1: scoredBout(0, 0, -100, -100) },
      );

      const { badges } = computeBadges(entry, bouts, 'b1', 0, 0);

      expect(badges).toContain('busted');
    });

    it('does not award busted when balance is > 0', () => {
      const bouts = { b1: bout('b1', 1, odds(-200, 150)) };
      const entry = rankedEntry(
        'u1',
        4,
        { b1: pick('A', 'KO', 400) },
        0,
        { b1: scoredBout(0, 0, -100, -100) },
      );

      const { badges } = computeBadges(entry, bouts, 'b1', 1, 0);

      expect(badges).not.toContain('busted');
    });
  });

  describe('multiple badges', () => {
    it('can earn multiple badges in one event', () => {
      const bouts = {
        b1: bout('b1', 1, odds(-200, 150)),
        b2: bout('b2', 2, odds(200, -250)), // upset odds
        b3: bout('b3', 3, odds(-150, 125)),
        b4: bout('b4', 4, odds(-100, 100)),
      };
      const entry = rankedEntry(
        'u1',
        1, // champion
        {
          b1: pick('A', 'KO', 250),
          b2: pick('A', 'SUB', 250), // upset pick
          b3: pick('B', 'DEC', 250),
          b4: pick('A', 'SUB', 250),
        },
        4, // perfect card
        {
          b1: scoredBout(300, 225, 525, 1050), // correct lock
          b2: scoredBout(300, 300, 0, 600), // correct at +200
          b3: scoredBout(350, 0, 0, 350),
          b4: scoredBout(250, 300, 0, 550),
        },
        100, // bleeder
      );

      const { badges } = computeBadges(entry, bouts, 'b1', 600, 0);

      expect(badges).toContain('champion');
      expect(badges).toContain('perfect-card');
      expect(badges).toContain('upset-artist');
      expect(badges).toContain('bleeder');
    });
  });
});
