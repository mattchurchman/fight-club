import { describe, expect, it } from 'vitest';
import { ledgerId } from '../ledger-plan';
import {
  FIRST_BLOOD_GRACE_MS,
  planCancel,
  planFinalize,
  planLock,
  planResults,
  planScores,
} from './index';
import type { ParsedBoutResult } from './results';
import type {
  LedgerIntent,
  LifecycleBout,
  LifecycleEntry,
  LifecycleEvent,
  LifecycleUser,
  Millis,
} from './types';
import type { SeasonTotals } from '../standings';
import type { BoutOdds, Pick } from '../types';

// docs/tasks/T09 step 5: one event walked from open to final, then the same stages re-run to prove
// they change nothing, then the awkward cases (void, cancelled bout, manual result, first blood).

const EVENT_ID = 'evt_600060963';
const LOCK_AT = Date.parse('2026-09-19T21:00:00Z');
const HOUR = 60 * 60 * 1000;
const BUY_IN = 100;
const STARTING_BALANCE = 500;

// ---- A four-bout main card. b3 has no price, so lock freezes it to even money (§4). ----

function odds(a: number | null, b: number | null): BoutOdds<Millis> {
  return { a, b, source: a === null ? 'default' : 'espn', updatedAt: 0, frozen: false };
}

function bout(order: number, price: BoutOdds<Millis>): LifecycleBout {
  return {
    order,
    weightClass: 'Lightweight',
    rounds: order === 1 ? 5 : 3,
    isMainEvent: order === 1,
    isMainCard: true,
    a: { fighterId: `ftr_a${order}`, name: `Fighter A${order}`, record: '10-0-0', headshotUrl: null },
    b: { fighterId: `ftr_b${order}`, name: `Fighter B${order}`, record: '9-1-0', headshotUrl: null },
    odds: price,
    status: 'scheduled',
    result: null,
  };
}

function card(): Record<string, LifecycleBout> {
  return {
    b1: bout(1, odds(-200, 150)),
    b2: bout(2, odds(150, -200)),
    b3: bout(3, odds(null, null)),
    b4: bout(4, odds(250, -300)),
  };
}

function event(over: Partial<LifecycleEvent> = {}): LifecycleEvent {
  return {
    id: EVENT_ID,
    status: 'open',
    lockAt: LOCK_AT,
    buyIn: BUY_IN,
    budget: 1000,
    firstBloodEnabled: true,
    paidEntrants: 0,
    pot: 0,
    finalizedAt: null,
    ...over,
  };
}

function pick(winner: 'A' | 'B', method: 'KO' | 'SUB' | 'DEC', stake: number): Pick {
  return { winner, method, stake };
}

function entry(
  uid: string,
  picks: Record<string, Pick>,
  lockBoutId: string,
  firstBloodBoutId: string,
  firstBloodFighter: 'A' | 'B',
  over: Partial<LifecycleEntry> = {},
): LifecycleEntry {
  return {
    uid,
    displayName: uid.toUpperCase(),
    photoURL: null,
    picks,
    lockBoutId,
    firstBlood: { boutId: firstBloodBoutId, fighter: firstBloodFighter },
    status: 'submitted',
    submittedAt: LOCK_AT - 2 * HOUR,
    updatedAt: LOCK_AT - 2 * HOUR,
    charged: false,
    score: null,
    rank: null,
    payout: null,
    ...over,
  };
}

/** Four valid entries, each staking exactly the 1000-point budget across the four bouts. */
function entries(): LifecycleEntry[] {
  return [
    entry(
      'u1',
      { b1: pick('A', 'KO', 250), b2: pick('B', 'DEC', 250), b3: pick('A', 'SUB', 250), b4: pick('A', 'SUB', 250) },
      'b1',
      'b1',
      'A',
    ),
    entry(
      'u2',
      { b1: pick('A', 'DEC', 400), b2: pick('A', 'KO', 200), b3: pick('B', 'DEC', 200), b4: pick('B', 'DEC', 200) },
      'b2',
      'b1',
      'B',
    ),
    entry(
      'u3',
      { b1: pick('B', 'KO', 100), b2: pick('B', 'DEC', 400), b3: pick('A', 'SUB', 300), b4: pick('A', 'DEC', 200) },
      'b4',
      'b1',
      'A',
    ),
    entry(
      'u4',
      { b1: pick('A', 'SUB', 250), b2: pick('B', 'DEC', 250), b3: pick('B', 'KO', 250), b4: pick('B', 'KO', 250) },
      'b3',
      'b1',
      'A',
    ),
  ];
}

function users(balances: Record<string, number> = {}): Record<string, LifecycleUser> {
  const out: Record<string, LifecycleUser> = {};
  for (const uid of ['u1', 'u2', 'u3', 'u4']) {
    out[uid] = { uid, displayName: uid.toUpperCase(), balance: balances[uid] ?? STARTING_BALANCE };
  }
  return out;
}

const RESULTS: Record<string, ParsedBoutResult> = {
  b1: { winner: 'A', method: 'KO', round: 2, time: '3:12', firstBlood: 'A' },
  b2: { winner: 'B', method: 'DEC', round: 3, time: '5:00' },
  b3: { winner: 'draw', method: 'DEC', round: 3, time: '5:00' },
  b4: { winner: 'A', method: 'SUB', round: 1, time: '4:01' },
};

// ---- A stand-in for jobs/lifecycle.ts: applies a plan to the in-memory world ----

interface World {
  event: LifecycleEvent;
  bouts: Record<string, LifecycleBout>;
  entries: LifecycleEntry[];
  users: Record<string, LifecycleUser>;
  /** Keyed by deterministic ledger id, which is exactly how `jobs/lib/ledger.ts` de-duplicates. */
  ledger: Map<string, LedgerIntent>;
  standings: SeasonTotals[];
}

function world(over: Partial<World> = {}): World {
  return {
    event: event(),
    bouts: card(),
    entries: entries(),
    users: users(),
    ledger: new Map(),
    standings: [],
    ...over,
  };
}

function post(w: World, intents: readonly LedgerIntent[]): void {
  for (const intent of intents) {
    const id = ledgerId(intent.type, intent.eventId, intent.uid);
    expect(id).not.toBeNull();
    if (w.ledger.has(id!)) continue; // the row is already there: a no-op, not a second charge
    w.ledger.set(id!, intent);
    const user = w.users[intent.uid]!;
    w.users[intent.uid] = { ...user, balance: user.balance + intent.amount };
  }
}

function patchEntry(w: World, uid: string, patch: Partial<LifecycleEntry>): void {
  w.entries = w.entries.map((e) => (e.uid === uid ? { ...e, ...patch } : e));
}

function applyLock(w: World, now: Millis): ReturnType<typeof planLock> {
  const plan = planLock(w.event, w.bouts, w.entries, w.users, now);
  if (!plan.applies) return plan;
  for (const voided of plan.voided) patchEntry(w, voided.uid, { status: 'void' });
  post(w, plan.ledger);
  for (const uid of plan.charged) patchEntry(w, uid, { charged: true });
  for (const frozen of plan.odds) {
    const b = w.bouts[frozen.boutId]!;
    w.bouts[frozen.boutId] = {
      ...b,
      odds: { ...b.odds, a: frozen.a, b: frozen.b, source: frozen.source, frozen: true },
    };
  }
  w.event = { ...w.event, ...plan.event };
  return plan;
}

function applyResults(
  w: World,
  results: Record<string, ParsedBoutResult>,
  now: Millis,
): ReturnType<typeof planResults> {
  const plan = planResults(w.event, w.bouts, results, now);
  for (const write of plan.bouts) {
    w.bouts[write.boutId] = { ...w.bouts[write.boutId]!, status: write.status, result: write.result };
  }
  w.event = { ...w.event, ...plan.event };
  return plan;
}

function applyScores(w: World): ReturnType<typeof planScores> {
  const plan = planScores(w.event, w.bouts, w.entries);
  for (const write of plan.entries) patchEntry(w, write.uid, { score: write.score, rank: write.rank });
  return plan;
}

function applyFinalize(w: World, now: Millis): ReturnType<typeof planFinalize> {
  const plan = planFinalize(w.event, w.bouts, w.entries, w.users, w.standings, now);
  if (!plan.applies) return plan;
  for (const write of plan.entries) {
    patchEntry(w, write.uid, { score: write.score, rank: write.rank, payout: write.payout });
  }
  post(w, plan.ledger);
  w.standings = plan.standings;
  for (const { uid, stats } of plan.users) w.users[uid] = { ...w.users[uid]!, stats };
  w.event = { ...w.event, status: 'final', finalizedAt: plan.event.finalizedAt ?? null };
  return plan;
}

function byUid(w: World): Record<string, LifecycleEntry> {
  return Object.fromEntries(w.entries.map((e) => [e.uid, e]));
}

describe('the lifecycle, walked end to end', () => {
  function walk(): World {
    const w = world();
    applyLock(w, LOCK_AT);
    applyResults(w, RESULTS, LOCK_AT + 3 * HOUR);
    applyScores(w);
    applyFinalize(w, LOCK_AT + 4 * HOUR);
    return w;
  }

  it('charges every valid entry at lock and freezes the prices', () => {
    const w = world();
    const plan = applyLock(w, LOCK_AT);

    expect(plan.charged).toEqual(['u1', 'u2', 'u3', 'u4']);
    expect(plan.voided).toEqual([]);
    expect(w.event.status).toBe('locked');
    expect(w.event.paidEntrants).toBe(4);
    expect(w.event.pot).toBe(400);
    expect(Object.values(w.users).map((u) => u.balance)).toEqual([400, 400, 400, 400]);
    // §4: the priceless bout becomes even money and says so; the others keep their ESPN price.
    expect(w.bouts.b3!.odds).toMatchObject({ a: 100, b: 100, source: 'default', frozen: true });
    expect(w.bouts.b1!.odds).toMatchObject({ a: -200, b: 150, source: 'espn', frozen: true });
  });

  it('goes live on the first result and scores the card as it lands', () => {
    const w = world();
    applyLock(w, LOCK_AT);

    const firstBout = applyResults(w, { b1: RESULTS.b1! }, LOCK_AT + HOUR);
    expect(firstBout.bouts).toHaveLength(1);
    expect(w.event.status).toBe('live');
    applyScores(w);
    // u1 has b1 as its lock and got winner + method: 375 base + 188 method + 375 lock, no first blood yet.
    expect(byUid(w).u1!.score!.byBout.b1).toEqual({ base: 375, method: 188, lock: 375, total: 938 });
    expect(byUid(w).u1!.score!.byBout.b4).toBeNull();

    applyResults(w, RESULTS, LOCK_AT + 3 * HOUR);
    expect(w.event.status).toBe('live');
    expect(Object.values(w.bouts).every((b) => b.status === 'final')).toBe(true);
  });

  it('ranks the finished card by the rules in §4–§5', () => {
    const w = walk();
    const final = byUid(w);

    expect(final.u1!.score!.total).toBe(2913);
    expect(final.u3!.score!.total).toBe(2600);
    expect(final.u4!.score!.total).toBe(1225);
    expect(final.u2!.score!.total).toBe(700);
    expect([final.u1!.rank, final.u3!.rank, final.u4!.rank, final.u2!.rank]).toEqual([1, 2, 3, 4]);

    // §4.4: the drawn bout is a push for everyone, the lock included (u4 locked it).
    expect(final.u4!.score!.byBout.b3).toEqual({ base: 250, method: 0, lock: 0, total: 250 });
    // §4.5: u2 locked b2 and got the winner wrong — half the stake, negative.
    expect(final.u2!.score!.byBout.b2).toEqual({ base: 0, method: 0, lock: -100, total: -100 });
    // §4.6: the prop pays only the two who called it right.
    expect([final.u1!.score!.firstBlood, final.u3!.score!.firstBlood]).toEqual([100, 100]);
    expect(final.u2!.score!.firstBlood).toBe(0);
  });

  it('pays the pot out, and the ledger accounts for every token', () => {
    const w = walk();
    const final = byUid(w);

    expect(final.u1!.payout).toBe(280); // 70% of 400
    expect(final.u3!.payout).toBe(120); // 30%
    expect([final.u2!.payout, final.u4!.payout]).toEqual([0, 0]);

    // Pot conservation: what was charged is exactly what was paid out.
    const rows = [...w.ledger.values()];
    const charged = -rows.filter((r) => r.type === 'buyin').reduce((sum, r) => sum + r.amount, 0);
    const paid = rows.filter((r) => r.type === 'payout').reduce((sum, r) => sum + r.amount, 0);
    expect(charged).toBe(400);
    expect(paid).toBe(400);

    // Every balance is its starting balance plus that player's ledger rows.
    for (const uid of ['u1', 'u2', 'u3', 'u4']) {
      const delta = rows.filter((r) => r.uid === uid).reduce((sum, r) => sum + r.amount, 0);
      expect(w.users[uid]!.balance).toBe(STARTING_BALANCE + delta);
    }
    expect(w.users.u1!.balance).toBe(680);
    expect(w.users.u3!.balance).toBe(520);
  });

  it('folds the event into the season standings, h2h and lifetime stats', () => {
    const w = walk();
    const plan = planFinalize(event({ status: 'live' }), w.bouts, entries().map((e) => ({ ...e, charged: true })), users(), [], LOCK_AT + 4 * HOUR);
    const standings = Object.fromEntries(plan.standings.map((row) => [row.uid, row]));

    expect(standings.u1).toMatchObject({ points: 2913, events: 1, wins: 1, podiums: 1, netTokens: 180, upsets: 1 });
    expect(standings.u2).toMatchObject({ points: 700, wins: 0, podiums: 0, netTokens: -100, upsets: 0 });
    expect(standings.u3).toMatchObject({ podiums: 1, netTokens: 20, upsets: 1 });
    expect(standings.u4).toMatchObject({ podiums: 1, netTokens: -100 });
    // Six pairings, every one decided on points.
    expect(plan.h2h).toHaveLength(6);
    expect(plan.h2h.every((d) => d.ties === 0)).toBe(true);
    expect(w.users.u1!.stats).toEqual({ events: 1, wins: 1, podiums: 1, points: 2913, correctWinners: 3 });
  });

  it('adds to standings already on the board rather than replacing them', () => {
    const w = world({
      event: event({ status: 'live' }),
      standings: [
        { uid: 'u1', displayName: 'U1', points: 1000, events: 1, wins: 1, podiums: 1, netTokens: 50, correctWinners: 2, upsets: 0 },
        { uid: 'u9', displayName: 'U9', points: 42, events: 1, wins: 0, podiums: 0, netTokens: -100, correctWinners: 1, upsets: 0 },
      ],
    });
    w.entries = w.entries.map((e) => ({ ...e, charged: true }));
    applyResults(w, RESULTS, LOCK_AT + 3 * HOUR);
    applyFinalize(w, LOCK_AT + 4 * HOUR);

    const standings = Object.fromEntries(w.standings.map((row) => [row.uid, row]));
    expect(standings.u1).toMatchObject({ points: 3913, events: 2, wins: 2 });
    // A player who sat this one out is passed through untouched.
    expect(standings.u9).toMatchObject({ points: 42, events: 1 });
  });

  it('re-runs every stage without changing anything', () => {
    const w = walk();
    const before = JSON.stringify({ event: w.event, bouts: w.bouts, entries: w.entries, users: w.users });
    const ledgerSize = w.ledger.size;

    expect(applyLock(w, LOCK_AT + 5 * HOUR).applies).toBe(false);
    expect(applyResults(w, RESULTS, LOCK_AT + 5 * HOUR).applies).toBe(false);
    expect(applyScores(w).applies).toBe(false);
    const again = applyFinalize(w, LOCK_AT + 5 * HOUR);
    expect(again.applies).toBe(false);
    expect(again.reason).toBe('already-final');

    expect(w.ledger.size).toBe(ledgerSize);
    expect(JSON.stringify({ event: w.event, bouts: w.bouts, entries: w.entries, users: w.users })).toBe(before);
  });

  it('re-running the scoring stage mid-event writes nothing the second time', () => {
    const w = world();
    applyLock(w, LOCK_AT);
    applyResults(w, { b1: RESULTS.b1! }, LOCK_AT + HOUR);
    expect(applyScores(w).entries).toHaveLength(4);
    expect(applyScores(w).entries).toEqual([]);
  });
});

describe('entries that cannot be charged', () => {
  it('voids an entry that no longer validates', () => {
    const w = world();
    // A stale client left u2 one pick short of the budget.
    patchEntry(w, 'u2', { picks: { b1: pick('A', 'DEC', 400), b2: pick('A', 'KO', 200), b3: pick('B', 'DEC', 200) } });
    const plan = applyLock(w, LOCK_AT);

    expect(plan.voided).toEqual([
      { uid: 'u2', reason: 'invalid', detail: 'MISSING_PICK,BUDGET_MISMATCH' },
    ]);
    expect(plan.charged).toEqual(['u1', 'u3', 'u4']);
    expect(w.event.pot).toBe(300);
    expect(byUid(w).u2!.status).toBe('void');
    expect(byUid(w).u2!.charged).toBe(false);
    expect(w.users.u2!.balance).toBe(STARTING_BALANCE);
  });

  it('voids a player who cannot cover the buy-in, and never charges an unknown one', () => {
    const w = world({ users: users({ u2: 99 }) });
    delete w.users.u4;
    const plan = applyLock(w, LOCK_AT);

    expect(plan.voided).toEqual([
      { uid: 'u2', reason: 'insufficient-balance', detail: 'balance 99 < buyIn 100' },
      { uid: 'u4', reason: 'insufficient-balance', detail: 'balance 0 < buyIn 100' },
    ]);
    expect(plan.charged).toEqual(['u1', 'u3']);
    expect(w.event.pot).toBe(200);
  });

  it('leaves the voided out of the scoring and the pot', () => {
    const w = world({ users: users({ u2: 0 }) });
    applyLock(w, LOCK_AT);
    applyResults(w, RESULTS, LOCK_AT + 3 * HOUR);
    const scores = applyScores(w);
    expect(scores.entries.map((e) => e.uid)).toEqual(['u1', 'u3', 'u4']);

    const plan = applyFinalize(w, LOCK_AT + 4 * HOUR);
    expect(plan.ranked.map((e) => e.uid)).toEqual(['u1', 'u3', 'u4']);
    // 3 paid entrants: §6 gives the whole 300 pot to first place.
    expect(plan.payouts).toEqual([{ uid: 'u1', amount: 300 }]);
    expect(byUid(w).u2!.score).toBeNull();
  });

  it('refunds a lone entrant instead of paying them out (§6, E10)', () => {
    const w = world({ users: users({ u2: 0, u3: 0, u4: 0 }) });
    applyLock(w, LOCK_AT);
    applyResults(w, RESULTS, LOCK_AT + 3 * HOUR);
    const plan = applyFinalize(w, LOCK_AT + 4 * HOUR);

    expect(plan.payouts).toEqual([]);
    expect(plan.ledger).toEqual([
      { uid: 'u1', amount: 100, type: 'refund', eventId: EVENT_ID, note: 'sole entrant' },
    ]);
    expect(w.users.u1!.balance).toBe(STARTING_BALANCE);
    expect(byUid(w).u1!.payout).toBe(0);
  });
});

describe('results that arrive awkwardly', () => {
  it('treats a bout cancelled mid-event as a push and still finalises', () => {
    const w = world();
    applyLock(w, LOCK_AT);
    applyResults(w, { b1: RESULTS.b1!, b2: RESULTS.b2! }, LOCK_AT + 2 * HOUR);
    w.bouts.b4 = { ...w.bouts.b4!, status: 'cancelled' };

    // The result ESPN eventually publishes for a cancelled bout is ignored.
    const late = applyResults(w, { b3: RESULTS.b3!, b4: RESULTS.b4! }, LOCK_AT + 3 * HOUR);
    expect(late.skipped).toEqual([{ boutId: 'b4', reason: 'cancelled' }]);

    const plan = applyFinalize(w, LOCK_AT + 4 * HOUR);
    expect(plan.applies).toBe(true);
    // §4.4: the stake comes back, and a cancelled bout never feeds the tiebreakers.
    expect(byUid(w).u1!.score!.byBout.b4).toEqual({ base: 250, method: 0, lock: 0, total: 250 });
    expect(byUid(w).u1!.score!.correctWinners).toBe(2);
    expect(byUid(w).u3!.score!.byBout.b4).toEqual({ base: 200, method: 0, lock: 0, total: 200 });
  });

  it('never overwrites a result an admin entered by hand', () => {
    const w = world();
    applyLock(w, LOCK_AT);
    w.bouts.b1 = {
      ...w.bouts.b1!,
      status: 'final',
      result: { winner: 'B', method: 'DEC', round: 3, time: '5:00', firstBlood: 'B', source: 'manual', updatedAt: LOCK_AT + HOUR },
    };

    const plan = applyResults(w, RESULTS, LOCK_AT + 2 * HOUR);
    expect(plan.skipped).toContainEqual({ boutId: 'b1', reason: 'manual' });
    expect(w.bouts.b1!.result).toMatchObject({ winner: 'B', source: 'manual' });
  });

  it('keeps a first blood already on the bout when ESPN sends none', () => {
    const w = world();
    applyLock(w, LOCK_AT);
    applyResults(w, { b2: { ...RESULTS.b2!, firstBlood: 'B' } }, LOCK_AT + HOUR);
    // A corrected result for the same bout must not wipe the prop.
    applyResults(w, { b2: { ...RESULTS.b2!, round: 2 } }, LOCK_AT + 2 * HOUR);
    expect(w.bouts.b2!.result).toMatchObject({ round: 2, firstBlood: 'B' });
  });

  it('ignores results for bouts that are not on this card', () => {
    const w = world();
    applyLock(w, LOCK_AT);
    const plan = applyResults(w, { bout_999: RESULTS.b1! }, LOCK_AT + HOUR);
    expect(plan.applies).toBe(false);
    expect(plan.skipped).toEqual([{ boutId: 'bout_999', reason: 'unknown-bout' }]);
  });

  it('will not finalise while a bout is still pending', () => {
    const w = world();
    applyLock(w, LOCK_AT);
    applyResults(w, { b1: RESULTS.b1!, b2: RESULTS.b2!, b3: RESULTS.b3! }, LOCK_AT + 2 * HOUR);
    const plan = applyFinalize(w, LOCK_AT + 20 * HOUR);
    expect(plan.reason).toBe('bouts-pending');
    expect(w.event.status).toBe('live');
  });
});

describe('first blood', () => {
  /** The whole card finishes, but nobody has entered who drew first blood. */
  function pendingFirstBlood(): World {
    const w = world();
    applyLock(w, LOCK_AT);
    const withoutProp = Object.fromEntries(
      Object.entries(RESULTS).map(([id, r]) => [id, { ...r, firstBlood: null }]),
    );
    applyResults(w, withoutProp, LOCK_AT + 3 * HOUR);
    return w;
  }

  it('waits for an admin to enter it', () => {
    const w = pendingFirstBlood();
    const plan = applyFinalize(w, LOCK_AT + 3 * HOUR + FIRST_BLOOD_GRACE_MS - 1);
    expect(plan.reason).toBe('awaiting-first-blood');
    expect(w.event.status).toBe('live');
  });

  it('finalises with the prop void once the 12 hours are up', () => {
    const w = pendingFirstBlood();
    const plan = applyFinalize(w, LOCK_AT + 3 * HOUR + FIRST_BLOOD_GRACE_MS);
    expect(plan.applies).toBe(true);
    // §4.6: unresolved by finalize means 0, not a loss — every total drops by exactly the bonus.
    expect(byUid(w).u1!.score!.firstBlood).toBe(0);
    expect(byUid(w).u1!.score!.total).toBe(2813);
  });

  it('does not wait at all when the prop is off for the event', () => {
    const w = world({ event: event({ firstBloodEnabled: false }) });
    applyLock(w, LOCK_AT);
    applyResults(
      w,
      Object.fromEntries(Object.entries(RESULTS).map(([id, r]) => [id, { ...r, firstBlood: null }])),
      LOCK_AT + 3 * HOUR,
    );
    expect(applyFinalize(w, LOCK_AT + 3 * HOUR).applies).toBe(true);
    expect(byUid(w).u1!.score!.firstBlood).toBe(0);
  });

  it("counts a result of 'none' as answered", () => {
    const w = world();
    applyLock(w, LOCK_AT);
    applyResults(
      w,
      Object.fromEntries(Object.entries(RESULTS).map(([id, r]) => [id, { ...r, firstBlood: 'none' as const }])),
      LOCK_AT + 3 * HOUR,
    );
    expect(applyFinalize(w, LOCK_AT + 3 * HOUR).applies).toBe(true);
  });
});

describe('a cancelled event', () => {
  it('refunds everyone who was charged, once', () => {
    const w = world();
    applyLock(w, LOCK_AT);
    w.event = { ...w.event, status: 'cancelled' };

    const plan = planCancel(w.event, w.entries, LOCK_AT + HOUR);
    expect(plan.refunded).toEqual(['u1', 'u2', 'u3', 'u4']);
    post(w, plan.ledger);
    w.event = { ...w.event, finalizedAt: plan.event.finalizedAt ?? null };
    expect(Object.values(w.users).map((u) => u.balance)).toEqual([500, 500, 500, 500]);

    const second = planCancel(w.event, w.entries, LOCK_AT + 2 * HOUR);
    expect(second.applies).toBe(false);
    expect(second.reason).toBe('already-settled');
  });

  it('has nothing to refund before lock', () => {
    const plan = planCancel(event({ status: 'cancelled' }), entries(), LOCK_AT);
    expect(plan.applies).toBe(true);
    expect(plan.ledger).toEqual([]);
  });

  it('is the only stage that touches a cancelled event', () => {
    const cancelled = event({ status: 'cancelled' });
    expect(planLock(cancelled, card(), entries(), users(), LOCK_AT).reason).toBe('not-open');
    expect(planResults(cancelled, card(), RESULTS, LOCK_AT).reason).toBe('not-in-play');
    expect(planScores(cancelled, card(), entries()).reason).toBe('not-in-play');
    expect(planFinalize(cancelled, card(), entries(), users(), [], LOCK_AT).reason).toBe('not-in-play');
  });
});

describe('the clock', () => {
  it('does not lock before lockAt', () => {
    const plan = planLock(event(), card(), entries(), users(), LOCK_AT - 1);
    expect(plan.applies).toBe(false);
    expect(plan.reason).toBe('before-lock');
  });

  it('locks exactly at lockAt', () => {
    expect(planLock(event(), card(), entries(), users(), LOCK_AT).applies).toBe(true);
  });
});
