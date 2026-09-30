import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp, type Firestore } from 'firebase/firestore';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Seeded principals. `p3` is signed in but never allowlisted. */
export const UID = {
  admin: 'uid_admin',
  p1: 'uid_p1',
  p2: 'uid_p2',
  p3: 'uid_p3',
} as const;

export const EMAIL = {
  admin: 'admin@test.dev',
  p1: 'p1@test.dev',
  p2: 'p2@test.dev',
  p3: 'nobody@test.dev',
} as const;

/** Event ids used across the suites. */
export const EVT = {
  open: 'evt_open',
  pastLock: 'evt_past_lock',
  locked: 'evt_locked',
  scheduled: 'evt_scheduled',
} as const;

export const BOUT = {
  main: 'bout_main',
  co: 'bout_co',
  third: 'bout_third',
} as const;

export async function createEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    // `demo-` prefix: the emulator needs no credentials, and it matches the --project in
    // the `test:rules` script so firebase.json's singleProjectMode stays happy.
    projectId: 'demo-fight-club',
    firestore: {
      rules: readFileSync(path.join(repoRoot, 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
}

/** Signed in as an admin uid (listed in `config/app.admins`). */
export function asAdmin(env: RulesTestEnvironment): Firestore {
  return ctx(env, UID.admin, EMAIL.admin);
}

/** Signed in, allowlisted, balance 500. */
export function asPlayer1(env: RulesTestEnvironment): Firestore {
  return ctx(env, UID.p1, EMAIL.p1);
}

/** Signed in, allowlisted, balance 10 — too poor for the default 100-token buy-in. */
export function asPlayer2(env: RulesTestEnvironment): Firestore {
  return ctx(env, UID.p2, EMAIL.p2);
}

/** Signed in but not on the allowlist and with no profile. */
export function asStranger(env: RulesTestEnvironment): Firestore {
  return ctx(env, UID.p3, EMAIL.p3);
}

export function asAnon(env: RulesTestEnvironment): Firestore {
  return dbOf(env.unauthenticatedContext());
}

function ctx(env: RulesTestEnvironment, uid: string, email: string): Firestore {
  return dbOf(env.authenticatedContext(uid, { email, email_verified: true }));
}

/**
 * `RulesTestContext.firestore()` is declared as the *compat* `Firestore` in
 * @firebase/rules-unit-testing v5 but returns a modular one, which is what the modular `doc()` /
 * `setDoc()` helpers need. One cast here keeps every call site honestly typed.
 */
export function dbOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore;
}

/** A valid three-bout pick map: stakes 50..400, multiples of 25. */
export function validPicks(): Record<string, { winner: string; method: string; stake: number }> {
  return {
    [BOUT.main]: { winner: 'A', method: 'KO', stake: 400 },
    [BOUT.co]: { winner: 'B', method: 'DEC', stake: 350 },
    [BOUT.third]: { winner: 'A', method: 'SUB', stake: 250 },
  };
}

/** A complete, valid entry document for `uid`. */
export function validEntry(uid: string): Record<string, unknown> {
  return {
    uid,
    displayName: uid,
    photoURL: null,
    picks: validPicks(),
    lockBoutId: BOUT.main,
    firstBlood: { boutId: BOUT.main, fighter: 'A' },
    status: 'submitted',
    submittedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    charged: false,
    score: null,
    rank: null,
    payout: null,
  };
}

function minutesFromNow(minutes: number): Timestamp {
  return Timestamp.fromMillis(Date.now() + minutes * 60_000);
}

/**
 * Writes the fixture world with rules disabled: config, allowlist, two players, four events in
 * different statuses, bouts, one entry per event for p2, a ledger row and a token request.
 */
export async function seed(env: RulesTestEnvironment): Promise<void> {
  await env.withSecurityRulesDisabled(async (context: RulesTestContext) => {
    const db = dbOf(context);
    const set = (p: string, data: Record<string, unknown>) => setDoc(doc(db, p), data);

    await set('config/app', {
      admins: [UID.admin],
      seasonId: '2026',
      defaults: {
        buyIn: 100,
        startingGrant: 500,
        budget: 1000,
        minStake: 50,
        maxStake: 400,
        stakeStep: 25,
        methodMultipliers: { KO: 0.75, SUB: 1, DEC: 0.5 },
        lockPenaltyPct: 0.5,
        firstBloodBonus: 100,
      },
      autoEnableNumbered: true,
      rulesVersion: 'v2.0',
    });

    for (const [key, uid] of [
      ['admin', UID.admin],
      ['p1', UID.p1],
      ['p2', UID.p2],
    ] as const) {
      await set(`allowlist/${EMAIL[key]}`, {
        email: EMAIL[key],
        role: key === 'admin' ? 'admin' : 'player',
        startingGrant: 500,
        invitedBy: UID.admin,
        invitedAt: Timestamp.now(),
        claimedBy: uid,
        claimedAt: Timestamp.now(),
      });
    }

    for (const [key, uid, balance] of [
      ['admin', UID.admin, 1000],
      ['p1', UID.p1, 500],
      ['p2', UID.p2, 10],
    ] as const) {
      await set(`users/${uid}`, {
        displayName: key,
        username: key,
        usernameLower: key,
        photoURL: null,
        email: EMAIL[key],
        role: key === 'admin' ? 'admin' : 'player',
        balance,
        createdAt: Timestamp.now(),
        lastSeenAt: Timestamp.now(),
      });
      await set(`usernames/${key}`, { uid });
    }

    const baseEvent = {
      name: 'UFC 320',
      subtitle: 'Ankalaev vs. Pereira 2',
      number: 320,
      kind: 'numbered',
      enabled: true,
      startsAt: minutesFromNow(120),
      buyIn: 100,
      budget: 1000,
      firstBloodEnabled: true,
      mainCardBoutIds: [BOUT.main, BOUT.co, BOUT.third],
      paidEntrants: 0,
      pot: 0,
      venue: null,
      source: 'espn',
      espnId: '600054861',
      updatedAt: Timestamp.now(),
      finalizedAt: null,
      rulesVersion: 'v2.0',
    };

    await set(`events/${EVT.open}`, { ...baseEvent, status: 'open', lockAt: minutesFromNow(60) });
    // lockAt one second in the past: the window is shut even though status is still 'open'.
    await set(`events/${EVT.pastLock}`, {
      ...baseEvent,
      status: 'open',
      lockAt: Timestamp.fromMillis(Date.now() - 1000),
    });
    await set(`events/${EVT.locked}`, {
      ...baseEvent,
      status: 'locked',
      lockAt: Timestamp.fromMillis(Date.now() - 60_000),
    });
    await set(`events/${EVT.scheduled}`, {
      ...baseEvent,
      enabled: false,
      status: 'scheduled',
      lockAt: minutesFromNow(60),
    });

    for (const eventId of Object.values(EVT)) {
      let order = 1;
      for (const boutId of [BOUT.main, BOUT.co, BOUT.third]) {
        await set(`events/${eventId}/bouts/${boutId}`, {
          order,
          weightClass: 'Light Heavyweight',
          rounds: order === 1 ? 5 : 3,
          isMainEvent: order === 1,
          isMainCard: true,
          a: { fighterId: 'ftr_a', name: 'Fighter A', record: '10-0-0', headshotUrl: null },
          b: { fighterId: 'ftr_b', name: 'Fighter B', record: '9-1-0', headshotUrl: null },
          odds: { a: -150, b: 130, source: 'espn', updatedAt: Timestamp.now(), frozen: false },
          status: 'scheduled',
          result: null,
        });
        order += 1;
      }
      // p2 has an entry everywhere, so other players' read access can be checked per status.
      await set(`events/${eventId}/entries/${UID.p2}`, validEntry(UID.p2));
    }

    await set('ledger/row_p1', {
      uid: UID.p1,
      amount: 500,
      type: 'grant',
      eventId: null,
      note: 'starting grant',
      createdBy: UID.admin,
      createdAt: Timestamp.now(),
      balanceAfter: 500,
    });
    await set('ledger/row_p2', {
      uid: UID.p2,
      amount: 10,
      type: 'grant',
      eventId: null,
      note: 'starting grant',
      createdBy: UID.admin,
      createdAt: Timestamp.now(),
      balanceAfter: 10,
    });

    await set('tokenRequests/req_p1', {
      uid: UID.p1,
      displayName: 'p1',
      amount: 250,
      note: null,
      status: 'pending',
      createdAt: Timestamp.now(),
      resolvedBy: null,
      resolvedAt: null,
    });

    await set('jobRuns/ingest-events', {
      lastRunAt: Timestamp.now(),
      ok: true,
      summary: 'seeded',
      error: null,
    });

    await set('seasons/2026', { seasonId: '2026' });
    await set(`seasons/2026/standings/${UID.p1}`, {
      uid: UID.p1,
      displayName: 'p1',
      points: 3,
      events: 1,
      wins: 1,
      podiums: 1,
      netTokens: 400,
      correctWinners: 4,
      upsets: 1,
      updatedAt: Timestamp.now(),
    });
  });
}
