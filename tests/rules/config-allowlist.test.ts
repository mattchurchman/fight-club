import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asAdmin, asAnon, asPlayer1, asStranger, createEnv, EMAIL, seed, UID } from './helpers.ts';

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

describe('config/app', () => {
  it('is readable by any signed-in user (the pick builder needs defaults)', async () => {
    const snap = await assertSucceeds(getDoc(doc(asPlayer1(env), 'config/app')));
    expect(snap.data()?.defaults.budget).toBe(1000);
  });

  it('is not readable anonymously', async () => {
    await assertFails(getDoc(doc(asAnon(env), 'config/app')));
  });

  it('cannot be written by a player', async () => {
    await assertFails(
      setDoc(doc(asPlayer1(env), 'config/app'), { admins: [UID.p1] }, { merge: true }),
    );
  });

  it('can be written by an admin', async () => {
    await assertSucceeds(
      setDoc(doc(asAdmin(env), 'config/app'), { seasonId: '2027' }, { merge: true }),
    );
  });
});

describe('allowlist', () => {
  it('lets a signed-in user read their own invite', async () => {
    await assertSucceeds(getDoc(doc(asPlayer1(env), `allowlist/${EMAIL.p1}`)));
  });

  it("denies reading someone else's invite", async () => {
    await assertFails(getDoc(doc(asPlayer1(env), `allowlist/${EMAIL.p2}`)));
  });

  it('lets an admin read any invite', async () => {
    await assertSucceeds(getDoc(doc(asAdmin(env), `allowlist/${EMAIL.p2}`)));
  });

  it('denies a player inviting themselves', async () => {
    await assertFails(
      setDoc(doc(asStranger(env), `allowlist/${EMAIL.p3}`), {
        email: EMAIL.p3,
        role: 'player',
        startingGrant: 500,
        invitedBy: UID.p3,
        claimedBy: null,
        claimedAt: null,
      }),
    );
  });

  it('lets an admin invite and revoke', async () => {
    const db = asAdmin(env);
    await assertSucceeds(
      setDoc(doc(db, 'allowlist/new@test.dev'), {
        email: 'new@test.dev',
        role: 'player',
        startingGrant: 500,
        invitedBy: UID.admin,
        claimedBy: null,
        claimedAt: null,
      }),
    );
    await assertSucceeds(deleteDoc(doc(db, 'allowlist/new@test.dev')));
  });
});

describe('jobRuns', () => {
  it('is readable by an admin only', async () => {
    await assertSucceeds(getDoc(doc(asAdmin(env), 'jobRuns/ingest-events')));
    await assertFails(getDoc(doc(asPlayer1(env), 'jobRuns/ingest-events')));
  });

  it('rejects client writes even from an admin (jobs use the Admin SDK)', async () => {
    await assertFails(
      setDoc(doc(asAdmin(env), 'jobRuns/ingest-events'), { ok: false }, { merge: true }),
    );
  });
});

describe('standings, h2h and fighters', () => {
  it('are readable by signed-in players and writable only by admins', async () => {
    await assertSucceeds(getDoc(doc(asPlayer1(env), `seasons/2026/standings/${UID.p1}`)));
    await assertFails(
      setDoc(
        doc(asPlayer1(env), `seasons/2026/standings/${UID.p1}`),
        { points: 99 },
        { merge: true },
      ),
    );
    await assertSucceeds(
      setDoc(
        doc(asAdmin(env), `seasons/2026/standings/${UID.p1}`),
        { points: 99 },
        { merge: true },
      ),
    );
    await assertFails(setDoc(doc(asPlayer1(env), 'h2h/uid_p1__uid_p2'), { a: UID.p1, b: UID.p2 }));
    await assertSucceeds(
      setDoc(doc(asAdmin(env), 'h2h/uid_p1__uid_p2'), {
        a: UID.p1,
        b: UID.p2,
        aWins: 1,
        bWins: 0,
        ties: 0,
      }),
    );
    await assertFails(setDoc(doc(asPlayer1(env), 'fighters/ftr_123'), { name: 'Hacked' }));
    await assertSucceeds(
      setDoc(doc(asAdmin(env), 'fighters/ftr_123'), { name: 'Real', espnId: '123' }),
    );
  });

  it('hides everything from an anonymous visitor', async () => {
    const db = asAnon(env);
    await assertFails(getDoc(doc(db, 'fighters/ftr_123')));
    await assertFails(getDoc(doc(db, `seasons/2026/standings/${UID.p1}`)));
  });
});

describe('unknown collections', () => {
  it('are denied by the catch-all', async () => {
    await assertFails(getDoc(doc(asAdmin(env), 'secrets/whatever')));
    await assertFails(setDoc(doc(asAdmin(env), 'secrets/whatever'), { x: 1 }));
  });
});
