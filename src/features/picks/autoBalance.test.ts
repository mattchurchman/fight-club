import { describe, expect, it } from 'vitest';
import { distributeStakes } from './autoBalance.ts';

const cfg = { minStake: 50, maxStake: 400, stakeStep: 25 };

describe('distributeStakes', () => {
  it('returns nothing for an empty bout list', () => {
    expect(distributeStakes([], 1000, cfg)).toEqual({});
  });

  it('splits evenly when the budget divides cleanly', () => {
    expect(distributeStakes(['a', 'b', 'c', 'd'], 1000, cfg)).toEqual({
      a: 250,
      b: 250,
      c: 250,
      d: 250,
    });
  });

  it('gives the leftover steps to the first bouts in order', () => {
    // 1000 / 25 = 40 steps over 3 bouts -> 13, 13, 14 steps -> 325, 325, 350
    expect(distributeStakes(['a', 'b', 'c'], 1000, cfg)).toEqual({
      a: 350,
      b: 325,
      c: 325,
    });
  });

  it('clamps each share to the max stake', () => {
    expect(distributeStakes(['a'], 1000, cfg)).toEqual({ a: 400 });
  });

  it('clamps each share to the min stake', () => {
    expect(distributeStakes(['a', 'b'], 40, cfg)).toEqual({ a: 50, b: 50 });
  });
});
