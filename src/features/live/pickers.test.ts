import type { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import { byPerson, pickersFor } from './pickers.ts';
import type { EntryWithId } from './hooks.ts';
import type { BoutWithId } from '../events/hooks.ts';

const ts = { toMillis: () => 0 } as unknown as Timestamp;

function bout(overrides: Partial<BoutWithId> = {}): BoutWithId {
  return {
    id: 'bout1',
    order: 1,
    weightClass: 'Lightweight',
    rounds: 3,
    isMainEvent: false,
    isMainCard: true,
    a: { fighterId: 'f1', name: 'Alex Silva', record: '10-0', headshotUrl: null },
    b: { fighterId: 'f2', name: 'Jake Wang', record: '9-1', headshotUrl: null },
    odds: { a: -150, b: 130, source: 'espn', updatedAt: ts, frozen: true },
    status: 'scheduled',
    result: null,
    ...overrides,
  };
}

function entry(uid: string, overrides: Partial<EntryWithId> = {}): EntryWithId {
  return {
    id: uid,
    uid,
    displayName: uid,
    photoURL: null,
    picks: {},
    lockBoutId: '',
    firstBlood: null,
    status: 'submitted',
    submittedAt: ts,
    updatedAt: ts,
    charged: true,
    score: null,
    rank: null,
    payout: null,
    ...overrides,
  };
}

describe('pickersFor', () => {
  it('splits pickers by the side they picked to win', () => {
    const entries = [
      entry('alice', { picks: { bout1: { winner: 'A', method: 'DEC', stake: 100 } } }),
      entry('bob', { picks: { bout1: { winner: 'B', method: 'KO', stake: 200 } } }),
    ];
    const result = pickersFor(entries, bout(), null, false);
    expect(result.a.map((p) => p.uid)).toEqual(['alice']);
    expect(result.b.map((p) => p.uid)).toEqual(['bob']);
  });

  it('excludes entries with no pick for this bout', () => {
    const entries = [
      entry('alice', { picks: { bout1: { winner: 'A', method: 'DEC', stake: 100 } } }),
      entry('bob', { picks: { 'other-bout': { winner: 'A', method: 'DEC', stake: 100 } } }),
    ];
    const result = pickersFor(entries, bout(), null, false);
    expect(result.a.map((p) => p.uid)).toEqual(['alice']);
    expect(result.b).toEqual([]);
  });

  it('orders a column self first, then stake desc, then name', () => {
    const entries = [
      entry('zoe', { picks: { bout1: { winner: 'A', method: 'DEC', stake: 200 } } }),
      entry('alice', { picks: { bout1: { winner: 'A', method: 'DEC', stake: 300 } } }),
      entry('me', { picks: { bout1: { winner: 'A', method: 'DEC', stake: 50 } } }),
      entry('bob', { picks: { bout1: { winner: 'A', method: 'DEC', stake: 300 } } }),
    ];
    const result = pickersFor(entries, bout(), 'me', false);
    expect(result.a.map((p) => p.uid)).toEqual(['me', 'alice', 'bob', 'zoe']);
    expect(result.a[0]!.isSelf).toBe(true);
    expect(result.a[1]!.isSelf).toBe(false);
  });

  it('flags the lock of the night', () => {
    const entries = [
      entry('alice', {
        lockBoutId: 'bout1',
        picks: { bout1: { winner: 'A', method: 'DEC', stake: 100 } },
      }),
      entry('bob', {
        lockBoutId: 'other-bout',
        picks: { bout1: { winner: 'A', method: 'DEC', stake: 100 } },
      }),
    ];
    const result = pickersFor(entries, bout(), null, false);
    expect(result.a.find((p) => p.uid === 'alice')!.isLock).toBe(true);
    expect(result.a.find((p) => p.uid === 'bob')!.isLock).toBe(false);
  });

  it('flags first blood on the same side as the pick, with no surname needed', () => {
    const entries = [
      entry('alice', {
        firstBlood: { boutId: 'bout1', fighter: 'A' },
        picks: { bout1: { winner: 'A', method: 'DEC', stake: 100 } },
      }),
    ];
    const result = pickersFor(entries, bout(), null, true);
    expect(result.a[0]!.firstBlood).toEqual({ sameAsWinner: true, surname: 'Silva' });
  });

  it("flags first blood on the other side, surfacing that fighter's surname", () => {
    const entries = [
      entry('alice', {
        firstBlood: { boutId: 'bout1', fighter: 'B' },
        picks: { bout1: { winner: 'A', method: 'DEC', stake: 100 } },
      }),
    ];
    const result = pickersFor(entries, bout(), null, true);
    expect(result.a[0]!.firstBlood).toEqual({ sameAsWinner: false, surname: 'Wang' });
  });

  it('ignores first blood when the event has it disabled', () => {
    const entries = [
      entry('alice', {
        firstBlood: { boutId: 'bout1', fighter: 'A' },
        picks: { bout1: { winner: 'A', method: 'DEC', stake: 100 } },
      }),
    ];
    const result = pickersFor(entries, bout(), null, false);
    expect(result.a[0]!.firstBlood).toBeNull();
  });

  it('ignores a first-blood pick for a different bout', () => {
    const entries = [
      entry('alice', {
        firstBlood: { boutId: 'other-bout', fighter: 'A' },
        picks: { bout1: { winner: 'A', method: 'DEC', stake: 100 } },
      }),
    ];
    const result = pickersFor(entries, bout(), null, true);
    expect(result.a[0]!.firstBlood).toBeNull();
  });
});

describe('byPerson', () => {
  const bout2 = bout({
    id: 'bout2',
    a: { fighterId: 'f3', name: 'Kevin Holland', record: '5-0', headshotUrl: null },
    b: { fighterId: 'f4', name: 'Jon Jones', record: '20-0', headshotUrl: null },
  });

  it('builds one row per entrant, cells in bout order, with self first then name', () => {
    const entries = [
      entry('zoe', { picks: { bout1: { winner: 'A', method: 'DEC', stake: 100 } } }),
      entry('me', { picks: { bout1: { winner: 'A', method: 'DEC', stake: 100 } } }),
      entry('alice', { picks: { bout1: { winner: 'A', method: 'DEC', stake: 100 } } }),
    ];
    const result = byPerson(entries, [bout(), bout2], 'me', false);
    expect(result.map((row) => row.uid)).toEqual(['me', 'alice', 'zoe']);
    expect(result[0]!.isSelf).toBe(true);
    expect(result[1]!.isSelf).toBe(false);
  });

  it('cells carry the picked surname, in card order, null when no pick for that bout', () => {
    const entries = [
      entry('alice', {
        picks: {
          bout1: { winner: 'A', method: 'DEC', stake: 100 },
          bout2: { winner: 'B', method: 'KO', stake: 50 },
        },
      }),
      entry('bob', { picks: { bout1: { winner: 'B', method: 'DEC', stake: 100 } } }),
    ];
    const result = byPerson(entries, [bout(), bout2], null, false);
    const alice = result.find((row) => row.uid === 'alice')!;
    expect(alice.cells).toEqual([
      { surname: 'Silva', isLock: false, firstBlood: null },
      { surname: 'Jones', isLock: false, firstBlood: null },
    ]);
    const bob = result.find((row) => row.uid === 'bob')!;
    expect(bob.cells).toEqual([
      { surname: 'Wang', isLock: false, firstBlood: null },
      { surname: null, isLock: false, firstBlood: null },
    ]);
  });

  it('flags lock and first blood per cell', () => {
    const entries = [
      entry('alice', {
        lockBoutId: 'bout1',
        firstBlood: { boutId: 'bout2', fighter: 'A' },
        picks: {
          bout1: { winner: 'A', method: 'DEC', stake: 100 },
          bout2: { winner: 'B', method: 'KO', stake: 50 },
        },
      }),
    ];
    const result = byPerson(entries, [bout(), bout2], null, true);
    const alice = result[0]!;
    expect(alice.cells[0]).toEqual({ surname: 'Silva', isLock: true, firstBlood: null });
    expect(alice.cells[1]).toEqual({
      surname: 'Jones',
      isLock: false,
      firstBlood: { sameAsWinner: false, surname: 'Holland' },
    });
  });
});
