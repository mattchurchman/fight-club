import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  asAdmin,
  asPlayer1,
  asPlayer2,
  BOUT,
  createEnv,
  dbOf,
  EVT,
  seed,
  UID,
  validEntry,
  validPicks,
} from './helpers.ts';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await seed(env);
});

const p1Entry = (eventId: string) => `events/${eventId}/entries/${UID.p1}`;

describe('entries create', () => {
  it('allows an entry on an open event before lockAt', async () => {
    await assertSucceeds(setDoc(doc(asPlayer1(env), p1Entry(EVT.open)), validEntry(UID.p1)));
  });

  it('denies an entry one second after lockAt', async () => {
    await assertFails(setDoc(doc(asPlayer1(env), p1Entry(EVT.pastLock)), validEntry(UID.p1)));
  });

  it('denies an entry once the event is locked', async () => {
    await assertFails(setDoc(doc(asPlayer1(env), p1Entry(EVT.locked)), validEntry(UID.p1)));
  });

  it('denies an entry on a scheduled, not-yet-enabled event', async () => {
    await assertFails(setDoc(doc(asPlayer1(env), p1Entry(EVT.scheduled)), validEntry(UID.p1)));
  });

  it('denies a player whose balance is under the buy-in', async () => {
    await assertFails(
      setDoc(doc(asPlayer2(env), `events/${EVT.open}/entries/${UID.p2}`), validEntry(UID.p2)),
    );
  });

  it("denies writing into another player's entry doc", async () => {
    await assertFails(
      setDoc(doc(asPlayer1(env), `events/${EVT.open}/entries/${UID.p2}`), validEntry(UID.p2)),
    );
  });

  it('denies an entry whose uid field does not match the doc id', async () => {
    await assertFails(
      setDoc(doc(asPlayer1(env), p1Entry(EVT.open)), { ...validEntry(UID.p1), uid: UID.p2 }),
    );
  });

  it('denies arriving pre-scored or pre-charged', async () => {
    const db = asPlayer1(env);
    await assertFails(setDoc(doc(db, p1Entry(EVT.open)), { ...validEntry(UID.p1), charged: true }));
    await assertFails(
      setDoc(doc(db, p1Entry(EVT.open)), {
        ...validEntry(UID.p1),
        score: { total: 999, byBout: {}, firstBlood: 0, correctWinners: 5, correctMethods: 5 },
      }),
    );
    await assertFails(setDoc(doc(db, p1Entry(EVT.open)), { ...validEntry(UID.p1), rank: 1 }));
    await assertFails(setDoc(doc(db, p1Entry(EVT.open)), { ...validEntry(UID.p1), payout: 1000 }));
  });

  it("denies status 'void' at create", async () => {
    await assertFails(
      setDoc(doc(asPlayer1(env), p1Entry(EVT.open)), { ...validEntry(UID.p1), status: 'void' }),
    );
  });

  it('denies unknown fields', async () => {
    await assertFails(
      setDoc(doc(asPlayer1(env), p1Entry(EVT.open)), { ...validEntry(UID.p1), cheat: true }),
    );
  });

  it('denies a lockBoutId that is not one of the picked bouts', async () => {
    await assertFails(
      setDoc(doc(asPlayer1(env), p1Entry(EVT.open)), {
        ...validEntry(UID.p1),
        lockBoutId: 'bout_not_picked',
      }),
    );
  });

  it('denies a malformed firstBlood', async () => {
    await assertFails(
      setDoc(doc(asPlayer1(env), p1Entry(EVT.open)), {
        ...validEntry(UID.p1),
        firstBlood: { boutId: BOUT.main, fighter: 'C' },
      }),
    );
  });

  it('allows a null firstBlood (the rules leave the "required" part to validation)', async () => {
    await assertSucceeds(
      setDoc(doc(asPlayer1(env), p1Entry(EVT.open)), { ...validEntry(UID.p1), firstBlood: null }),
    );
  });

  it('denies empty picks', async () => {
    await assertFails(
      setDoc(doc(asPlayer1(env), p1Entry(EVT.open)), {
        ...validEntry(UID.p1),
        picks: {},
        lockBoutId: BOUT.main,
      }),
    );
  });
});

describe('entries stake validation', () => {
  const withPick = (pick: Record<string, unknown>) => ({
    ...validEntry(UID.p1),
    picks: { ...validPicks(), [BOUT.third]: pick },
  });

  it('denies a stake below the 50 minimum', async () => {
    await assertFails(
      setDoc(
        doc(asPlayer1(env), p1Entry(EVT.open)),
        withPick({ winner: 'A', method: 'KO', stake: 25 }),
      ),
    );
  });

  it('denies a stake above the 400 maximum', async () => {
    await assertFails(
      setDoc(
        doc(asPlayer1(env), p1Entry(EVT.open)),
        withPick({ winner: 'A', method: 'KO', stake: 500 }),
      ),
    );
  });

  it('denies a stake that is not a multiple of 25', async () => {
    await assertFails(
      setDoc(
        doc(asPlayer1(env), p1Entry(EVT.open)),
        withPick({ winner: 'A', method: 'KO', stake: 260 }),
      ),
    );
  });

  it('denies a non-integer stake', async () => {
    await assertFails(
      setDoc(
        doc(asPlayer1(env), p1Entry(EVT.open)),
        withPick({ winner: 'A', method: 'KO', stake: 100.5 }),
      ),
    );
  });

  it('denies an invalid winner corner', async () => {
    await assertFails(
      setDoc(
        doc(asPlayer1(env), p1Entry(EVT.open)),
        withPick({ winner: 'draw', method: 'KO', stake: 100 }),
      ),
    );
  });

  it('denies a method outside KO/SUB/DEC', async () => {
    await assertFails(
      setDoc(
        doc(asPlayer1(env), p1Entry(EVT.open)),
        withPick({ winner: 'A', method: 'DQ', stake: 100 }),
      ),
    );
  });

  it('denies a pick missing its method', async () => {
    await assertFails(
      setDoc(doc(asPlayer1(env), p1Entry(EVT.open)), withPick({ winner: 'A', stake: 100 })),
    );
  });

  it('denies a pick carrying an extra field', async () => {
    await assertFails(
      setDoc(
        doc(asPlayer1(env), p1Entry(EVT.open)),
        withPick({ winner: 'A', method: 'KO', stake: 100, bonus: 500 }),
      ),
    );
  });

  // `picks.values()` follows the map's lexicographic key order, so a key that sorts last lands on
  // the final slot of the unrolled check (index MAX_PICKS - 1). These two tests are what prove the
  // unroll is exhaustive at MAX_PICKS rather than merely sampling the first few picks — and that a
  // full-size entry still fits inside Firestore's 1000-expression request budget.
  const maxPicks = (lastPick: Record<string, unknown>) => {
    const picks: Record<string, unknown> = {
      bout_a: { winner: 'A', method: 'KO', stake: 50 },
      bout_b: { winner: 'B', method: 'DEC', stake: 75 },
      bout_c: { winner: 'A', method: 'SUB', stake: 100 },
      bout_d: { winner: 'A', method: 'KO', stake: 125 },
      bout_e: { winner: 'B', method: 'KO', stake: 150 },
      bout_f: { winner: 'A', method: 'DEC', stake: 175 },
      bout_g: { winner: 'A', method: 'KO', stake: 200 },
      zz_last: lastPick,
    };
    return { ...validEntry(UID.p1), picks, lockBoutId: 'bout_a' };
  };

  it('allows a full eight-pick entry when every pick is valid', async () => {
    await assertSucceeds(
      setDoc(
        doc(asPlayer1(env), p1Entry(EVT.open)),
        maxPicks({ winner: 'A', method: 'KO', stake: 325 }),
      ),
    );
  });

  it('catches an invalid stake in the eighth and last checked pick', async () => {
    await assertFails(
      setDoc(
        doc(asPlayer1(env), p1Entry(EVT.open)),
        maxPicks({ winner: 'A', method: 'KO', stake: 33 }),
      ),
    );
  });

  it('denies more picks than the unrolled check covers', async () => {
    const picks: Record<string, unknown> = {};
    for (let i = 1; i <= 9; i += 1) picks[`bout_${i}`] = { winner: 'A', method: 'KO', stake: 50 };
    await assertFails(
      setDoc(doc(asPlayer1(env), p1Entry(EVT.open)), {
        ...validEntry(UID.p1),
        picks,
        lockBoutId: 'bout_1',
      }),
    );
  });
});

describe('entries update', () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(dbOf(ctx), p1Entry(EVT.open)), validEntry(UID.p1));
      await setDoc(doc(dbOf(ctx), p1Entry(EVT.pastLock)), validEntry(UID.p1));
      await setDoc(doc(dbOf(ctx), p1Entry(EVT.locked)), validEntry(UID.p1));
    });
  });

  it('lets the owner edit picks before lockAt', async () => {
    await assertSucceeds(
      updateDoc(doc(asPlayer1(env), p1Entry(EVT.open)), {
        picks: { ...validPicks(), [BOUT.co]: { winner: 'A', method: 'SUB', stake: 75 } },
        lockBoutId: BOUT.co,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('denies editing picks one second after lockAt', async () => {
    await assertFails(
      updateDoc(doc(asPlayer1(env), p1Entry(EVT.pastLock)), {
        picks: validPicks(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('denies editing picks after the event is locked', async () => {
    await assertFails(
      updateDoc(doc(asPlayer1(env), p1Entry(EVT.locked)), {
        picks: validPicks(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('denies writing score, rank, payout or charged', async () => {
    const db = asPlayer1(env);
    await assertFails(
      updateDoc(doc(db, p1Entry(EVT.open)), {
        score: { total: 999, byBout: {}, firstBlood: 0, correctWinners: 5, correctMethods: 5 },
      }),
    );
    await assertFails(updateDoc(doc(db, p1Entry(EVT.open)), { rank: 1 }));
    await assertFails(updateDoc(doc(db, p1Entry(EVT.open)), { payout: 5000 }));
    await assertFails(updateDoc(doc(db, p1Entry(EVT.open)), { charged: true }));
  });

  it('denies flipping status to void', async () => {
    await assertFails(updateDoc(doc(asPlayer1(env), p1Entry(EVT.open)), { status: 'void' }));
  });

  it('denies an edit that smuggles in an invalid stake', async () => {
    await assertFails(
      updateDoc(doc(asPlayer1(env), p1Entry(EVT.open)), {
        picks: { ...validPicks(), [BOUT.co]: { winner: 'A', method: 'KO', stake: 401 } },
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("denies editing another player's entry", async () => {
    await assertFails(
      updateDoc(doc(asPlayer1(env), `events/${EVT.open}/entries/${UID.p2}`), {
        picks: validPicks(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('lets an admin void an entry and delete it', async () => {
    const db = asAdmin(env);
    await assertSucceeds(updateDoc(doc(db, p1Entry(EVT.open)), { status: 'void' }));
    await assertSucceeds(deleteDoc(doc(db, p1Entry(EVT.open))));
  });

  it('denies a player deleting their own entry', async () => {
    await assertFails(deleteDoc(doc(asPlayer1(env), p1Entry(EVT.open))));
  });
});

describe('entries read', () => {
  it("denies reading another player's entry while the event is open", async () => {
    await assertFails(getDoc(doc(asPlayer1(env), `events/${EVT.open}/entries/${UID.p2}`)));
  });

  it("allows reading another player's entry once the event is locked", async () => {
    await assertSucceeds(getDoc(doc(asPlayer1(env), `events/${EVT.locked}/entries/${UID.p2}`)));
  });

  it('always lets a player read their own entry', async () => {
    await assertSucceeds(getDoc(doc(asPlayer2(env), `events/${EVT.open}/entries/${UID.p2}`)));
  });

  it('lets an admin read entries before lock', async () => {
    await assertSucceeds(getDoc(doc(asAdmin(env), `events/${EVT.open}/entries/${UID.p2}`)));
  });
});

describe('events and bouts', () => {
  it('are readable by players and writable only by admins', async () => {
    await assertSucceeds(getDoc(doc(asPlayer1(env), `events/${EVT.open}`)));
    await assertFails(updateDoc(doc(asPlayer1(env), `events/${EVT.open}`), { status: 'final' }));
    await assertFails(
      updateDoc(doc(asPlayer1(env), `events/${EVT.open}/bouts/${BOUT.main}`), {
        result: {
          winner: 'A',
          method: 'KO',
          round: 1,
          time: '1:00',
          firstBlood: 'A',
          source: 'manual',
        },
      }),
    );
    await assertSucceeds(updateDoc(doc(asAdmin(env), `events/${EVT.open}`), { status: 'locked' }));
    await assertSucceeds(
      updateDoc(doc(asAdmin(env), `events/${EVT.open}/bouts/${BOUT.main}`), { status: 'live' }),
    );
  });
});
