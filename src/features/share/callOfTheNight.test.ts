import type { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import type { BoutWithId } from '../events/hooks.ts';
import { findCallOfTheNight } from './callOfTheNight.ts';
import type { CallOfTheNightEntryLike } from './callOfTheNight.ts';

// findCallOfTheNight never reads `updatedAt`, so a bare `.toMillis()` stub is enough here.
const ts = { toMillis: () => 0 } as unknown as Timestamp;

function bout(id: string, overrides: Partial<BoutWithId> = {}): BoutWithId {
  return {
    id,
    order: 0,
    weightClass: 'Lightweight',
    rounds: 3,
    isMainEvent: false,
    isMainCard: true,
    a: { fighterId: 'fa', name: 'Favorite', record: '1-0', headshotUrl: null },
    b: { fighterId: 'fb', name: 'Underdog', record: '0-1', headshotUrl: null },
    odds: { a: -200, b: 170, source: 'espn', updatedAt: ts, frozen: true },
    status: 'final',
    result: { winner: 'A', method: 'DEC', round: null, time: null, firstBlood: null, source: 'espn', updatedAt: ts },
    ...overrides,
  };
}

function entry(uid: string, picks: CallOfTheNightEntryLike['picks']): CallOfTheNightEntryLike {
  return { uid, displayName: uid, picks };
}

describe('findCallOfTheNight', () => {
  it('picks the correct call priced at the longest odds', () => {
    const bouts = [
      bout('b1', {
        result: { winner: 'A', method: 'DEC', round: null, time: null, firstBlood: null, source: 'espn', updatedAt: ts },
      }),
      bout('b2', {
        odds: { a: 300, b: -400, source: 'espn', updatedAt: ts, frozen: true },
        result: { winner: 'A', method: 'KO', round: 1, time: '1:00', firstBlood: null, source: 'espn', updatedAt: ts },
      }),
    ];
    const entries = [
      entry('matt', { b1: { winner: 'A', method: 'DEC', stake: 100 } }),
      entry('sam', { b2: { winner: 'A', method: 'KO', stake: 100 } }),
    ];
    expect(findCallOfTheNight(entries, bouts)).toEqual({
      displayName: 'sam',
      fighterName: 'Favorite',
      odds: 300,
      boutId: 'b2',
    });
  });

  it('ignores wrong picks and unresolved bouts', () => {
    const bouts = [bout('b1', { status: 'scheduled', result: null }), bout('b2')];
    const entries = [
      entry('matt', { b1: { winner: 'A', method: 'DEC', stake: 100 }, b2: { winner: 'B', method: 'DEC', stake: 100 } }),
    ];
    expect(findCallOfTheNight(entries, bouts)).toBeNull();
  });

  it('falls back to the default American odds when a price is missing', () => {
    const bouts = [bout('b1', { odds: { a: null, b: null, source: 'default', updatedAt: ts, frozen: false } })];
    const entries = [entry('matt', { b1: { winner: 'A', method: 'DEC', stake: 100 } })];
    expect(findCallOfTheNight(entries, bouts)).toEqual({
      displayName: 'matt',
      fighterName: 'Favorite',
      odds: 100,
      boutId: 'b1',
    });
  });

  it('returns null when nothing is resolved yet', () => {
    expect(findCallOfTheNight([], [bout('b1', { status: 'scheduled', result: null })])).toBeNull();
  });
});
