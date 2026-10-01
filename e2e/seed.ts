// Seeds just an admin and one open event — deliberately no players, unlike
// `jobs/seed-emulator.ts` (docs/PROGRESS.md backlog, T12), so the e2e spec can drive the whole
// invite -> signup -> onboarding loop itself. Run inside `firebase emulators:exec` (see
// `npm run test:e2e`); writes `e2e/.generated/seed.json` for the spec to read back.
import './emulatorEnv.ts';
import { mkdir, writeFile } from 'node:fs/promises';
import { Timestamp } from 'firebase-admin/firestore';
import {
  DEFAULTS,
  RULES_VERSION,
  boutId,
  eventId,
  fighterId,
  parseEventNumber,
  type AppConfig,
  type Bout,
  type Event,
  type Fighter,
} from '../shared/index.ts';
import scoreboard from '../fixtures/espn/scoreboard-upcoming.json' with { type: 'json' };
import { getAdmin } from '../jobs/lib/admin.ts';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './testUsers.ts';

function titleCaseWeightClass(abbreviation: string): string {
  return abbreviation.startsWith('W ') ? `Women's ${abbreviation.slice(2)}` : abbreviation;
}

async function seedAdmin(): Promise<string> {
  const { auth, db } = getAdmin();
  const now = Timestamp.now();
  const userRecord = await auth.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    displayName: 'Admin',
    emailVerified: true,
  });

  const batch = db.batch();
  batch.set(db.collection('allowlist').doc(ADMIN_EMAIL), {
    email: ADMIN_EMAIL,
    role: 'admin',
    startingGrant: DEFAULTS.startingGrant,
    invitedBy: 'system',
    invitedAt: now,
    claimedBy: userRecord.uid,
    claimedAt: now,
  });
  batch.set(db.collection('users').doc(userRecord.uid), {
    displayName: 'Admin',
    username: 'admin',
    usernameLower: 'admin',
    photoURL: null,
    email: ADMIN_EMAIL,
    role: 'admin',
    balance: DEFAULTS.startingGrant,
    createdAt: now,
    lastSeenAt: now,
  });
  batch.set(db.collection('usernames').doc('admin'), { uid: userRecord.uid });
  batch.set(db.collection('ledger').doc(), {
    uid: userRecord.uid,
    amount: DEFAULTS.startingGrant,
    type: 'grant',
    eventId: null,
    note: 'seed grant',
    createdBy: 'system',
    createdAt: now,
    balanceAfter: DEFAULTS.startingGrant,
  });
  await batch.commit();
  return userRecord.uid;
}

async function seedConfig(adminUid: string): Promise<void> {
  const { db } = getAdmin();
  const config: AppConfig = {
    admins: [adminUid],
    seasonId: '2026',
    defaults: DEFAULTS,
    autoEnableNumbered: true,
    rulesVersion: RULES_VERSION,
  };
  await db.collection('config').doc('app').set(config);
}

interface SeededBout {
  boutId: string;
  competitionId: string;
}

/** Mirrors `jobs/seed-emulator.ts`'s `seedEvent` (same fixture, same main-card slice). */
async function seedEvent(): Promise<{
  eventId: string;
  espnEventId: string;
  lockAtMillis: number;
  mainCard: SeededBout[];
}> {
  const { db } = getAdmin();
  const now = Timestamp.now();
  const lockAtMillis = now.toMillis() + 2 * 24 * 60 * 60 * 1000;
  const lockAt = Timestamp.fromMillis(lockAtMillis);

  const espnEvent = scoreboard.events[0]!;
  const evtId = eventId(espnEvent.id);
  const [, subtitle] = espnEvent.name.split(': ');

  const mainCard = espnEvent.competitions.slice(-5).reverse();
  const boutIds: string[] = [];
  const seeded: SeededBout[] = [];

  const batch = db.batch();
  const seenFighters = new Set<string>();

  mainCard.forEach((competition, index) => {
    const order = index + 1;
    const [a, b] = competition.competitors;
    if (!a || !b) throw new Error(`bout ${competition.id} is missing a competitor`);

    const bId = boutId(competition.id);
    boutIds.push(bId);
    seeded.push({ boutId: bId, competitionId: competition.id });

    const bout: Bout<Timestamp> = {
      order,
      weightClass: titleCaseWeightClass(competition.type.abbreviation),
      rounds: order === 1 ? 5 : 3,
      isMainEvent: order === 1,
      isMainCard: true,
      a: {
        fighterId: fighterId(a.id),
        name: a.athlete.fullName,
        record: a.records[0]?.summary ?? '0-0-0',
        headshotUrl: null,
      },
      b: {
        fighterId: fighterId(b.id),
        name: b.athlete.fullName,
        record: b.records[0]?.summary ?? '0-0-0',
        headshotUrl: null,
      },
      odds: { a: null, b: null, source: 'default', updatedAt: now, frozen: false },
      status: 'scheduled',
      result: null,
    };
    batch.set(db.collection('events').doc(evtId).collection('bouts').doc(bId), bout);

    for (const competitor of [a, b]) {
      if (seenFighters.has(competitor.id)) continue;
      seenFighters.add(competitor.id);
      const fighter: Fighter<Timestamp> = {
        name: competitor.athlete.fullName,
        nickname: null,
        record: competitor.records[0]?.summary ?? '0-0-0',
        country: competitor.athlete.flag?.alt ?? null,
        headshotUrl: null,
        espnId: competitor.id,
        updatedAt: now,
      };
      batch.set(db.collection('fighters').doc(fighterId(competitor.id)), fighter);
    }
  });

  const venue = mainCard[0]?.venue;
  const event: Event<Timestamp> = {
    name: espnEvent.name,
    subtitle: subtitle ?? null,
    number: parseEventNumber(espnEvent.shortName),
    kind: 'numbered',
    enabled: true,
    startsAt: Timestamp.fromMillis(Date.parse(espnEvent.date)),
    lockAt,
    status: 'open',
    buyIn: DEFAULTS.buyIn,
    budget: DEFAULTS.budget,
    firstBloodEnabled: true,
    mainCardBoutIds: boutIds,
    paidEntrants: 0,
    pot: 0,
    venue: venue ? `${venue.fullName}, ${venue.address.city}, ${venue.address.state}` : null,
    source: 'espn',
    espnId: espnEvent.id,
    updatedAt: now,
    finalizedAt: null,
    rulesVersion: RULES_VERSION,
  };
  batch.set(db.collection('events').doc(evtId), event);

  await batch.commit();
  return { eventId: evtId, espnEventId: espnEvent.id, lockAtMillis, mainCard: seeded };
}

async function main(): Promise<void> {
  const adminUid = await seedAdmin();
  await seedConfig(adminUid);
  const { eventId: evtId, espnEventId, lockAtMillis, mainCard } = await seedEvent();

  await mkdir(new URL('./.generated/', import.meta.url), { recursive: true });
  await writeFile(
    new URL('./.generated/seed.json', import.meta.url),
    JSON.stringify({ adminUid, eventId: evtId, espnEventId, lockAtMillis, mainCard }, null, 2),
  );
  console.log(`[e2e seed] admin ${adminUid}, event ${evtId}, ${mainCard.length} main-card bouts`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
