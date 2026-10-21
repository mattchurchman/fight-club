// T58 — rules for the public "who's in" marker `events/{evt}/entrants/{uid}`.
// Readable by every member before lock (unlike entries), writable only by its owner, only while
// their entry window is open, and only together with the entry it advertises.
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  asAdmin,
  asPlayer1,
  asStranger,
  createEnv,
  dbOf,
  EVT,
  PROFILE_NAME,
  seed,
  UID,
  validEntry,
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

const entrantPath = (eventId: string, uid: string) => `events/${eventId}/entrants/${uid}`;

function validEntrant(uid: string): Record<string, unknown> {
  return {
    uid,
    displayName: PROFILE_NAME[uid] ?? uid,
    photoURL: null,
    submittedAt: Timestamp.now(),
  };
}

/** The real client flow: entry + marker in one batch (src/features/picks/usePickDraft.ts). */
function submitBatch(db: Firestore, eventId: string, uid: string, entrant = validEntrant(uid)) {
  const batch = writeBatch(db);
  batch.set(doc(db, `events/${eventId}/entries/${uid}`), validEntry(uid));
  batch.set(doc(db, entrantPath(eventId, uid)), entrant);
  return batch.commit();
}

/** p2 already has an entry everywhere (helpers.seed); give them a marker too. */
async function seedEntrant(eventId: string, uid: string): Promise<void> {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(dbOf(context), entrantPath(eventId, uid)), validEntrant(uid));
  });
}

describe('entrants read', () => {
  it('lets a signed-in player list entrants before lock, while entries stay hidden', async () => {
    await seedEntrant(EVT.open, UID.p2);
    const db = asPlayer1(env);
    await assertSucceeds(getDocs(collection(db, `events/${EVT.open}/entrants`)));
    await assertFails(getDocs(collection(db, `events/${EVT.open}/entries`)));
  });

  it('denies a signed-in non-member', async () => {
    await seedEntrant(EVT.open, UID.p2);
    await assertFails(getDocs(collection(asStranger(env), `events/${EVT.open}/entrants`)));
  });
});

describe('entrants create', () => {
  it('allows the owner to write their marker with their entry in one batch', async () => {
    await assertSucceeds(submitBatch(asPlayer1(env), EVT.open, UID.p1));
  });

  it('denies a marker with no entry behind it', async () => {
    await assertFails(
      setDoc(doc(asPlayer1(env), entrantPath(EVT.open, UID.p1)), validEntrant(UID.p1)),
    );
  });

  it('allows re-setting the marker once the entry exists (edit / backfill)', async () => {
    await seedEntrant(EVT.open, UID.p1);
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(dbOf(context), `events/${EVT.open}/entries/${UID.p1}`), validEntry(UID.p1));
    });
    await assertSucceeds(
      setDoc(doc(asPlayer1(env), entrantPath(EVT.open, UID.p1)), validEntrant(UID.p1)),
    );
  });

  it("denies writing into another player's marker", async () => {
    await assertFails(
      setDoc(doc(asPlayer1(env), entrantPath(EVT.open, UID.p2)), validEntrant(UID.p2)),
    );
  });

  it('denies a marker whose uid field does not match the doc id', async () => {
    await assertFails(
      submitBatch(asPlayer1(env), EVT.open, UID.p1, { ...validEntrant(UID.p1), uid: UID.p2 }),
    );
  });

  it('denies extra keys', async () => {
    await assertFails(
      submitBatch(asPlayer1(env), EVT.open, UID.p1, { ...validEntrant(UID.p1), picks: {} }),
    );
  });

  it('denies a missing key', async () => {
    await assertFails(
      submitBatch(asPlayer1(env), EVT.open, UID.p1, {
        uid: UID.p1,
        displayName: PROFILE_NAME[UID.p1],
        submittedAt: Timestamp.now(),
      }),
    );
  });

  it('denies a spoofed displayName or photoURL', async () => {
    await assertFails(
      submitBatch(asPlayer1(env), EVT.open, UID.p1, {
        ...validEntrant(UID.p1),
        displayName: 'The Champ',
      }),
    );
    await assertFails(
      submitBatch(asPlayer1(env), EVT.open, UID.p1, {
        ...validEntrant(UID.p1),
        photoURL: 'https://example.test/not-mine.png',
      }),
    );
  });

  it('denies a marker one second after lockAt', async () => {
    await assertFails(submitBatch(asPlayer1(env), EVT.pastLock, UID.p1));
  });

  it('denies a marker once the event is locked', async () => {
    await assertFails(submitBatch(asPlayer1(env), EVT.locked, UID.p1));
  });

  it('denies a marker on a scheduled, not-yet-enabled event', async () => {
    await assertFails(submitBatch(asPlayer1(env), EVT.scheduled, UID.p1));
  });
});

describe('entrants delete', () => {
  it('denies a player deleting their own marker, and allows an admin', async () => {
    await seedEntrant(EVT.open, UID.p1);
    await assertFails(deleteDoc(doc(asPlayer1(env), entrantPath(EVT.open, UID.p1))));
    await assertSucceeds(deleteDoc(doc(asAdmin(env), entrantPath(EVT.open, UID.p1))));
  });
});

describe('entrants admin write', () => {
  it('lets an admin write a marker with no entry and no profile match', async () => {
    await assertSucceeds(
      setDoc(doc(asAdmin(env), entrantPath(EVT.locked, UID.p1)), {
        uid: UID.p1,
        displayName: 'backfilled',
        photoURL: null,
        submittedAt: serverTimestamp(),
      }),
    );
  });
});
