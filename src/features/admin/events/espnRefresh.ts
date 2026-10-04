// Admin-triggered ESPN result refresh — the client-side equivalent of jobs/lifecycle.ts's result
// step, for when GitHub Actions' schedule can't be trusted to run promptly (docs/PROGRESS.md
// backlog: GitHub's cron can be delayed hours under load). Reuses the exact same pure planner
// (shared/lifecycle/results.ts) and ESPN parsing (shared/espn.ts) as the automated job, so this
// can never disagree with what the job would have done — and a manually-entered result
// (`source: 'manual'`) is always left untouched either way.
import { collection, doc, getDoc, getDocs, setDoc, Timestamp } from 'firebase/firestore';
import type { Timestamp as FsTimestamp } from 'firebase/firestore';
import {
  planResults,
  type LifecycleBout,
  type LifecycleEvent,
  type ParsedBoutResult,
  type ResultsPlan,
} from '@shared/lifecycle/index.ts';
import type { Bout, Event } from '@shared/index.ts';
import { fetchJson, parseResult, type EspnScoreboard, type EspnStatus } from '@shared/espn.ts';
import { db } from '../../../lib/firebase.ts';

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/mma/ufc';
const CORE = 'https://sports.core.api.espn.com/v2/sports/mma/leagues/ufc';

function utcDateStamp(millis: number): string {
  return new Date(millis).toISOString().slice(0, 10).replace(/-/g, '');
}

function competitionId(boutDocId: string): string {
  return boutDocId.replace(/^bout_/, '');
}

function toLifecycleEvent(id: string, data: Event<FsTimestamp>): LifecycleEvent {
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

function toLifecycleBout(data: Bout<FsTimestamp>): LifecycleBout {
  return {
    ...data,
    odds: { ...data.odds, updatedAt: data.odds.updatedAt.toMillis() },
    result: data.result ? { ...data.result, updatedAt: data.result.updatedAt.toMillis() } : null,
  };
}

export interface EspnRefreshPreview {
  plan: ResultsPlan;
  checked: number;
}

/** Fetches live results from ESPN for every main-card bout that isn't cancelled/final/manual, and
 * plans the writes — the same decision the scheduled job makes, triggered by hand instead. */
export async function previewEspnRefresh(eventId: string): Promise<EspnRefreshPreview> {
  const eventSnap = await getDoc(doc(db, 'events', eventId));
  if (!eventSnap.exists()) throw new Error(`Event ${eventId} not found`);
  const raw = eventSnap.data() as Event<FsTimestamp>;
  const event = toLifecycleEvent(eventId, raw);

  const boutsSnap = await getDocs(collection(db, 'events', eventId, 'bouts'));
  const bouts: Record<string, LifecycleBout> = {};
  for (const d of boutsSnap.docs) bouts[d.id] = toLifecycleBout(d.data() as Bout<FsTimestamp>);

  const board = await fetchJson<EspnScoreboard>(
    `${SITE}/scoreboard?dates=${utcDateStamp(raw.startsAt.toMillis())}`,
  );
  const espnEvent = (board.events ?? []).find((e) => e.id === raw.espnId);
  const competitorsById: Record<string, { order: number; winner?: boolean }[]> = {};
  for (const competition of espnEvent?.competitions ?? []) {
    competitorsById[competition.id] = competition.competitors;
  }

  const results: Record<string, ParsedBoutResult> = {};
  let checked = 0;
  for (const [boutId, bout] of Object.entries(bouts)) {
    if (!bout.isMainCard || bout.status === 'cancelled' || bout.status === 'final') continue;
    if (bout.result?.source === 'manual') continue;
    checked += 1;
    const id = competitionId(boutId);
    const status = await fetchJson<EspnStatus>(
      `${CORE}/events/${raw.espnId}/competitions/${id}/status`,
    ).catch(() => undefined);
    if (!status) continue;
    const parsed = parseResult(status, competitorsById[id] ?? []);
    if (parsed) results[boutId] = parsed;
  }

  const plan = planResults(event, bouts, results, Date.now());
  return { plan, checked };
}

/** Writes exactly the plan `previewEspnRefresh` returned — call after the admin confirms it. */
export async function applyEspnRefresh(eventId: string, preview: EspnRefreshPreview): Promise<void> {
  const eventRef = doc(db, 'events', eventId);
  for (const write of preview.plan.bouts) {
    await setDoc(
      doc(eventRef, 'bouts', write.boutId),
      { status: write.status, result: { ...write.result, updatedAt: Timestamp.fromMillis(write.result.updatedAt) } },
      { merge: true },
    );
  }
  if (preview.plan.event.status) {
    await setDoc(eventRef, { ...preview.plan.event, updatedAt: Timestamp.now() }, { merge: true });
  }
}
