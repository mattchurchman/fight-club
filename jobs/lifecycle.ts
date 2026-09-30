// docs/tasks/T09-lifecycle-job.md — the event state machine: lock → results → score → finalize.
// Safe to run every 15 minutes: every stage is idempotent, so a re-run over a settled event writes
// nothing. All of the decisions live in `shared/lifecycle/` as pure planners (the admin screens in
// T17/T18 reuse them); this file only reads Firestore, fetches ESPN, and applies what they return.
//
// Usage: npm run jobs:lifecycle -- [--live] [--now <iso>] [--event <evt_id>] [--fixture <path>]...
// Default is --dry-run: it reads everything and prints the plan without writing.
//
// `--fixture` may be repeated and takes either shape captured in fixtures/README.md: a site
// `scoreboard` response (which carries `competitors[].winner`) or a map of competition id → core
// `status` (which carries `status.result`). Results need both halves, so a full offline run passes
// one of each; see `fetchJson` callers below for the live URLs they stand in for.
import { readFile } from 'node:fs/promises';
import { Timestamp } from 'firebase-admin/firestore';
import {
  planCancel,
  planFinalize,
  planLock,
  planResults,
  planScores,
  type LedgerIntent,
  type LifecycleBout,
  type LifecycleEntry,
  type LifecycleEvent,
  type LifecycleUser,
  type Millis,
  type ParsedBoutResult,
} from '@shared/lifecycle/index.ts';
import {
  h2hId,
  type AppConfig,
  type Bout,
  type Entry,
  type Event,
  type SeasonTotals,
  type Standing,
  type User,
} from '@shared/index.ts';
import { getAdmin } from './lib/admin.ts';
import { fetchJson, parseResult, type EspnScoreboard, type EspnStatus } from './lib/espn.ts';
import { postLedgerRow } from './lib/ledger.ts';
import { log, recordJobRun } from './lib/log.ts';

const JOB_NAME = 'lifecycle';
const SITE = 'https://site.api.espn.com/apis/site/v2/sports/mma/ufc';
const CORE = 'https://sports.core.api.espn.com/v2/sports/mma/leagues/ufc';
/** An `open` event further out than this can't lock on this run, so it isn't worth loading. */
const LOCK_LOOKAHEAD_MS = 30 * 60 * 1000;
const CANDIDATE_STATUSES = ['open', 'locked', 'live', 'cancelled'];

// ---- Firestore ⇄ planner conversion (planners are pure, so timestamps cross as epoch millis) ----

function toLifecycleEvent(id: string, data: Event<Timestamp>): LifecycleEvent {
  return {
    id,
    status: data.status,
    lockAt: data.lockAt.toMillis(),
    buyIn: data.buyIn,
    budget: data.budget,
    firstBloodEnabled: data.firstBloodEnabled,
    paidEntrants: data.paidEntrants,
    pot: data.pot,
    finalizedAt: data.finalizedAt?.toMillis() ?? null,
  };
}

function toLifecycleBout(data: Bout<Timestamp>): LifecycleBout {
  return {
    ...data,
    odds: { ...data.odds, updatedAt: data.odds.updatedAt.toMillis() },
    result: data.result ? { ...data.result, updatedAt: data.result.updatedAt.toMillis() } : null,
  };
}

function toLifecycleEntry(data: Entry<Timestamp>): LifecycleEntry {
  return {
    ...data,
    submittedAt: data.submittedAt.toMillis(),
    updatedAt: data.updatedAt.toMillis(),
  };
}

// ---- Candidates ----

interface Candidate {
  event: LifecycleEvent;
  espnId: string;
  startsAt: Millis;
  bouts: Record<string, LifecycleBout>;
  entries: LifecycleEntry[];
  users: Record<string, LifecycleUser>;
}

/** Skips what this run provably cannot act on, so a quiet run costs one query. */
function isCandidate(event: LifecycleEvent, now: Millis): boolean {
  if (event.status === 'open') {
    return event.lockAt <= now + LOCK_LOOKAHEAD_MS;
  }
  if (event.status === 'cancelled') {
    return event.finalizedAt === null;
  }
  return true;
}

async function loadEventDocs(onlyEventId: string | null): Promise<{ id: string; data: Event<Timestamp> }[]> {
  const { db } = getAdmin();
  if (onlyEventId) {
    const doc = await db.collection('events').doc(onlyEventId).get();
    const data = doc.data() as Event<Timestamp> | undefined;
    return data && CANDIDATE_STATUSES.includes(data.status) ? [{ id: doc.id, data }] : [];
  }
  const snap = await db.collection('events').where('status', 'in', CANDIDATE_STATUSES).get();
  return snap.docs.map((doc) => ({ id: doc.id, data: doc.data() as Event<Timestamp> }));
}

async function loadCandidate(id: string, data: Event<Timestamp>): Promise<Candidate> {
  const { db } = getAdmin();
  const eventRef = db.collection('events').doc(id);
  const [boutsSnap, entriesSnap] = await Promise.all([
    eventRef.collection('bouts').get(),
    eventRef.collection('entries').get(),
  ]);

  const bouts: Record<string, LifecycleBout> = {};
  for (const doc of boutsSnap.docs) {
    bouts[doc.id] = toLifecycleBout(doc.data() as Bout<Timestamp>);
  }
  const entries = entriesSnap.docs.map((doc) => toLifecycleEntry(doc.data() as Entry<Timestamp>));

  const users: Record<string, LifecycleUser> = {};
  await Promise.all(
    entries.map(async (entry) => {
      const doc = await db.collection('users').doc(entry.uid).get();
      const user = doc.data() as User<Timestamp> | undefined;
      if (user) {
        users[entry.uid] = {
          uid: entry.uid,
          displayName: user.displayName,
          balance: user.balance,
          ...(user.stats ? { stats: user.stats } : {}),
        };
      }
    }),
  );

  return {
    event: toLifecycleEvent(id, data),
    espnId: data.espnId,
    startsAt: data.startsAt.toMillis(),
    bouts,
    entries,
    users,
  };
}

// ---- ESPN results ----

/** The two halves a result is assembled from — see the `--fixture` note at the top of this file. */
interface ResultSource {
  competitors(competitionId: string): { order: number; winner?: boolean }[];
  status(competitionId: string): Promise<EspnStatus | undefined>;
}

interface Fixtures {
  competitors: Record<string, { order: number; winner?: boolean }[]>;
  statuses: Record<string, EspnStatus>;
}

function isScoreboard(json: unknown): json is EspnScoreboard {
  return typeof json === 'object' && json !== null && Array.isArray((json as EspnScoreboard).events);
}

async function loadFixtures(paths: readonly string[]): Promise<Fixtures> {
  const fixtures: Fixtures = { competitors: {}, statuses: {} };
  for (const path of paths) {
    const json: unknown = JSON.parse(await readFile(path, 'utf8'));
    if (isScoreboard(json)) {
      for (const event of json.events) {
        for (const competition of event.competitions ?? []) {
          fixtures.competitors[competition.id] = competition.competitors;
        }
      }
    } else {
      Object.assign(fixtures.statuses, json as Record<string, EspnStatus>);
    }
  }
  return fixtures;
}

function utcDateStamp(millis: Millis): string {
  return new Date(millis).toISOString().slice(0, 10).replace(/-/g, '');
}

/** One scoreboard call per event covers every bout's `winner` flags; statuses are one call per bout. */
async function liveSource(candidate: Candidate): Promise<ResultSource> {
  const board = await fetchJson<EspnScoreboard>(
    `${SITE}/scoreboard?dates=${utcDateStamp(candidate.startsAt)}`,
  );
  const event = (board.events ?? []).find((e) => e.id === candidate.espnId);
  const competitors: Record<string, { order: number; winner?: boolean }[]> = {};
  for (const competition of event?.competitions ?? []) {
    competitors[competition.id] = competition.competitors;
  }
  return {
    competitors: (id) => competitors[id] ?? [],
    status: (id) =>
      fetchJson<EspnStatus>(`${CORE}/events/${candidate.espnId}/competitions/${id}/status`).catch(
        (error: unknown) => {
          log.warn(JOB_NAME, `status fetch failed for competition ${id}`, { error: String(error) });
          return undefined;
        },
      ),
  };
}

function fixtureSource(fixtures: Fixtures): ResultSource {
  return {
    competitors: (id) => fixtures.competitors[id] ?? [],
    status: (id) => Promise.resolve(fixtures.statuses[id]),
  };
}

function competitionId(boutDocId: string): string {
  return boutDocId.replace(/^bout_/, '');
}

/** Parsed results for the bouts that still need one. Bouts ESPN hasn't finished are simply absent. */
async function fetchResults(
  candidate: Candidate,
  source: ResultSource,
): Promise<Record<string, ParsedBoutResult>> {
  const results: Record<string, ParsedBoutResult> = {};
  for (const [boutId, bout] of Object.entries(candidate.bouts)) {
    if (!bout.isMainCard || bout.status === 'cancelled' || bout.status === 'final') continue;
    if (bout.result?.source === 'manual') continue;
    const id = competitionId(boutId);
    const status = await source.status(id);
    if (!status) continue;
    const parsed = parseResult(status, source.competitors(id));
    if (parsed) results[boutId] = parsed;
  }
  return results;
}

// ---- Applying plans ----

interface Args {
  live: boolean;
  now: Millis;
  event: string | null;
  fixtures: string[];
}

function parseArgs(argv: string[]): Args {
  const flagValue = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i === -1 ? null : (argv[i + 1] ?? null);
  };
  const fixtures: string[] = [];
  argv.forEach((arg, i) => {
    const value = argv[i + 1];
    if (arg === '--fixture' && value) fixtures.push(value);
  });
  const nowArg = flagValue('--now');
  const now = nowArg ? Date.parse(nowArg) : Date.now();
  if (Number.isNaN(now)) throw new Error(`--now: not an ISO timestamp: ${nowArg}`);
  return {
    live: argv.includes('--live') && !argv.includes('--dry-run'),
    now,
    event: flagValue('--event'),
    fixtures,
  };
}

/** Logs what a stage decided and, only with `--live`, performs it. */
async function commit(args: Args, label: string, write: () => Promise<unknown>): Promise<void> {
  console.log(`  ${label}`);
  if (args.live) await write();
}

async function postIntents(args: Args, intents: readonly LedgerIntent[]): Promise<void> {
  for (const intent of intents) {
    await commit(args, `ledger ${intent.type} ${intent.amount >= 0 ? '+' : ''}${intent.amount} → ${intent.uid}`, async () => {
      const outcome = await postLedgerRow({
        uid: intent.uid,
        amount: intent.amount,
        type: intent.type,
        scope: intent.eventId,
        note: intent.note,
      });
      if (!outcome.posted) log.info(JOB_NAME, `ledger row ${outcome.id} already existed`);
    });
  }
}

async function applyLock(args: Args, candidate: Candidate): Promise<boolean> {
  const { db } = getAdmin();
  const plan = planLock(candidate.event, candidate.bouts, candidate.entries, candidate.users, args.now);
  if (!plan.applies) return false;

  const eventRef = db.collection('events').doc(candidate.event.id);
  for (const voided of plan.voided) {
    await commit(args, `void ${voided.uid} (${voided.reason}: ${voided.detail})`, () =>
      eventRef.collection('entries').doc(voided.uid).set({ status: 'void', updatedAt: Timestamp.now() }, { merge: true }),
    );
  }

  // Ledger first, then the `charged` flag: a crash in between leaves a row the re-run recognises,
  // where the other order would leave an entry marked paid that never paid.
  await postIntents(args, plan.ledger);
  for (const uid of plan.charged) {
    await commit(args, `charge ${uid} ${candidate.event.buyIn}`, () =>
      eventRef.collection('entries').doc(uid).set({ charged: true, updatedAt: Timestamp.now() }, { merge: true }),
    );
  }

  for (const odds of plan.odds) {
    await commit(args, `freeze ${odds.boutId} a=${odds.a} b=${odds.b} (${odds.source})`, () =>
      eventRef.collection('bouts').doc(odds.boutId).set(
        { odds: { a: odds.a, b: odds.b, source: odds.source, updatedAt: Timestamp.now(), frozen: true } },
        { merge: true },
      ),
    );
  }

  await commit(args, `event → locked (${plan.event.paidEntrants} paid, pot ${plan.event.pot})`, () =>
    eventRef.set({ ...plan.event, updatedAt: Timestamp.now() }, { merge: true }),
  );

  // Keep the in-memory view in step so the later stages of this same run see a locked event.
  candidate.event = { ...candidate.event, ...plan.event };
  const charged = new Set(plan.charged);
  const voided = new Set(plan.voided.map((v) => v.uid));
  candidate.entries = candidate.entries.map((entry) => ({
    ...entry,
    charged: entry.charged || charged.has(entry.uid),
    status: voided.has(entry.uid) ? 'void' : entry.status,
  }));
  for (const odds of plan.odds) {
    const bout = candidate.bouts[odds.boutId];
    if (bout) {
      candidate.bouts[odds.boutId] = {
        ...bout,
        odds: { ...bout.odds, a: odds.a, b: odds.b, source: odds.source, frozen: true },
      };
    }
  }
  return true;
}

async function applyResults(args: Args, candidate: Candidate, source: ResultSource): Promise<boolean> {
  const { db } = getAdmin();
  const results = await fetchResults(candidate, source);
  const plan = planResults(candidate.event, candidate.bouts, results, args.now);
  if (!plan.applies) return false;

  const eventRef = db.collection('events').doc(candidate.event.id);
  for (const write of plan.bouts) {
    const { result } = write;
    await commit(args, `result ${write.boutId}: ${result.winner} by ${result.method}`, () =>
      eventRef.collection('bouts').doc(write.boutId).set(
        { status: write.status, result: { ...result, updatedAt: Timestamp.fromMillis(result.updatedAt) } },
        { merge: true },
      ),
    );
    const bout = candidate.bouts[write.boutId];
    if (bout) candidate.bouts[write.boutId] = { ...bout, status: write.status, result };
  }

  if (plan.event.status) {
    await commit(args, `event → ${plan.event.status}`, () =>
      eventRef.set({ ...plan.event, updatedAt: Timestamp.now() }, { merge: true }),
    );
    candidate.event = { ...candidate.event, ...plan.event };
  }
  return true;
}

async function applyScores(args: Args, candidate: Candidate): Promise<boolean> {
  const { db } = getAdmin();
  const plan = planScores(candidate.event, candidate.bouts, candidate.entries);
  if (!plan.applies) return false;

  const entriesRef = db.collection('events').doc(candidate.event.id).collection('entries');
  for (const write of plan.entries) {
    await commit(args, `score ${write.uid}: ${write.score.total} (rank ${write.rank})`, () =>
      entriesRef.doc(write.uid).set({ score: write.score, rank: write.rank }, { merge: true }),
    );
  }
  return true;
}

async function loadStandings(seasonId: string): Promise<SeasonTotals[]> {
  const { db } = getAdmin();
  const snap = await db.collection('seasons').doc(seasonId).collection('standings').get();
  // `updatedAt` is dropped: the planner works in `SeasonTotals` and the writer stamps a fresh one.
  return snap.docs.map((doc) => {
    const row = doc.data() as Standing<Timestamp>;
    return {
      uid: row.uid,
      displayName: row.displayName,
      points: row.points,
      events: row.events,
      wins: row.wins,
      podiums: row.podiums,
      netTokens: row.netTokens,
      correctWinners: row.correctWinners,
      upsets: row.upsets,
    };
  });
}

async function applyFinalize(args: Args, candidate: Candidate, seasonId: string): Promise<boolean> {
  const { db } = getAdmin();
  const previous = await loadStandings(seasonId);
  const plan = planFinalize(
    candidate.event,
    candidate.bouts,
    candidate.entries,
    candidate.users,
    previous,
    args.now,
  );
  if (!plan.applies) {
    console.log(`  finalize blocked (${plan.reason})`);
    return false;
  }

  const eventRef = db.collection('events').doc(candidate.event.id);
  for (const write of plan.entries) {
    await commit(args, `final ${write.uid}: ${write.score.total} rank ${write.rank} payout ${write.payout}`, () =>
      eventRef
        .collection('entries')
        .doc(write.uid)
        .set({ score: write.score, rank: write.rank, payout: write.payout }, { merge: true }),
    );
  }

  await postIntents(args, plan.ledger);

  const standingsRef = db.collection('seasons').doc(seasonId).collection('standings');
  for (const row of plan.standings) {
    await commit(args, `standings ${row.uid}: ${row.points} pts`, () =>
      standingsRef.doc(row.uid).set({ ...row, updatedAt: Timestamp.now() }, { merge: true }),
    );
  }

  for (const delta of plan.h2h) {
    const id = h2hId(delta.a, delta.b);
    await commit(args, `h2h ${id}`, async () => {
      const ref = db.collection('h2h').doc(id);
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const current = snap.data() as { aWins?: number; bWins?: number; ties?: number } | undefined;
        tx.set(ref, {
          a: delta.a,
          b: delta.b,
          aWins: (current?.aWins ?? 0) + delta.aWins,
          bWins: (current?.bWins ?? 0) + delta.bWins,
          ties: (current?.ties ?? 0) + delta.ties,
          updatedAt: Timestamp.now(),
        });
      });
    });
  }

  for (const user of plan.users) {
    await commit(args, `stats ${user.uid}: ${user.stats.points} pts`, () =>
      db.collection('users').doc(user.uid).set({ stats: user.stats }, { merge: true }),
    );
  }

  await commit(args, 'event → final', () =>
    eventRef.set(
      { status: 'final', finalizedAt: Timestamp.fromMillis(plan.event.finalizedAt!), updatedAt: Timestamp.now() },
      { merge: true },
    ),
  );
  candidate.event = { ...candidate.event, status: 'final' };
  return true;
}

async function applyCancel(args: Args, candidate: Candidate): Promise<boolean> {
  const { db } = getAdmin();
  const plan = planCancel(candidate.event, candidate.entries, args.now);
  if (!plan.applies) return false;

  await postIntents(args, plan.ledger);
  await commit(args, `event cancelled — ${plan.refunded.length} refund(s) settled`, () =>
    db
      .collection('events')
      .doc(candidate.event.id)
      .set(
        { finalizedAt: Timestamp.fromMillis(plan.event.finalizedAt!), updatedAt: Timestamp.now() },
        { merge: true },
      ),
  );
  return true;
}

// ---- Entry point ----

async function runCandidate(
  args: Args,
  candidate: Candidate,
  seasonId: string,
  fixtures: Fixtures | null,
): Promise<string[]> {
  const done: string[] = [];
  if (candidate.event.status === 'cancelled') {
    if (await applyCancel(args, candidate)) done.push('cancel');
    return done;
  }

  if (await applyLock(args, candidate)) done.push('lock');

  if (candidate.event.status === 'locked' || candidate.event.status === 'live') {
    const source = fixtures ? fixtureSource(fixtures) : await liveSource(candidate);
    if (await applyResults(args, candidate, source)) done.push('results');
    if (await applyScores(args, candidate)) done.push('scores');
    if (await applyFinalize(args, candidate, seasonId)) done.push('finalize');
  }
  return done;
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  const { db } = getAdmin();

  const docs = await loadEventDocs(args.event);
  const candidates: Candidate[] = [];
  for (const { id, data } of docs) {
    if (isCandidate(toLifecycleEvent(id, data), args.now)) {
      candidates.push(await loadCandidate(id, data));
    }
  }

  if (candidates.length === 0) {
    console.log('nothing to do');
    if (args.live) await recordJobRun(JOB_NAME, true, 'no candidate events');
    return;
  }

  const config = (await db.collection('config').doc('app').get()).data() as AppConfig | undefined;
  const seasonId = config?.seasonId ?? String(new Date(args.now).getUTCFullYear());
  const fixtures = args.fixtures.length > 0 ? await loadFixtures(args.fixtures) : null;

  const summary: string[] = [];
  for (const candidate of candidates) {
    console.log(`${candidate.event.id} (${candidate.event.status}, ${candidate.entries.length} entries)`);
    const stages = await runCandidate(args, candidate, seasonId, fixtures);
    summary.push(`${candidate.event.id}: ${stages.length > 0 ? stages.join('+') : 'no change'}`);
  }

  const line = summary.join('; ');
  console.log(args.live ? line : `${line} (dry run — nothing written)`);
  if (args.live) {
    await recordJobRun(JOB_NAME, true, line);
    log.info(JOB_NAME, line);
  }
}

const isDirectRun = process.argv[1]?.endsWith('lifecycle.ts') ?? false;
if (isDirectRun) {
  main().catch((error: unknown) => {
    log.error(JOB_NAME, 'lifecycle failed', { error: String(error) });
    recordJobRun(JOB_NAME, false, 'lifecycle failed', String(error))
      .catch(() => {})
      .finally(() => process.exit(1));
  });
}
