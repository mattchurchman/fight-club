// Seeds the Firebase emulators for local dev (docs/tasks/T05-firebase-wiring.md).
// Run with `npm run seed` while `npm run emulators` is running in another terminal.
import { Timestamp } from 'firebase-admin/firestore';
import {
  DEFAULTS,
  RULES_VERSION,
  boutId,
  eventId,
  fighterId,
  parseEventNumber,
  type AppConfig,
  type AllowlistEntry,
  type Bout,
  type Event,
  type Fighter,
  type LedgerRow,
  type User,
  type UsernameRecord,
} from '@shared/index.ts';
import scoreboard from '../fixtures/espn/scoreboard-upcoming.json' with { type: 'json' };
import { getAdmin } from './lib/admin.ts';
import { log } from './lib/log.ts';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error(
    'seed-emulator refuses to run without FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST set.\n' +
      'Start the emulators first (`npm run emulators`), then run `npm run seed` in another terminal.',
  );
  process.exit(1);
}

const SEED_PASSWORD = 'password123';
const SEED_PEOPLE = [
  { email: 'admin@test.dev', username: 'admin', displayName: 'Admin', role: 'admin' as const },
  { email: 'p1@test.dev', username: 'p1', displayName: 'Player One', role: 'player' as const },
  { email: 'p2@test.dev', username: 'p2', displayName: 'Player Two', role: 'player' as const },
  { email: 'p3@test.dev', username: 'p3', displayName: 'Player Three', role: 'player' as const },
];

function titleCaseWeightClass(abbreviation: string): string {
  return abbreviation.startsWith('W ') ? `Women's ${abbreviation.slice(2)}` : abbreviation;
}

async function seedAuthAndUsers(): Promise<string> {
  const { auth, db } = getAdmin();
  const now = Timestamp.now();
  let adminUid = '';

  for (const person of SEED_PEOPLE) {
    const userRecord = await auth.createUser({
      email: person.email,
      password: SEED_PASSWORD,
      displayName: person.displayName,
      emailVerified: true,
    });
    if (person.role === 'admin') adminUid = userRecord.uid;

    const emailLower = person.email.toLowerCase();
    const allowlistEntry: AllowlistEntry<Timestamp> = {
      email: emailLower,
      role: person.role,
      startingGrant: DEFAULTS.startingGrant,
      invitedBy: 'system',
      invitedAt: now,
      claimedBy: userRecord.uid,
      claimedAt: now,
    };

    const user: User<Timestamp> = {
      displayName: person.displayName,
      username: person.username,
      usernameLower: person.username,
      photoURL: null,
      email: emailLower,
      role: person.role,
      balance: DEFAULTS.startingGrant,
      createdAt: now,
      lastSeenAt: now,
    };

    const usernameRecord: UsernameRecord = { uid: userRecord.uid };

    const ledgerRow: LedgerRow<Timestamp> = {
      uid: userRecord.uid,
      amount: DEFAULTS.startingGrant,
      type: 'grant',
      eventId: null,
      note: 'seed grant',
      createdBy: 'system',
      createdAt: now,
      balanceAfter: DEFAULTS.startingGrant,
    };

    const batch = db.batch();
    batch.set(db.collection('allowlist').doc(emailLower), allowlistEntry);
    batch.set(db.collection('users').doc(userRecord.uid), user);
    batch.set(db.collection('usernames').doc(person.username), usernameRecord);
    batch.set(db.collection('ledger').doc(), ledgerRow);
    await batch.commit();

    log.info('seed-emulator', `seeded ${person.email}`, { uid: userRecord.uid });
  }

  return adminUid;
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

async function seedEvent(): Promise<void> {
  const { db } = getAdmin();
  const now = Timestamp.now();
  const lockAt = Timestamp.fromMillis(now.toMillis() + 2 * 24 * 60 * 60 * 1000);

  const espnEvent = scoreboard.events[0]!;
  const evtId = eventId(espnEvent.id);
  const [, subtitle] = espnEvent.name.split(': ');

  // ESPN orders competitions prelims-first; the last 5 are the main card, main event last.
  const mainCard = espnEvent.competitions.slice(-5).reverse();
  const boutIds: string[] = [];

  const batch = db.batch();
  const seenFighters = new Set<string>();

  mainCard.forEach((competition, index) => {
    const order = index + 1;
    const [a, b] = competition.competitors;
    if (!a || !b) throw new Error(`bout ${competition.id} is missing a competitor`);

    const bId = boutId(competition.id);
    boutIds.push(bId);

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
  log.info('seed-emulator', `seeded event ${evtId}`, { bouts: boutIds.length });
}

async function main(): Promise<void> {
  const adminUid = await seedAuthAndUsers();
  await seedConfig(adminUid);
  await seedEvent();
  log.info('seed-emulator', 'done');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
