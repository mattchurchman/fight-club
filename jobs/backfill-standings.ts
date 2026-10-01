// docs/tasks/T21-standings-profiles-h2h.md — recovery tool. `jobs/lifecycle.ts#applyFinalize`
// already folds each event into `seasons/{seasonId}/standings` and `h2h` as it finalizes, so this
// isn't needed for normal operation. It exists for the day `shared/standings.ts`'s rules change
// (e.g. the upset-odds threshold) or those documents get corrupted: it replays every already-final
// event's *stored* entry scores/ranks/payouts (it does not re-score bouts — that's T09/T18's job)
// through `applyEventToStandings` from scratch and overwrites both collections with the result.
//
// Usage: npm run job -- jobs/backfill-standings.ts [--live]
// Default is --dry-run: computes and prints every season's totals and the h2h pair count without
// writing anything.
import { Timestamp } from 'firebase-admin/firestore';
import { applyEventToStandings, h2hId } from '@shared/index.ts';
import type { Bout, Entry, Event, H2HDelta, SeasonTotals, StandingsEntry } from '@shared/index.ts';
import { getAdmin } from './lib/admin.ts';
import { log } from './lib/log.ts';

const JOB_NAME = 'backfill-standings';

function parseArgs(argv: string[]): { live: boolean } {
  return { live: argv.includes('--live') && !argv.includes('--dry-run') };
}

/** docs/GAME_RULES.md §8: season = calendar year. */
function seasonIdFor(startsAtMs: number): string {
  return String(new Date(startsAtMs).getUTCFullYear());
}

interface FinalEvent {
  id: string;
  data: Event<Timestamp>;
}

async function loadFinalEvents(): Promise<FinalEvent[]> {
  const { db } = getAdmin();
  const snap = await db.collection('events').where('status', '==', 'final').orderBy('startsAt', 'asc').get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as Event<Timestamp> }));
}

async function loadEntries(eventId: string): Promise<Entry<Timestamp>[]> {
  const { db } = getAdmin();
  const snap = await db.collection('events').doc(eventId).collection('entries').get();
  return snap.docs.map((d) => d.data() as Entry<Timestamp>);
}

async function loadBouts(eventId: string): Promise<Record<string, Bout<Timestamp>>> {
  const { db } = getAdmin();
  const snap = await db.collection('events').doc(eventId).collection('bouts').get();
  const bouts: Record<string, Bout<Timestamp>> = {};
  for (const d of snap.docs) bouts[d.id] = d.data() as Bout<Timestamp>;
  return bouts;
}

/** Shared by the pot at lock and never voided — the only entries `applyEventToStandings` wants. */
function isPaid(entry: Entry<Timestamp>): boolean {
  return entry.charged && entry.status !== 'void';
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  const events = await loadFinalEvents();
  if (events.length === 0) {
    console.log('no final events — nothing to backfill');
    return;
  }

  const seasonTotals = new Map<string, SeasonTotals[]>();
  const h2hTotals = new Map<string, H2HDelta>();

  for (const { id, data } of events) {
    const seasonId = seasonIdFor(data.startsAt.toMillis());
    const [entries, bouts] = await Promise.all([loadEntries(id), loadBouts(id)]);

    const paid = entries.filter(isPaid);
    const settled = paid.filter((e) => e.score !== null && e.rank !== null);
    if (settled.length < paid.length) {
      const skipped = paid.length - settled.length;
      console.log(`  ${id}: skipping ${skipped} paid entr${skipped === 1 ? 'y' : 'ies'} with no score (not actually finalized?)`);
    }

    const standingsEntries: StandingsEntry[] = settled.map((e) => ({
      uid: e.uid,
      displayName: e.displayName,
      picks: e.picks,
      score: e.score!,
      rank: e.rank!,
      submittedAt: e.submittedAt.toMillis(),
    }));
    const payouts = settled.map((e) => ({ uid: e.uid, amount: e.payout ?? 0 }));

    const prev = seasonTotals.get(seasonId) ?? [];
    const update = applyEventToStandings(prev, standingsEntries, payouts, data.buyIn, bouts);
    seasonTotals.set(seasonId, update.standings);

    for (const delta of update.h2h) {
      const pairId = h2hId(delta.a, delta.b);
      const current = h2hTotals.get(pairId) ?? { a: delta.a, b: delta.b, aWins: 0, bWins: 0, ties: 0 };
      h2hTotals.set(pairId, {
        a: delta.a,
        b: delta.b,
        aWins: current.aWins + delta.aWins,
        bWins: current.bWins + delta.bWins,
        ties: current.ties + delta.ties,
      });
    }
  }

  const { db } = getAdmin();
  for (const [seasonId, rows] of seasonTotals) {
    console.log(`season ${seasonId}: ${rows.length} player(s)`);
    for (const row of rows) console.log(`  ${row.displayName}: ${row.points} pts, ${row.events} events`);
    if (args.live) {
      const batch = db.batch();
      const col = db.collection('seasons').doc(seasonId).collection('standings');
      for (const row of rows) batch.set(col.doc(row.uid), { ...row, updatedAt: Timestamp.now() });
      await batch.commit();
    }
  }

  console.log(`h2h: ${h2hTotals.size} pair(s)`);
  if (args.live) {
    const batch = db.batch();
    for (const [pairId, row] of h2hTotals) {
      batch.set(db.collection('h2h').doc(pairId), { ...row, updatedAt: Timestamp.now() });
    }
    await batch.commit();
  }

  console.log(args.live ? 'written' : 'dry run — nothing written');
}

const isDirectRun = process.argv[1]?.endsWith('backfill-standings.ts') ?? false;
if (isDirectRun) {
  main().catch((error: unknown) => {
    log.error(JOB_NAME, 'backfill-standings failed', { error: String(error) });
    process.exit(1);
  });
}
