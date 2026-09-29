import { describe, expect, it } from 'vitest';
import { DEFAULTS, NUMBERED_EVENT_RE, PAYOUT_TABLE, RULES_VERSION } from './constants';

describe('constants', () => {
  it('matches config/app.defaults exactly (docs/DATA_MODEL.md)', () => {
    expect(DEFAULTS).toEqual({
      buyIn: 100,
      startingGrant: 500,
      budget: 1000,
      minStake: 50,
      maxStake: 400,
      stakeStep: 25,
      methodMultipliers: { KO: 0.75, SUB: 1, DEC: 0.5 },
      lockPenaltyPct: 0.5,
      firstBloodBonus: 100,
    });
  });

  it('pins the rules version', () => {
    expect(RULES_VERSION).toBe('v2.0');
  });

  it('covers the payout splits from GAME_RULES.md §6', () => {
    expect(PAYOUT_TABLE.find((r) => r.min <= 1 && r.max >= 1)?.splits).toEqual([]);
    expect(PAYOUT_TABLE.find((r) => r.min <= 3 && r.max >= 3)?.splits).toEqual([1]);
    expect(PAYOUT_TABLE.find((r) => r.min <= 5 && r.max >= 5)?.splits).toEqual([0.7, 0.3]);
    expect(PAYOUT_TABLE.find((r) => r.min <= 8 && r.max >= 8)?.splits).toEqual([0.6, 0.3, 0.1]);
  });

  it('matches numbered events by shortName only', () => {
    expect(NUMBERED_EVENT_RE.test('UFC 332')).toBe(true);
    expect(NUMBERED_EVENT_RE.test('UFC 1000')).toBe(true);
    expect(NUMBERED_EVENT_RE.test('UFC Freedom 250')).toBe(false);
    expect(NUMBERED_EVENT_RE.test('UFC 332: Silva vs. Wang')).toBe(false);
  });
});
