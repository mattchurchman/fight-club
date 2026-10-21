import { describe, expect, it } from 'vitest';
import { rebuildRecords, seasonIdFor } from './rebuild';
import type { RebuildEvent } from './rebuild';
import type { LifecycleBout, LifecycleEntry, Millis } from './types';
import type { BoutOdds, EntryScore, Pick as PickOne } from '../types';

// docs/tasks/T57 step 2. The replay trusts stored scores, so these fixtures set them directly
// instead of going through `scoreEntry` — that path is already covered by lifecycle.test.ts.

const HOUR = 60 * 60 * 1000;
const BUY_IN = 100;
const STARTS_AT = Date.parse('2026-03-07T22:00:00Z');

function odds(a: number | null, b: number | null): BoutOdds<Millis> {
  return { a, b, source: a === null ? 'default' : 'espn', updatedAt: 0, frozen: true };
}

/** A bout `winner` won by decision. `a`/`b` are the prices picks were made at. */
function bout(order: number, winner: 'A' | 'B', price = odds(-200, 150)): LifecycleBout {
  return {
    order,
    weightClass: 'Lightweight',
    rounds: 3,
    isMainEvent: order === 1,
    isMainCard: true,
    a: { fighterId: `ftr_a${order}`, name: `Fighter A${order}`, record: '10-0-0', headshotUrl: null },
    b: { fighterId: `ftr_b${order}`, name: `Fighter B${order}`, record: '9-1-0', headshotUrl: null },
    odds: price,
    status: 'final',
    result: { winner, method: 'DEC', round: 3, time: null, firstBlood: 'none', source: 'espn', updatedAt: 0 },
  };
}

function card(): Record<string, LifecycleBout> {
  return { b1: bout(1, 'A'), b2: bout(2, 'A'), b3: bout(3, 'A'), b4: bout(4, 'A') };
}

function pick(winner: 'A' | 'B'): PickOne {
  return { winner, method: 'DEC', stake: 250 };
}

/**
 * `correct` of the four bouts won, in order. The lock bout mirrors `scoreBout`: the stake again
 * when it lands, a penalty when it misses — which is what `computeBadges` reads the streak from.
 */
function score(total: number, correct: number, lockBoutId: string): EntryScore {
  const byBout: EntryScore['byBout'] = {};
  ['b1', 'b2', 'b3', 'b4'].forEach((boutId, i) => {
    const base = i < correct ? 250 : 0;
    const lock = boutId === lockBoutId ? (base > 0 ? base : -125) : 0;
    byBout[boutId] = { base, method: 0, lock, total: base + lock };
  });
  return { total, byBout, firstBlood: 0, correctWinners: correct, correctMethods: 0 };
}

function entry(
  uid: string,
  rank: number | null,
  total: number,
  correct: number,
  over: Partial<LifecycleEntry> = {},
): LifecycleEntry {
  const lockBoutId = over.lockBoutId ?? 'b1';
  return {
    uid,
    displayName: uid.toUpperCase(),
    photoURL: null,
    picks: { b1: pick('A'), b2: pick('A'), b3: pick('A'), b4: pick('A') },
    lockBoutId,
    firstBlood: null,
    status: 'submitted',
    submittedAt: STARTS_AT - 2 * HOUR,
    updatedAt: STARTS_AT,
    charged: true,
    score: score(total, correct, lockBoutId),
    rank,
    payout: null,
    ...over,
  };
}

function event(id: string, entries: LifecycleEntry[], over: Partial<RebuildEvent> = {}): RebuildEvent {
  return {
    id,
    name: `UFC ${id}`,
    startsAt: STARTS_AT,
    buyIn: BUY_IN,
    bouts: card(),
    entries,
    balanceAfterFinalize: Object.fromEntries(entries.map((e) => [e.uid, 500])),
    ...over,
  };
}

const ROSTER = [{ uid: 'u1' }, { uid: 'u2' }];

describe('rebuildRecords', () => {
  it('counts a solo night for nothing and fixes its entry (GAME_RULES §6.1)', () => {
    const solo = event('evt_solo', [entry('u1', 1, 900, 4, { payout: 100 })]);

    const result = rebuildRecords([solo], ROSTER);

    expect(result.soloNights).toEqual([
      { eventId: 'evt_solo', name: 'UFC evt_solo', uid: 'u1', displayName: 'U1' },
    ]);
    expect(result.entryFixes).toEqual([
      { eventId: 'evt_solo', uid: 'u1', rank: null, payout: 0 },
    ]);
    expect(result.standings.size).toBe(0);
    expect(result.h2h).toEqual([]);
    expect(result.users).toEqual([
      {
        uid: 'u1',
        stats: { events: 0, wins: 0, podiums: 0, points: 0, correctWinners: 0 },
        badges: [],
        badgeCounts: {},
        lockStreak: 0,
      },
      {
        uid: 'u2',
        stats: { events: 0, wins: 0, podiums: 0, points: 0, correctWinners: 0 },
        badges: [],
        badgeCounts: {},
        lockStreak: 0,
      },
    ]);
  });

  it('leaves a void or unpaid entry out of the entrant count, so two submitters can still be a solo night', () => {
    const solo = event('evt_void', [
      entry('u1', 1, 900, 4, { payout: 100 }),
      entry('u2', 2, 400, 2, { status: 'void', charged: false }),
    ]);

    const result = rebuildRecords([solo], ROSTER);

    expect(result.soloNights.map((night) => night.uid)).toEqual(['u1']);
    expect(result.users.every((user) => user.stats.events === 0)).toBe(true);
  });

  it('counts a repeated badge twice across two events', () => {
    const first = event('evt_1', [
      entry('u1', 1, 900, 4, { payout: 200 }),
      entry('u2', 2, 400, 2),
    ]);
    const second = event('evt_2', [
      entry('u1', 1, 800, 4, { payout: 200 }),
      entry('u2', 2, 300, 1),
    ]);

    const result = rebuildRecords([first, second], ROSTER);

    const u1 = result.users.find((user) => user.uid === 'u1')!;
    expect(u1.badgeCounts).toEqual({ champion: 2, 'perfect-card': 2 });
    expect(u1.badges).toEqual(['champion', 'perfect-card']);
    expect(u1.stats).toEqual({ events: 2, wins: 2, podiums: 2, points: 1700, correctWinners: 8 });

    const u2 = result.users.find((user) => user.uid === 'u2')!;
    expect(u2.badgeCounts).toEqual({});
    expect(u2.stats).toEqual({ events: 2, wins: 0, podiums: 2, points: 700, correctWinners: 3 });

    expect(result.standings.get('2026')).toEqual([
      {
        uid: 'u1',
        displayName: 'U1',
        points: 1700,
        events: 2,
        wins: 2,
        podiums: 2,
        netTokens: 200,
        correctWinners: 8,
        upsets: 0,
      },
      {
        uid: 'u2',
        displayName: 'U2',
        points: 700,
        events: 2,
        wins: 0,
        podiums: 2,
        netTokens: -200,
        correctWinners: 3,
        upsets: 0,
      },
    ]);
    expect(result.h2h).toEqual([{ id: 'u1__u2', a: 'u1', b: 'u2', aWins: 2, bWins: 0, ties: 0 }]);
  });

  it('carries the lock streak across events until it earns lock-smith', () => {
    const won = (id: string): RebuildEvent =>
      event(id, [entry('u1', 1, 900, 4, { payout: 200 }), entry('u2', 2, 400, 2)]);
    // u1 picked A everywhere and b1 (their lock) went to A in all three events.
    const result = rebuildRecords([won('evt_1'), won('evt_2'), won('evt_3')], ROSTER);

    const u1 = result.users.find((user) => user.uid === 'u1')!;
    expect(u1.lockStreak).toBe(3);
    expect(u1.badgeCounts['lock-smith']).toBe(1);
  });

  it('resets the lock streak when the lock misses', () => {
    const lost = event('evt_2', [
      entry('u1', 2, 100, 0, { lockBoutId: 'b1', picks: { b1: pick('B'), b2: pick('B'), b3: pick('B'), b4: pick('B') } }),
      entry('u2', 1, 900, 4, { payout: 200 }),
    ]);
    const won = event('evt_1', [entry('u1', 1, 900, 4, { payout: 200 }), entry('u2', 2, 400, 2)]);

    const result = rebuildRecords([won, lost], ROSTER);

    expect(result.users.find((user) => user.uid === 'u1')!.lockStreak).toBe(0);
  });

  it('withholds busted when no balance is known for the player', () => {
    const broke = event('evt_1', [entry('u1', 1, 900, 4, { payout: 0 }), entry('u2', 2, 400, 2)], {
      balanceAfterFinalize: { u1: 0 },
    });

    const result = rebuildRecords([broke], ROSTER);

    expect(result.users.find((user) => user.uid === 'u1')!.badgeCounts.busted).toBe(1);
    expect(result.users.find((user) => user.uid === 'u2')!.badgeCounts.busted).toBeUndefined();
  });

  it('reports a paid entry with no stored score instead of folding it in', () => {
    const half = event('evt_1', [
      entry('u1', 1, 900, 4, { payout: 200 }),
      entry('u2', null, 0, 0, { score: null }),
    ]);

    const result = rebuildRecords([half], ROSTER);

    expect(result.unsettled).toEqual([{ eventId: 'evt_1', uid: 'u2' }]);
    expect(result.users.find((user) => user.uid === 'u2')!.stats.events).toBe(0);
  });

  it('splits seasons by the calendar year the event started in', () => {
    const last = event('evt_1', [entry('u1', 1, 900, 4), entry('u2', 2, 400, 2)], {
      startsAt: Date.parse('2025-12-31T23:00:00Z'),
    });
    const next = event('evt_2', [entry('u1', 1, 800, 4), entry('u2', 2, 300, 1)], {
      startsAt: Date.parse('2026-01-01T01:00:00Z'),
    });

    const result = rebuildRecords([last, next], ROSTER);

    expect([...result.standings.keys()]).toEqual(['2025', '2026']);
    expect(result.standings.get('2025')!.find((row) => row.uid === 'u1')!.events).toBe(1);
    expect(result.standings.get('2026')!.find((row) => row.uid === 'u1')!.events).toBe(1);
    // One season's rows never leak into another's, but head-to-heads are all-time.
    expect(result.h2h).toEqual([{ id: 'u1__u2', a: 'u1', b: 'u2', aWins: 2, bWins: 0, ties: 0 }]);
  });

  it('is pure: the same input replays to the same records and nothing given is mutated', () => {
    const events = [
      event('evt_solo', [entry('u1', 1, 900, 4, { payout: 100 })]),
      event('evt_1', [entry('u1', 1, 900, 4, { payout: 200 }), entry('u2', 2, 400, 2)]),
    ];
    const snapshot = JSON.stringify(events);

    const first = rebuildRecords(events, ROSTER);
    const second = rebuildRecords(events, ROSTER);

    expect(JSON.stringify(events)).toBe(snapshot);
    expect(second.users).toEqual(first.users);
    expect(second.entryFixes).toEqual(first.entryFixes);
    expect(second.h2h).toEqual(first.h2h);
    expect([...second.standings]).toEqual([...first.standings]);
  });
});

describe('seasonIdFor', () => {
  it('is the UTC calendar year, not the local one', () => {
    expect(seasonIdFor(Date.parse('2026-01-01T00:30:00Z'))).toBe('2026');
    expect(seasonIdFor(Date.parse('2025-12-31T23:30:00Z'))).toBe('2025');
  });
});
