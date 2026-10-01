import { describe, expect, it } from 'vitest';
import { formatH2HRecord, orientH2H, sortH2HRecords } from './h2h.ts';
import type { H2HDocLike } from './h2h.ts';

describe('orientH2H', () => {
  const doc: H2HDocLike = { a: 'alice', b: 'bob', aWins: 7, bWins: 3, ties: 1 };

  it('keeps a/b as-is when the viewer is the sorted "a" uid', () => {
    expect(orientH2H(doc, 'alice')).toEqual({ otherUid: 'bob', wins: 7, losses: 3, ties: 1 });
  });

  it('flips wins/losses when the viewer is the sorted "b" uid', () => {
    expect(orientH2H(doc, 'bob')).toEqual({ otherUid: 'alice', wins: 3, losses: 7, ties: 1 });
  });

  it('is consistent both ways: a’s wins equal b’s losses', () => {
    const asA = orientH2H(doc, 'alice');
    const asB = orientH2H(doc, 'bob');
    expect(asA.wins).toBe(asB.losses);
    expect(asA.losses).toBe(asB.wins);
  });
});

describe('formatH2HRecord', () => {
  it('formats a record with no ties', () => {
    expect(formatH2HRecord({ otherUid: 'bob', wins: 7, losses: 3, ties: 0 }, 'Dave')).toBe(
      "You're 7–3 vs. Dave",
    );
  });

  it('appends the tie count when there is one', () => {
    expect(formatH2HRecord({ otherUid: 'bob', wins: 7, losses: 3, ties: 1 }, 'Dave')).toBe(
      "You're 7–3–1 vs. Dave",
    );
  });

  it('calls out an unplayed matchup', () => {
    expect(formatH2HRecord({ otherUid: 'bob', wins: 0, losses: 0, ties: 0 }, 'Dave')).toBe(
      'No games yet vs. Dave',
    );
  });
});

describe('sortH2HRecords', () => {
  it('orders by games played, most first', () => {
    const records = [
      { otherUid: 'a', wins: 1, losses: 0, ties: 0 },
      { otherUid: 'b', wins: 3, losses: 2, ties: 1 },
      { otherUid: 'c', wins: 0, losses: 0, ties: 0 },
    ];
    const names: Record<string, string> = { a: 'Alice', b: 'Bob', c: 'Carl' };
    expect(sortH2HRecords(records, (uid) => names[uid]!).map((r) => r.otherUid)).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('breaks ties on games played by name', () => {
    const records = [
      { otherUid: 'z', wins: 1, losses: 0, ties: 0 },
      { otherUid: 'a', wins: 1, losses: 0, ties: 0 },
    ];
    const names: Record<string, string> = { z: 'Zed', a: 'Amy' };
    expect(sortH2HRecords(records, (uid) => names[uid]!).map((r) => r.otherUid)).toEqual([
      'a',
      'z',
    ]);
  });
});
