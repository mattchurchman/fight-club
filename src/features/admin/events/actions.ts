// docs/tasks/T18 step 3: the three actions that move money or settle the card. Each is
// preview-then-apply: `previewX` only reads, and returns the same plan the "diff preview" (step 4)
// renders; `applyX` writes it. Both reuse the shared planners exactly as `jobs/lifecycle.ts` does
// (docs/tasks/T09), so the admin screen can never compute a score or a payout differently than the
// job would have.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import {
  isPaid,
  planCancel,
  planFinalize,
  planScores,
  type CancelPlan,
  type FinalizePlan,
  type LifecycleBout,
  type LifecycleEntry,
  type LifecycleEvent,
  type LifecycleUser,
  type ScoresPlan,
} from '@shared/lifecycle/index.ts';
import { h2hId, type AppConfig, type Bout, type Entry, type Event, type SeasonTotals, type Standing, type User } from '@shared/index.ts';
import { db } from '../../../lib/firebase.ts';
import { postLedgerRow } from '../postLedger.ts';

// ---- Firestore ⇄ planner conversion — mirrors jobs/lifecycle.ts exactly (same shared types). ----

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
  return { ...data, submittedAt: data.submittedAt.toMillis(), updatedAt: data.updatedAt.toMillis() };
}

interface Candidate {
  event: LifecycleEvent;
  bouts: Record<string, LifecycleBout>;
  entries: LifecycleEntry[];
}

async function loadCandidate(eventId: string): Promise<Candidate> {
  const eventSnap = await getDoc(doc(db, 'events', eventId));
  if (!eventSnap.exists()) throw new Error(`Event ${eventId} not found`);
  const event = toLifecycleEvent(eventId, eventSnap.data() as Event<Timestamp>);

  const boutsSnap = await getDocs(collection(db, 'events', eventId, 'bouts'));
  const bouts: Record<string, LifecycleBout> = {};
  for (const d of boutsSnap.docs) bouts[d.id] = toLifecycleBout(d.data() as Bout<Timestamp>);

  const entriesSnap = await getDocs(collection(db, 'events', eventId, 'entries'));
  const entries = entriesSnap.docs.map((d) => toLifecycleEntry(d.data() as Entry<Timestamp>));

  return { event, bouts, entries };
}

// ---------------------------------------------------------------- Rescore

export async function previewRescore(eventId: string): Promise<ScoresPlan> {
  const { event, bouts, entries } = await loadCandidate(eventId);
  return planScores(event, bouts, entries);
}

/** Rescores immediately, no preview step — a no-op if nothing changed (`applyRescore` already
 * guards on `plan.applies`). Call this after any write that lands a new bout result (manual
 * entry, ESPN refresh) so the leaderboard updates itself instead of requiring a separate,
 * easy-to-forget "Rescore now" click — found live: a locked Lock-of-the-Night result sat
 * unscored for two hours because nothing rescored after it landed. */
export async function rescoreNow(eventId: string): Promise<void> {
  await applyRescore(eventId, await previewRescore(eventId));
}

/** docs/tasks/T18 step 3: writes `planScores`' entries straight through, in one batch. */
export async function applyRescore(eventId: string, plan: ScoresPlan): Promise<void> {
  if (!plan.applies) return;
  const batch = writeBatch(db);
  const entriesCol = collection(db, 'events', eventId, 'entries');
  for (const write of plan.entries) {
    batch.set(doc(entriesCol, write.uid), { score: write.score, rank: write.rank }, { merge: true });
  }
  await batch.commit();
}

// ---------------------------------------------------------------- Finalize

async function loadUsers(uids: readonly string[]): Promise<Record<string, LifecycleUser>> {
  const snaps = await Promise.all(uids.map((uid) => getDoc(doc(db, 'users', uid))));
  const users: Record<string, LifecycleUser> = {};
  snaps.forEach((snap, i) => {
    if (!snap.exists()) return;
    const data = snap.data() as User<Timestamp>;
    const uid = uids[i]!;
    users[uid] = { uid, displayName: data.displayName, balance: data.balance, stats: data.stats };
  });
  return users;
}

async function loadStandings(seasonId: string): Promise<SeasonTotals[]> {
  const snap = await getDocs(collection(db, 'seasons', seasonId, 'standings'));
  return snap.docs.map((d) => {
    const row = d.data() as Standing<Timestamp>;
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

async function loadSeasonId(): Promise<string> {
  const snap = await getDoc(doc(db, 'config', 'app'));
  const config = snap.data() as AppConfig | undefined;
  if (!config) throw new Error('config/app is missing — cannot finalize without a seasonId');
  return config.seasonId;
}

export interface FinalizePreview {
  plan: FinalizePlan;
  seasonId: string;
}

export async function previewFinalize(eventId: string): Promise<FinalizePreview> {
  const { event, bouts, entries } = await loadCandidate(eventId);
  const seasonId = await loadSeasonId();
  const [users, standings] = await Promise.all([
    loadUsers(entries.map((e) => e.uid)),
    loadStandings(seasonId),
  ]);
  return { plan: planFinalize(event, bouts, entries, users, standings, Date.now()), seasonId };
}

/**
 * docs/tasks/T18 step 3. Writes in the same order `jobs/lifecycle.ts#applyFinalize` does, and for
 * the same reason: `status → 'final'` goes **last**. Every write before it is safe to redo (the
 * ledger rows have deterministic ids; the rest are merges of the same values), so if this throws
 * partway through, re-running Finalize on the still-`locked`/`live` event recomputes the identical
 * plan and finishes the job instead of getting stuck — flip the status first and a crash would
 * leave the event stuck `final` with nothing paid out, and `planFinalize` would then refuse to
 * recompute a plan to recover with (`already-final`).
 */
export async function applyFinalize(eventId: string, preview: FinalizePreview, adminUid: string): Promise<void> {
  const { plan, seasonId } = preview;
  if (!plan.applies) return;

  const entriesCol = collection(db, 'events', eventId, 'entries');
  const entriesBatch = writeBatch(db);
  for (const write of plan.entries) {
    entriesBatch.set(doc(entriesCol, write.uid), { score: write.score, rank: write.rank, payout: write.payout }, { merge: true });
  }
  await entriesBatch.commit();

  for (const intent of plan.ledger) {
    await postLedgerRow({
      uid: intent.uid,
      amount: intent.amount,
      type: intent.type,
      scope: intent.eventId,
      note: intent.note,
      createdBy: adminUid,
    });
  }

  const standingsBatch = writeBatch(db);
  const standingsCol = collection(db, 'seasons', seasonId, 'standings');
  for (const row of plan.standings) {
    standingsBatch.set(doc(standingsCol, row.uid), { ...row, updatedAt: serverTimestamp() }, { merge: true });
  }
  for (const user of plan.users) {
    standingsBatch.set(doc(db, 'users', user.uid), { stats: user.stats }, { merge: true });
  }
  await standingsBatch.commit();

  for (const delta of plan.h2h) {
    const ref = doc(db, 'h2h', h2hId(delta.a, delta.b));
    const snap = await getDoc(ref);
    const current = snap.data() as { aWins?: number; bWins?: number; ties?: number } | undefined;
    await setDoc(ref, {
      a: delta.a,
      b: delta.b,
      aWins: (current?.aWins ?? 0) + delta.aWins,
      bWins: (current?.bWins ?? 0) + delta.bWins,
      ties: (current?.ties ?? 0) + delta.ties,
      updatedAt: serverTimestamp(),
    });
  }

  await updateDoc(doc(db, 'events', eventId), {
    status: 'final',
    finalizedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------- Cancel

export interface CancelPreview {
  event: LifecycleEvent;
  entries: LifecycleEntry[];
  paidCount: number;
}

export async function previewCancel(eventId: string): Promise<CancelPreview> {
  const { event, entries } = await loadCandidate(eventId);
  return { event, entries, paidCount: entries.filter(isPaid).length };
}

/**
 * docs/tasks/T18 step 3. Nothing else ever sets an event `cancelled` from the admin side (only the
 * ESPN ingest job does, for a card ESPN itself calls off — `jobs/ingest-events.ts`), so this does
 * that transition first, then runs `planCancel` exactly as `jobs/lifecycle.ts#applyCancel` would on
 * its next tick: refunds before the `finalizedAt` settled-stamp, so a retry after a crash is safe.
 */
export async function applyCancel(eventId: string, adminUid: string): Promise<CancelPlan> {
  await updateDoc(doc(db, 'events', eventId), { status: 'cancelled', updatedAt: serverTimestamp() });

  const { event, entries } = await loadCandidate(eventId);
  const plan = planCancel(event, entries, Date.now());
  if (!plan.applies) return plan;

  for (const intent of plan.ledger) {
    await postLedgerRow({
      uid: intent.uid,
      amount: intent.amount,
      type: intent.type,
      scope: intent.eventId,
      note: intent.note,
      createdBy: adminUid,
    });
  }

  await updateDoc(doc(db, 'events', eventId), { finalizedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return plan;
}
