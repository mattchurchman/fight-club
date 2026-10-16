// `npm run sim` (docs/tasks/T49) — rehearses a whole fight night against the local emulators
// through the real lifecycle code (jobs/lifecycle.ts): lock, each result, finalize & pay out. Lets
// the owner watch the app during and after an event before a real one. Never touches production —
// see docs/SETUP.md "Rehearse a fight night".
//
// Usage: npm run sim [-- --reset] [-- --auto <seconds>]
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { Timestamp } from 'firebase-admin/firestore';
import {
  DEFAULTS,
  RULES_VERSION,
  boutId,
  fighterId,
  parseEventNumber,
  type AllowlistEntry,
  type Bout,
  type BoutResult,
  type Entry,
  type Event,
  type Fighter,
  type LedgerRow,
  type User,
  type UsernameRecord,
} from '@shared/index.ts';
import scoreboard from '../fixtures/espn/scoreboard-upcoming.json' with { type: 'json' };
import { getAdmin } from './lib/admin.ts';
import { log } from './lib/log.ts';
import { buildFriendEntry, fightNightOrder, scriptedResult } from './lib/sim-script.ts';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error(
    'simulate-night refuses to run without FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST set.\n' +
      'Start the emulators first (`npm run emulators`), then run `npm run sim` in another terminal.',
  );
  process.exit(1);
}

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const EVENT_ID = 'evt_sim';
const SIM_PASSWORD = 'password123';
/** p4–p6 are added on top of seed-emulator's p1–p3, the same way it adds them. */
const SIM_FRIENDS = [
  { email: 'p4@test.dev', username: 'p4', displayName: 'Player Four' },
  { email: 'p5@test.dev', username: 'p5', displayName: 'Player Five' },
  { email: 'p6@test.dev', username: 'p6', displayName: 'Player Six' },
] as const;
/** Everyone except `p1` gets an entry — the owner makes their own in the app. */
const PICKING_EMAILS = ['p2@test.dev', 'p3@test.dev', ...SIM_FRIENDS.map((f) => f.email)];

interface CliArgs {
  reset: boolean;
  autoSeconds: number | null;
}

function parseArgs(argv: string[]): CliArgs {
  const i = argv.indexOf('--auto');
  let autoSeconds: number | null = null;
  if (i !== -1) {
    autoSeconds = Number(argv[i + 1]);
    if (!Number.isFinite(autoSeconds)) throw new Error('--auto needs a number of seconds, e.g. --auto 1');
  }
  return { reset: argv.includes('--reset'), autoSeconds };
}

function runLifecycleLive(nowIso: string, fixturePath: string): void {
  execFileSync(
    'npx',
    ['tsx', 'jobs/lifecycle.ts', '--live', '--now', nowIso, '--event', EVENT_ID, '--fixture', fixturePath],
    { cwd: REPO_ROOT, env: process.env, stdio: 'pipe' },
  );
}

/** An empty status map: lifecycle finds no ESPN result for any bout, so manual results always win. */
async function writeNoResultsFixture(): Promise<string> {
  const dir = new URL('./.generated/', import.meta.url);
  await mkdir(dir, { recursive: true });
  const path = new URL('./.generated/sim-no-results.json', import.meta.url);
  await writeFile(path, '{}');
  return fileURLToPath(path);
}

// ---- Setup ----

async function resetSimDocs(): Promise<void> {
  const { db } = getAdmin();
  await db.recursiveDelete(db.collection('events').doc(EVENT_ID));
  const ledgerSnap = await db.collection('ledger').where('eventId', '==', EVENT_ID).get();
  await Promise.all(ledgerSnap.docs.map((doc) => doc.ref.delete()));
  log.info('simulate-night', `--reset: wiped ${EVENT_ID} and its ledger rows`);
}

async function ensureSeeded(): Promise<void> {
  const { db } = getAdmin();
  const config = await db.collection('config').doc('app').get();
  if (config.exists) return;
  log.info('simulate-night', 'config/app missing — seeding p1–p3 and the admin first');
  execFileSync('npx', ['tsx', 'jobs/seed-emulator.ts'], { cwd: REPO_ROOT, env: process.env, stdio: 'inherit' });
}

async function ensureFriends(): Promise<void> {
  const { auth, db } = getAdmin();
  for (const friend of SIM_FRIENDS) {
    const existing = await auth.getUserByEmail(friend.email).catch(() => null);
    if (existing) continue;

    const userRecord = await auth.createUser({
      email: friend.email,
      password: SIM_PASSWORD,
      displayName: friend.displayName,
      emailVerified: true,
    });
    const now = Timestamp.now();
    const allowlistEntry: AllowlistEntry<Timestamp> = {
      email: friend.email,
      role: 'player',
      startingGrant: DEFAULTS.startingGrant,
      invitedBy: 'system',
      invitedAt: now,
      claimedBy: userRecord.uid,
      claimedAt: now,
    };
    const user: User<Timestamp> = {
      displayName: friend.displayName,
      username: friend.username,
      usernameLower: friend.username,
      photoURL: null,
      email: friend.email,
      role: 'player',
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
      note: 'sim grant',
      createdBy: 'system',
      createdAt: now,
      balanceAfter: DEFAULTS.startingGrant,
    };

    const batch = db.batch();
    batch.set(db.collection('allowlist').doc(friend.email), allowlistEntry);
    batch.set(db.collection('users').doc(userRecord.uid), user);
    batch.set(db.collection('usernames').doc(friend.username), usernameRecord);
    batch.set(db.collection('ledger').doc(), ledgerRow);
    await batch.commit();
    log.info('simulate-night', `seeded friend ${friend.email}`, { uid: userRecord.uid });
  }
}

function titleCaseWeightClass(abbreviation: string): string {
  return abbreviation.startsWith('W ') ? `Women's ${abbreviation.slice(2)}` : abbreviation;
}

interface SimBout {
  boutId: string;
  order: number;
  rounds: 3 | 5;
  a: { name: string };
  b: { name: string };
}

/** Creates `evt_sim` and its bouts from the UFC 332 fixture if they don't already exist, and
 * returns the main card in `order` order either way — so a re-run without `--reset` just continues. */
async function ensureEvent(lockAt: Timestamp): Promise<SimBout[]> {
  const { db } = getAdmin();
  const eventRef = db.collection('events').doc(EVENT_ID);
  const existing = await eventRef.get();
  if (existing.exists) {
    const boutsSnap = await eventRef.collection('bouts').get();
    return boutsSnap.docs
      .map((doc) => {
        const data = doc.data() as Bout<Timestamp>;
        return { boutId: doc.id, order: data.order, rounds: data.rounds, a: data.a, b: data.b };
      })
      .sort((x, y) => x.order - y.order);
  }

  const espnEvent = scoreboard.events[0]!;
  // ESPN orders competitions prelims-first; the last 5 are the main card, main event last.
  const mainCard = espnEvent.competitions.slice(-5).reverse();
  const now = Timestamp.now();
  const batch = db.batch();
  const seenFighters = new Set<string>();
  const result: SimBout[] = [];

  mainCard.forEach((competition, index) => {
    const order = index + 1;
    const rounds: 3 | 5 = order === 1 ? 5 : 3;
    const [a, b] = competition.competitors;
    if (!a || !b) throw new Error(`bout ${competition.id} is missing a competitor`);
    const bId = boutId(competition.id);
    const odds = scriptedResult(order, rounds).odds;

    const bout: Bout<Timestamp> = {
      order,
      weightClass: titleCaseWeightClass(competition.type.abbreviation),
      rounds,
      isMainEvent: order === 1,
      isMainCard: true,
      a: { fighterId: fighterId(a.id), name: a.athlete.fullName, record: a.records[0]?.summary ?? '0-0-0', headshotUrl: null },
      b: { fighterId: fighterId(b.id), name: b.athlete.fullName, record: b.records[0]?.summary ?? '0-0-0', headshotUrl: null },
      odds: { a: odds.a, b: odds.b, source: 'manual', updatedAt: now, frozen: false },
      status: 'scheduled',
      result: null,
    };
    batch.set(eventRef.collection('bouts').doc(bId), bout);
    result.push({ boutId: bId, order, rounds, a: bout.a, b: bout.b });

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
  const [, subtitle] = espnEvent.name.split(': ');
  const event: Event<Timestamp> = {
    name: `${espnEvent.name} (rehearsal)`,
    subtitle: subtitle ?? null,
    number: parseEventNumber(espnEvent.shortName),
    kind: 'numbered',
    enabled: true,
    startsAt: Timestamp.fromMillis(lockAt.toMillis() - 60 * 60 * 1000),
    lockAt,
    status: 'open',
    buyIn: DEFAULTS.buyIn,
    budget: DEFAULTS.budget,
    firstBloodEnabled: true,
    mainCardBoutIds: result.map((b) => b.boutId),
    paidEntrants: 0,
    pot: 0,
    venue: venue ? `${venue.fullName}, ${venue.address.city}, ${venue.address.state}` : null,
    source: 'espn',
    espnId: espnEvent.id,
    updatedAt: now,
    finalizedAt: null,
    rulesVersion: RULES_VERSION,
  };
  batch.set(eventRef, event);
  await batch.commit();
  log.info('simulate-night', `seeded ${EVENT_ID}`, { bouts: result.length });
  return result.sort((x, y) => x.order - y.order);
}

/** One valid entry per friend, skipping anyone who already has one (so a re-run doesn't clobber picks). */
async function ensureEntries(mainCard: SimBout[]): Promise<void> {
  const { auth, db } = getAdmin();
  const entriesRef = db.collection('events').doc(EVENT_ID).collection('entries');
  const draftBouts = mainCard.map((b) => ({ boutId: b.boutId }));

  for (let i = 0; i < PICKING_EMAILS.length; i++) {
    const email = PICKING_EMAILS[i]!;
    const userRecord = await auth.getUserByEmail(email);
    const existing = await entriesRef.doc(userRecord.uid).get();
    if (existing.exists) continue;

    const draft = buildFriendEntry(i, draftBouts);
    const userSnap = await db.collection('users').doc(userRecord.uid).get();
    const displayName = (userSnap.data() as User<Timestamp> | undefined)?.displayName ?? email;
    const now = Timestamp.now();
    const entry: Entry<Timestamp> = {
      uid: userRecord.uid,
      displayName,
      photoURL: null,
      picks: draft.picks,
      lockBoutId: draft.lockBoutId!,
      firstBlood: draft.firstBlood,
      status: 'submitted',
      submittedAt: now,
      updatedAt: now,
      charged: false,
      score: null,
      rank: null,
      payout: null,
    };
    await entriesRef.doc(userRecord.uid).set(entry);
    log.info('simulate-night', `entry for ${email}`, { uid: userRecord.uid });
  }
}

// ---- Run loop ----

interface Step {
  label: string;
  run: () => Promise<string>;
}

function formatResultLine(bout: SimBout, result: ReturnType<typeof scriptedResult>): string {
  const winnerName = result.winner === 'A' ? bout.a.name : bout.b.name;
  const loserName = result.winner === 'A' ? bout.b.name : bout.a.name;
  const methodLabel = result.method === 'DEC' ? 'DEC' : `${result.method} R${result.round}`;
  return `${winnerName} def. ${loserName} — ${methodLabel}`;
}

async function leaderLine(): Promise<string> {
  const { db } = getAdmin();
  const snap = await db
    .collection('events')
    .doc(EVENT_ID)
    .collection('entries')
    .orderBy('score.total', 'desc')
    .limit(1)
    .get();
  const top = snap.docs[0]?.data() as Entry<Timestamp> | undefined;
  return top?.score ? `leader: ${top.displayName} ${top.score.total.toLocaleString()}` : 'no scores yet';
}

function buildSteps(mainCard: SimBout[], lockAt: Timestamp, fixturePath: string): Step[] {
  const chronological = fightNightOrder(mainCard);
  const steps: Step[] = [
    {
      label: 'Lock picks and freeze odds',
      run: async () => {
        const { auth, db } = getAdmin();
        const owner = await auth.getUserByEmail('p1@test.dev').catch(() => null);
        if (owner) {
          const ownerEntry = await db.collection('events').doc(EVENT_ID).collection('entries').doc(owner.uid).get();
          if (!ownerEntry.exists) log.info('simulate-night', 'p1 has no entry yet — locking anyway');
        }
        runLifecycleLive(new Date(lockAt.toMillis() + 1000).toISOString(), fixturePath);
        return 'Locked.';
      },
    },
  ];

  chronological.forEach((bout, i) => {
    steps.push({
      label: `Result ${i + 1}/${chronological.length}: ${bout.a.name} vs ${bout.b.name}`,
      run: async () => {
        const { db } = getAdmin();
        const result = scriptedResult(bout.order, bout.rounds);
        const boutResult: BoutResult<Timestamp> = {
          winner: result.winner,
          method: result.method,
          round: result.round,
          time: result.time,
          firstBlood: result.firstBlood,
          source: 'manual',
          updatedAt: Timestamp.now(),
        };
        const eventRef = db.collection('events').doc(EVENT_ID);
        await eventRef.collection('bouts').doc(bout.boutId).set({ status: 'final', result: boutResult }, { merge: true });
        const next = chronological[i + 1];
        if (next) {
          await eventRef.collection('bouts').doc(next.boutId).set({ status: 'live' }, { merge: true });
        }
        runLifecycleLive(new Date().toISOString(), fixturePath);
        return `${formatResultLine(bout, result)} · ${await leaderLine()}`;
      },
    });
  });

  steps.push({
    label: 'Finalize and pay out',
    run: async () => {
      runLifecycleLive(new Date().toISOString(), fixturePath);
      return `Final. ${await leaderLine()}`;
    },
  });

  return steps;
}

async function waitForStep(
  rl: ReturnType<typeof createInterface>,
  autoSeconds: number | null,
): Promise<void> {
  if (autoSeconds !== null) {
    await new Promise((resolve) => setTimeout(resolve, autoSeconds * 1000));
    return;
  }
  await rl.question('Press Enter to continue… ');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.reset) await resetSimDocs();
  await ensureSeeded();
  await ensureFriends();

  const lockAt = Timestamp.fromMillis(Date.now() + 2 * 60 * 1000);
  const mainCard = await ensureEvent(lockAt);
  await ensureEntries(mainCard);
  const fixturePath = await writeNoResultsFixture();
  const steps = buildSteps(mainCard, lockAt, fixturePath);

  console.log(`\n${EVENT_ID} ready — ${mainCard.length} main-card bouts, lock in 2 minutes.`);
  console.log('Sign in as p1@test.dev / password123 on a phone on the same Wi-Fi to pick along.\n');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  for (const [i, step] of steps.entries()) {
    console.log(`\n[${i + 1}/${steps.length}] ${step.label}`);
    await waitForStep(rl, args.autoSeconds);
    const summary = await step.run();
    console.log(`  → ${summary}`);
  }
  rl.close();
  log.info('simulate-night', 'done');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
