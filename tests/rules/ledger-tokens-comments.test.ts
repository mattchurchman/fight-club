import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { asAdmin, asPlayer1, asPlayer2, BOUT, createEnv, dbOf, EVT, seed, UID } from './helpers.ts';

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

describe('ledger', () => {
  it('lets a player read their own rows', async () => {
    await assertSucceeds(getDoc(doc(asPlayer1(env), 'ledger/row_p1')));
    await assertSucceeds(
      getDocs(query(collection(asPlayer1(env), 'ledger'), where('uid', '==', UID.p1))),
    );
  });

  it("denies reading another player's rows", async () => {
    await assertFails(getDoc(doc(asPlayer1(env), 'ledger/row_p2')));
    await assertFails(getDocs(collection(asPlayer1(env), 'ledger')));
  });

  it('lets an admin read everything', async () => {
    await assertSucceeds(getDocs(collection(asAdmin(env), 'ledger')));
  });

  it('denies a player granting themselves tokens', async () => {
    await assertFails(
      addDoc(collection(asPlayer1(env), 'ledger'), {
        uid: UID.p1,
        amount: 10000,
        type: 'grant',
        eventId: null,
        note: 'free money',
        createdBy: UID.p1,
        createdAt: serverTimestamp(),
        balanceAfter: 10500,
      }),
    );
  });

  it('lets an admin append a grant', async () => {
    await assertSucceeds(
      addDoc(collection(asAdmin(env), 'ledger'), {
        uid: UID.p1,
        amount: 250,
        type: 'grant',
        eventId: null,
        note: 'top-up',
        createdBy: UID.admin,
        createdAt: serverTimestamp(),
        balanceAfter: 750,
      }),
    );
  });

  it('denies a back-dated createdAt', async () => {
    await assertFails(
      addDoc(collection(asAdmin(env), 'ledger'), {
        uid: UID.p1,
        amount: 250,
        type: 'grant',
        eventId: null,
        note: null,
        createdBy: UID.admin,
        createdAt: new Date(2020, 0, 1),
        balanceAfter: 750,
      }),
    );
  });

  it('denies an unknown ledger type', async () => {
    await assertFails(
      addDoc(collection(asAdmin(env), 'ledger'), {
        uid: UID.p1,
        amount: 250,
        type: 'bonus',
        eventId: null,
        note: null,
        createdBy: UID.admin,
        createdAt: serverTimestamp(),
        balanceAfter: 750,
      }),
    );
  });

  it('is append-only: an admin cannot update or delete a row', async () => {
    await assertFails(updateDoc(doc(asAdmin(env), 'ledger/row_p1'), { amount: 1 }));
    await assertFails(deleteDoc(doc(asAdmin(env), 'ledger/row_p1')));
  });
});

describe('tokenRequests', () => {
  const request = (overrides: Record<string, unknown> = {}) => ({
    uid: UID.p1,
    displayName: 'p1',
    amount: 250,
    note: null,
    status: 'pending',
    createdAt: serverTimestamp(),
    resolvedBy: null,
    resolvedAt: null,
    ...overrides,
  });

  it('lets a player request tokens', async () => {
    await assertSucceeds(addDoc(collection(asPlayer1(env), 'tokenRequests'), request()));
  });

  it('denies requesting on behalf of someone else', async () => {
    await assertFails(
      addDoc(collection(asPlayer1(env), 'tokenRequests'), request({ uid: UID.p2 })),
    );
  });

  it('denies a self-approved request', async () => {
    await assertFails(
      addDoc(collection(asPlayer1(env), 'tokenRequests'), request({ status: 'approved' })),
    );
  });

  it('denies amounts outside 1..1000', async () => {
    const db = asPlayer1(env);
    await assertFails(addDoc(collection(db, 'tokenRequests'), request({ amount: 0 })));
    await assertFails(addDoc(collection(db, 'tokenRequests'), request({ amount: 1001 })));
    await assertFails(addDoc(collection(db, 'tokenRequests'), request({ amount: 10.5 })));
  });

  it('denies pre-filled resolution fields', async () => {
    await assertFails(
      addDoc(collection(asPlayer1(env), 'tokenRequests'), request({ resolvedBy: UID.admin })),
    );
  });

  it('lets the requester and an admin read it, but not another player', async () => {
    await assertSucceeds(getDoc(doc(asPlayer1(env), 'tokenRequests/req_p1')));
    await assertSucceeds(getDoc(doc(asAdmin(env), 'tokenRequests/req_p1')));
    await assertFails(getDoc(doc(asPlayer2(env), 'tokenRequests/req_p1')));
  });

  it('denies a player resolving their own request', async () => {
    await assertFails(
      updateDoc(doc(asPlayer1(env), 'tokenRequests/req_p1'), {
        status: 'approved',
        resolvedBy: UID.p1,
        resolvedAt: serverTimestamp(),
      }),
    );
  });

  it('lets an admin approve it', async () => {
    await assertSucceeds(
      updateDoc(doc(asAdmin(env), 'tokenRequests/req_p1'), {
        status: 'approved',
        resolvedBy: UID.admin,
        resolvedAt: serverTimestamp(),
      }),
    );
  });

  it('denies an admin rewriting the amount or reopening it', async () => {
    const db = asAdmin(env);
    await assertFails(updateDoc(doc(db, 'tokenRequests/req_p1'), { amount: 99999 }));
    await assertFails(updateDoc(doc(db, 'tokenRequests/req_p1'), { status: 'pending' }));
  });
});

describe('comments', () => {
  const path = `events/${EVT.locked}/comments`;
  const comment = (overrides: Record<string, unknown> = {}) => ({
    uid: UID.p1,
    displayName: 'p1',
    boutId: BOUT.main,
    text: 'what a finish',
    emoji: null,
    createdAt: serverTimestamp(),
    ...overrides,
  });

  it('lets a signed-in player post and read', async () => {
    await assertSucceeds(addDoc(collection(asPlayer1(env), path), comment()));
    await assertSucceeds(getDocs(collection(asPlayer2(env), path)));
  });

  it('denies posting under another uid', async () => {
    await assertFails(addDoc(collection(asPlayer1(env), path), comment({ uid: UID.p2 })));
  });

  it('denies text over 280 characters and empty text with no emoji', async () => {
    const db = asPlayer1(env);
    await assertFails(addDoc(collection(db, path), comment({ text: 'x'.repeat(281) })));
    await assertFails(addDoc(collection(db, path), comment({ text: '' })));
  });

  it('allows a standalone reaction — empty text with an emoji', async () => {
    await assertSucceeds(
      addDoc(collection(asPlayer1(env), path), comment({ text: '', emoji: '🔥' })),
    );
  });

  it('denies a client-supplied createdAt', async () => {
    await assertFails(
      addDoc(collection(asPlayer1(env), path), comment({ createdAt: new Date(2020, 0, 1) })),
    );
  });

  it('is never editable', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(dbOf(ctx), `${path}/c1`), {
        uid: UID.p1,
        displayName: 'p1',
        boutId: null,
        text: 'original',
        emoji: null,
        createdAt: new Date(),
      });
    });
    await assertFails(updateDoc(doc(asPlayer1(env), `${path}/c1`), { text: 'edited' }));
    await assertFails(updateDoc(doc(asAdmin(env), `${path}/c1`), { text: 'edited' }));
  });

  it('is deletable by its author or an admin, but not by another player', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = dbOf(ctx);
      for (const id of ['c1', 'c2']) {
        await setDoc(doc(db, `${path}/${id}`), {
          uid: UID.p1,
          displayName: 'p1',
          boutId: null,
          text: 'trash talk',
          emoji: null,
          createdAt: new Date(),
        });
      }
    });
    await assertFails(deleteDoc(doc(asPlayer2(env), `${path}/c1`)));
    await assertSucceeds(deleteDoc(doc(asPlayer1(env), `${path}/c1`)));
    await assertSucceeds(deleteDoc(doc(asAdmin(env), `${path}/c2`)));
  });
});
