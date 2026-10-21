// docs/tasks/T57-rebuild-player-records.md — the repair tool for everything derived from a finished
// event: season standings, head-to-heads, `users.stats`, badges and lock streaks. It replays every
// `final` event, oldest first, through today's rules (`shared/lifecycle/rebuild.ts`) and overwrites
// those records with the result, so a rules change or a bad finalize can be undone after the fact.
// It replaces `jobs/backfill-standings.ts`, which only rebuilt standings and h2h.
//
// Tokens are never touched: buy-ins, payouts and the solo-night refund were posted to the ledger at
// finalize and stay as they are. The ledger is read, once per player, only to find the balance each
// event finalized at — the `busted` badge needs it.
//
// Usage: npm run jobs:rebuild [-- --live]
// Default is --dry-run: it reads everything, prints the records it would write, and writes nothing.
import { Timestamp } from 'firebase-admin/firestore';
import type { WriteBatch } from 'firebase-admin/firestore';
import { rebuildRecords } from '@shared/lifecycle/index.ts';
import type { RebuildEvent } from '@shared/lifecycle/index.ts';
import type { LifecycleBout, LifecycleEntry, Millis } from '@shared/lifecycle/index.ts';
import type { Bout, Entry, Event, LedgerRow, User } from '@shared/index.ts';
import { getAdmin } from './lib/admin.ts';
import { log } from './lib/log.ts';

const JOB_NAME = 'rebuild-records';
/** Firestore allows 500 writes per batch; 400 leaves room for the deletes that ride along. */
const BATCH_LIMIT = 400;

interface Args {
  live: boolean;
}

function parseArgs(argv: string[]): Args {
  return { live: argv.includes('--live') && !argv.includes('--dry-run') };
}

// ---- Loading (planner is pure, so timestamps cross as epoch millis, as in jobs/lifecycle.ts) ----

function toLifecycleBout(data: Bout<Timestamp>): LifecycleBout {
  return {
    ...data,
    odds: { ...data.odds, updatedAt: data.odds.updatedAt.toMillis() },
    result: data.result ? { ...data.result, updatedAt: data.result.updatedAt.toMillis() } : null,
  };
}

function toLifecycleEntry(data: Entry<Timestamp>): LifecycleEntry {
  return { ...data, submittedAt: data.submittedAt.toMillis(), updatedAt: data.updatedAt.toMillis() };
}

interface FinalEvent {
  id: string;
  data: Event<Timestamp>;
}

/**
 * Every `final` event, oldest first. The sort is in memory on purpose: an equality filter plus an
 * `orderBy` on another field needs a composite index, and this collection holds a few dozen docs.
 */
async function loadFinalEvents(): Promise<FinalEvent[]> {
  const { db } = getAdmin();
  const snap = await db.collection('events').where('status', '==', 'final').get();
  return snap.docs
    .map((doc) => ({ id: doc.id, data: doc.data() as Event<Timestamp> }))
    .sort((a, b) => a.data.startsAt.toMillis() - b.data.startsAt.toMillis());
}

async function loadEntries(eventId: string): Promise<LifecycleEntry[]> {
  const { db } = getAdmin();
  const snap = await db.collection('events').doc(eventId).collection('entries').get();
  return snap.docs.map((doc) => toLifecycleEntry(doc.data() as Entry<Timestamp>));
}

async function loadBouts(eventId: string): Promise<Record<string, LifecycleBout>> {
  const { db } = getAdmin();
  const snap = await db.collection('events').doc(eventId).collection('bouts').get();
  const bouts: Record<string, LifecycleBout> = {};
  for (const doc of snap.docs) bouts[doc.id] = toLifecycleBout(doc.data() as Bout<Timestamp>);
  return bouts;
}

interface Player {
  uid: string;
  displayName: string;
}

async function loadPlayers(): Promise<Player[]> {
  const { db } = getAdmin();
  const snap = await db.collection('users').get();
  return snap.docs
    .map((doc) => ({ uid: doc.id, displayName: (doc.data() as User<Timestamp>).displayName }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/** One ledger row, reduced to what the balance lookup reads. Oldest first. */
interface LedgerPoint {
  createdAt: Millis;
  eventId: string | null;
  balanceAfter: number;
}

/** The only ledger read in this job: each player's rows, so no event needs a query of its own. */
async function loadLedger(uids: readonly string[]): Promise<Map<string, LedgerPoint[]>> {
  const { db } = getAdmin();
  const rows = new Map<string, LedgerPoint[]>();
  for (const uid of uids) {
    // Served by the `uid asc, createdAt desc` index in firestore.indexes.json.
    const snap = await db
      .collection('ledger')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();
    const points = snap.docs.map((doc) => {
      const row = doc.data() as LedgerRow<Timestamp>;
      return {
        createdAt: row.createdAt.toMillis(),
        eventId: row.eventId,
        balanceAfter: row.balanceAfter,
      };
    });
    points.reverse();
    rows.set(uid, points);
  }
  return rows;
}

/**
 * The balance the event's finalize saw, which is what decided the `busted` badge.
 *
 * This event's own rows come first: the payout row is stamped a moment *after* `finalizedAt`, so a
 * cutoff at `finalizedAt` alone would read the balance before the winnings landed and call a paid
 * player busted. Falls back to the last row before the finalize for an event that paid nobody.
 */
function balanceAtFinalize(
  rows: readonly LedgerPoint[] | undefined,
  eventId: string,
  finalizedAt: Millis | null,
): number | undefined {
  if (!rows || rows.length === 0) return undefined;
  const own = rows.filter((row) => row.eventId === eventId);
  if (own.length > 0) return own[own.length - 1]!.balanceAfter;
  if (finalizedAt === null) return undefined;
  const before = rows.filter((row) => row.createdAt <= finalizedAt);
  return before.length > 0 ? before[before.length - 1]!.balanceAfter : undefined;
}

// ---- Writing ----

interface PendingWrite {
  label: string;
  apply: (batch: WriteBatch) => void;
}

async function flush(writes: readonly PendingWrite[], live: boolean): Promise<void> {
  for (const write of writes) console.log(`  ${write.label}`);
  if (!live) return;
  const { db } = getAdmin();
  for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const write of writes.slice(i, i + BATCH_LIMIT)) write.apply(batch);
    await batch.commit();
  }
}

function badgeSummary(counts: Record<string, number>): string {
  const ids = Object.keys(counts).sort();
  return ids.length === 0 ? 'no badges' : ids.map((id) => `${id} ×${counts[id]}`).join(', ');
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  const { db } = getAdmin();

  const [finals, players] = await Promise.all([loadFinalEvents(), loadPlayers()]);
  if (finals.length === 0) {
    console.log('no final events — nothing to rebuild');
    return;
  }
  const names = new Map(players.map((player) => [player.uid, player.displayName]));
  const ledger = await loadLedger(players.map((player) => player.uid));

  const events: RebuildEvent[] = [];
  for (const { id, data } of finals) {
    const [entries, bouts] = await Promise.all([loadEntries(id), loadBouts(id)]);
    const finalizedAt = data.finalizedAt?.toMillis() ?? null;
    const balanceAfterFinalize: Record<string, number> = {};
    for (const entry of entries) {
      const balance = balanceAtFinalize(ledger.get(entry.uid), id, finalizedAt);
      if (balance !== undefined) balanceAfterFinalize[entry.uid] = balance;
    }
    events.push({
      id,
      name: data.name,
      startsAt: data.startsAt.toMillis(),
      buyIn: data.buyIn,
      bouts,
      entries,
      balanceAfterFinalize,
    });
  }

  const result = rebuildRecords(events, players);
  console.log(`replayed ${events.length} final event(s)`);

  console.log(
    result.soloNights.length === 0
      ? 'solo nights: none'
      : `solo nights: ${result.soloNights
          .map((night) => `${night.name} (${names.get(night.uid) ?? night.displayName})`)
          .join(', ')}`,
  );
  for (const fix of result.entryFixes) {
    console.log(`  entry fix ${fix.eventId}/${fix.uid}: rank → —, payout → 0`);
  }
  for (const stale of result.unsettled) {
    console.log(`  warning: ${stale.eventId}/${stale.uid} is paid but unscored — left out`);
  }

  console.log('player records:');
  for (const user of result.users) {
    const name = names.get(user.uid) ?? user.uid;
    console.log(
      `  ${name}: ${user.stats.points} pts / ${user.stats.wins} wins / ${user.stats.events} events` +
        ` · ${badgeSummary(user.badgeCounts)} · lock streak ${user.lockStreak}`,
    );
  }

  const writes: PendingWrite[] = [];
  const stamp = Timestamp.now();

  for (const fix of result.entryFixes) {
    const ref = db.collection('events').doc(fix.eventId).collection('entries').doc(fix.uid);
    writes.push({
      label: `entry ${fix.eventId}/${fix.uid}`,
      apply: (batch) => batch.set(ref, { rank: fix.rank, payout: fix.payout }, { merge: true }),
    });
  }

  // Every season Firestore knows about, not just the ones that still have events: a season whose
  // only event turns out to be a solo night has to end up empty rather than keep its old rows.
  const seasonIds = new Set(result.standings.keys());
  for (const ref of await db.collection('seasons').listDocuments()) seasonIds.add(ref.id);
  for (const seasonId of [...seasonIds].sort()) {
    const rows = result.standings.get(seasonId) ?? [];
    const col = db.collection('seasons').doc(seasonId).collection('standings');
    const existing = await col.get();
    const keep = new Set(rows.map((row) => row.uid));
    const stale = existing.docs.filter((doc) => !keep.has(doc.id));
    console.log(
      `season ${seasonId}: ${rows.length} player(s)` +
        (stale.length > 0 ? `, ${stale.length} stale row(s) removed` : ''),
    );
    for (const row of rows) {
      writes.push({
        label: `standings ${seasonId}/${row.uid}`,
        apply: (batch) => batch.set(col.doc(row.uid), { ...row, updatedAt: stamp }),
      });
    }
    for (const doc of stale) {
      writes.push({ label: `standings ${seasonId}/${doc.id} (delete)`, apply: (batch) => batch.delete(doc.ref) });
    }
  }

  const h2hCol = db.collection('h2h');
  const h2hExisting = await h2hCol.get();
  const h2hKeep = new Set(result.h2h.map((pair) => pair.id));
  const h2hStale = h2hExisting.docs.filter((doc) => !h2hKeep.has(doc.id));
  console.log(
    `h2h: ${result.h2h.length} pair(s)` +
      (h2hStale.length > 0 ? `, ${h2hStale.length} stale pair(s) removed` : ''),
  );
  for (const pair of result.h2h) {
    writes.push({
      label: `h2h ${pair.id}`,
      apply: (batch) =>
        batch.set(h2hCol.doc(pair.id), {
          a: pair.a,
          b: pair.b,
          aWins: pair.aWins,
          bWins: pair.bWins,
          ties: pair.ties,
          updatedAt: stamp,
        }),
    });
  }
  for (const doc of h2hStale) {
    writes.push({ label: `h2h ${doc.id} (delete)`, apply: (batch) => batch.delete(doc.ref) });
  }

  for (const user of result.users) {
    writes.push({
      label: `user ${user.uid}`,
      apply: (batch) =>
        batch.set(
          db.collection('users').doc(user.uid),
          {
            stats: user.stats,
            badges: user.badges,
            badgeCounts: user.badgeCounts,
            lockStreak: user.lockStreak,
          },
          { merge: true },
        ),
    });
  }

  console.log(`${writes.length} write(s)`);
  await flush(writes, args.live);
  console.log(args.live ? 'written' : 'dry run — nothing written');
}

const isDirectRun = process.argv[1]?.endsWith('rebuild-records.ts') ?? false;
if (isDirectRun) {
  main().catch((error: unknown) => {
    log.error(JOB_NAME, 'rebuild-records failed', { error: String(error) });
    process.exit(1);
  });
}
