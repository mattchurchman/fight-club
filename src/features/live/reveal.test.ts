import { describe, expect, it } from 'vitest';
import { computeConsensus, contrarianLabel, findContrarian } from './reveal.ts';
import type { RevealEntryLike } from './reveal.ts';

function entry(uid: string, winner: 'A' | 'B', overrides: Partial<RevealEntryLike> = {}): RevealEntryLike {
  return {
    uid,
    displayName: uid,
    photoURL: null,
    lockBoutId: 'other-bout',
    picks: { bout1: { winner } },
    ...overrides,
  };
}

describe('computeConsensus', () => {
  it('splits picks by side as rounded percentages', () => {
    const entries = [entry('a', 'A'), entry('b', 'A'), entry('c', 'A'), entry('d', 'B')];
    expect(computeConsensus(entries, 'bout1')).toEqual({ aCount: 3, bCount: 1, aPct: 75, bPct: 25 });
  });

  it('ignores entries with no pick on this bout', () => {
    const entries = [entry('a', 'A'), { ...entry('b', 'A'), picks: {} }];
    expect(computeConsensus(entries, 'bout1')).toEqual({ aCount: 1, bCount: 0, aPct: 100, bPct: 0 });
  });

  it('returns all-zero when nobody has picked yet', () => {
    expect(computeConsensus([], 'bout1')).toEqual({ aCount: 0, bCount: 0, aPct: 0, bPct: 0 });
  });
});

describe('findContrarian', () => {
  it('finds the lone dissenter when everyone else agrees', () => {
    const entries = [entry('a', 'A'), entry('b', 'A'), entry('c', 'B')];
    expect(findContrarian(entries, 'bout1')).toEqual({ entry: entries[2], side: 'B' });
  });

  it('returns null on an even split', () => {
    const entries = [entry('a', 'A'), entry('b', 'B')];
    expect(findContrarian(entries, 'bout1')).toBeNull();
  });

  it('returns null when only one player has picked', () => {
    expect(findContrarian([entry('a', 'A')], 'bout1')).toBeNull();
  });

  it('returns null when two players agree on each side (no lone dissenter)', () => {
    const entries = [entry('a', 'A'), entry('b', 'A'), entry('c', 'B'), entry('d', 'B')];
    expect(findContrarian(entries, 'bout1')).toBeNull();
  });
});

describe('contrarianLabel', () => {
  const bout = {
    a: { fighterId: 'f1', name: 'Favorite', record: '1-0', headshotUrl: null },
    b: { fighterId: 'f2', name: 'Underdog', record: '0-1', headshotUrl: null },
    odds: { a: -200, b: 170, source: 'espn' as const, updatedAt: { toMillis: () => 0 }, frozen: true },
  };

  it('calls out taking the dog when the lone pick is the underdog by odds', () => {
    const contrarian = { entry: entry('a', 'B'), side: 'B' as const };
    expect(contrarianLabel(contrarian, bout)).toBe('Only a took the dog');
  });

  it('names the fighter when the lone pick is the favorite', () => {
    const contrarian = { entry: entry('a', 'A'), side: 'A' as const };
    expect(contrarianLabel(contrarian, bout)).toBe('Only a took Favorite');
  });

  it('falls back to the fighter name when odds are missing', () => {
    const noOdds = { ...bout, odds: { ...bout.odds, a: null, b: null } };
    const contrarian = { entry: entry('a', 'B'), side: 'B' as const };
    expect(contrarianLabel(contrarian, noOdds)).toBe('Only a took Underdog');
  });
});
