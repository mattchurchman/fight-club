import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { asAdmin, asPlayer1, asStranger, createEnv, dbOf, EMAIL, seed, UID } from './helpers.ts';

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

/** A profile + username pair written in one batch, as onboarding (T12) will do. */
function signUpBatch(
  db: Firestore,
  uid: string,
  email: string,
  overrides: Record<string, unknown> = {},
  username = 'newbie',
) {
  const batch = writeBatch(db);
  batch.set(doc(db, `users/${uid}`), {
    displayName: 'Newbie',
    username,
    usernameLower: username.toLowerCase(),
    photoURL: null,
    email,
    role: 'player',
    balance: 0,
    createdAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
    ...overrides,
  });
  batch.set(doc(db, `usernames/${username.toLowerCase()}`), { uid });
  return batch.commit();
}

describe('users create', () => {
  it('allows an allowlisted user to create their own profile with a username doc', async () => {
    // p3's email is allowlisted for this test only.
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(dbOf(ctx), `allowlist/${EMAIL.p3}`), {
        email: EMAIL.p3,
        role: 'player',
        startingGrant: 500,
        invitedBy: UID.admin,
        claimedBy: null,
        claimedAt: null,
      });
    });
    await assertSucceeds(signUpBatch(asStranger(env), UID.p3, EMAIL.p3));
  });

  it('denies a non-allowlisted user', async () => {
    await assertFails(signUpBatch(asStranger(env), UID.p3, EMAIL.p3));
  });

  it('denies creating a profile for someone else', async () => {
    await assertFails(signUpBatch(asPlayer1(env), 'uid_someone_else', EMAIL.p1, {}, 'imposter'));
  });

  it('denies a non-zero starting balance', async () => {
    await assertFails(signUpBatch(asPlayer1(env), UID.p1, EMAIL.p1, { balance: 5000 }, 'p1new'));
  });

  it('denies self-promotion to admin at create time', async () => {
    await assertFails(signUpBatch(asPlayer1(env), UID.p1, EMAIL.p1, { role: 'admin' }, 'p1new'));
  });

  it('denies a mismatched email', async () => {
    await assertFails(signUpBatch(asPlayer1(env), UID.p1, EMAIL.p1, { email: EMAIL.p2 }, 'p1new'));
  });

  it('denies a profile with no matching usernames doc in the batch', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(dbOf(ctx), `allowlist/${EMAIL.p3}`), {
        email: EMAIL.p3,
        role: 'player',
        startingGrant: 500,
        invitedBy: UID.admin,
        claimedBy: null,
        claimedAt: null,
      });
    });
    const db = asStranger(env);
    await assertFails(
      setDoc(doc(db, `users/${UID.p3}`), {
        displayName: 'Newbie',
        username: 'newbie',
        usernameLower: 'newbie',
        photoURL: null,
        email: EMAIL.p3,
        role: 'player',
        balance: 0,
        createdAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
      }),
    );
  });

  it('denies extra fields such as a pre-baked stats block', async () => {
    await assertFails(
      signUpBatch(asPlayer1(env), UID.p1, EMAIL.p1, { stats: { events: 99 } }, 'p1new'),
    );
  });
});

describe('users update', () => {
  it('lets the owner update profile fields', async () => {
    await assertSucceeds(
      updateDoc(doc(asPlayer1(env), `users/${UID.p1}`), {
        displayName: 'Player One',
        photoURL: 'https://example.test/a.png',
        lastSeenAt: serverTimestamp(),
      }),
    );
  });

  it('denies a player writing their own balance', async () => {
    await assertFails(updateDoc(doc(asPlayer1(env), `users/${UID.p1}`), { balance: 99999 }));
  });

  it('denies a player promoting themselves to admin', async () => {
    await assertFails(updateDoc(doc(asPlayer1(env), `users/${UID.p1}`), { role: 'admin' }));
  });

  it('denies a player writing their own stats or badges', async () => {
    const db = asPlayer1(env);
    await assertFails(updateDoc(doc(db, `users/${UID.p1}`), { stats: { wins: 10 } }));
    await assertFails(updateDoc(doc(db, `users/${UID.p1}`), { badges: ['goat'] }));
  });

  it("denies editing another player's profile", async () => {
    await assertFails(updateDoc(doc(asPlayer1(env), `users/${UID.p2}`), { displayName: 'Pwned' }));
  });

  it('denies a rename whose usernameLower does not match', async () => {
    await assertFails(
      updateDoc(doc(asPlayer1(env), `users/${UID.p1}`), {
        username: 'Renamed',
        usernameLower: 'other',
      }),
    );
  });

  it("denies renaming onto a username someone else holds", async () => {
    const db = asPlayer1(env);
    // usernames/p2 exists and belongs to uid_p2, so the getAfter ownership check fails.
    await assertFails(
      updateDoc(doc(db, `users/${UID.p1}`), { username: 'p2', usernameLower: 'p2' }),
    );
    // Same attempt, but claiming the uniqueness doc in the same batch — `usernames` is never
    // updatable in place, so this fails too.
    const batch = writeBatch(db);
    batch.update(doc(db, `users/${UID.p1}`), { username: 'p2', usernameLower: 'p2' });
    batch.set(doc(db, 'usernames/p2'), { uid: UID.p1 });
    await assertFails(batch.commit());
  });

  it('denies a rename with no usernames doc to back it', async () => {
    await assertFails(
      updateDoc(doc(asPlayer1(env), `users/${UID.p1}`), {
        username: 'unclaimed',
        usernameLower: 'unclaimed',
      }),
    );
  });

  it('allows a rename that claims a free username in the same batch', async () => {
    const db = asPlayer1(env);
    const batch = writeBatch(db);
    batch.update(doc(db, `users/${UID.p1}`), { username: 'Southpaw', usernameLower: 'southpaw' });
    batch.set(doc(db, 'usernames/southpaw'), { uid: UID.p1 });
    batch.delete(doc(db, 'usernames/p1'));
    await assertSucceeds(batch.commit());
  });

  it('denies an over-long or empty displayName', async () => {
    const db = asPlayer1(env);
    await assertFails(updateDoc(doc(db, `users/${UID.p1}`), { displayName: 'x'.repeat(41) }));
    await assertFails(updateDoc(doc(db, `users/${UID.p1}`), { displayName: '' }));
  });

  it('lets an admin write balance and role', async () => {
    await assertSucceeds(
      updateDoc(doc(asAdmin(env), `users/${UID.p1}`), { balance: 900, role: 'admin' }),
    );
  });

  it('denies deleting a profile, even for an admin', async () => {
    await assertFails(deleteDoc(doc(asAdmin(env), `users/${UID.p1}`)));
  });
});

describe('users read', () => {
  it('lets any signed-in user read profiles', async () => {
    await assertSucceeds(getDoc(doc(asPlayer1(env), `users/${UID.p2}`)));
  });
});

describe('usernames', () => {
  it('denies claiming a name for another uid', async () => {
    await assertFails(setDoc(doc(asPlayer1(env), 'usernames/stolen'), { uid: UID.p2 }));
  });

  it('denies overwriting an existing name in place', async () => {
    await assertFails(setDoc(doc(asPlayer1(env), 'usernames/p2'), { uid: UID.p1 }));
  });

  it('lets an owner free their own name and denies freeing someone else’s', async () => {
    await assertFails(deleteDoc(doc(asPlayer1(env), 'usernames/p2')));
    await assertSucceeds(deleteDoc(doc(asPlayer1(env), 'usernames/p1')));
  });
});

describe('users/{uid}/devices', () => {
  it('is private to its owner', async () => {
    await assertSucceeds(
      setDoc(doc(asPlayer1(env), `users/${UID.p1}/devices/token123`), {
        createdAt: serverTimestamp(),
        platform: 'web',
      }),
    );
    await assertFails(
      setDoc(doc(asPlayer1(env), `users/${UID.p2}/devices/token123`), {
        createdAt: serverTimestamp(),
        platform: 'web',
      }),
    );
    await assertFails(getDoc(doc(asPlayer1(env), `users/${UID.p2}/devices/token123`)));
  });
});
