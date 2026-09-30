// docs/tasks/T08-ingest-odds.md — sets bout.odds for open events from ESPN (docs/DECISIONS.md
// 2026-09-29 rescoped this job from The Odds API to ESPN; see jobs/lib/oddsApi.ts).
// Usage: npm run jobs:odds -- [--fixture <path>] [--live]
// Default is --dry-run (parse + print, no writes) unless --live is passed.
//
// Unlike jobs/ingest-events.ts, this job always reads bouts from Firestore (even in dry run): the
// ESPN odds response only carries athlete ids, and matching happens against each bout's already-
// ingested fighterIds, not a name-matched pool — there is no self-contained "source of truth" fixture
// standing in for that the way T07's scoreboard fixture stood in for the whole event.
import { readFile } from 'node:fs/promises';
import { Timestamp } from 'firebase-admin/firestore';
import type { Bout, Event, OddsSource } from '@shared/index.ts';
import { getAdmin } from './lib/admin.ts';
import { log, recordJobRun } from './lib/log.ts';
import { fetchBoutOdds, parseBoutOdds, type EspnOddsResponse } from './lib/oddsApi.ts';

const JOB_NAME = 'odds';
const LOOKAHEAD_DAYS = 10;

export interface CandidateBout {
  id: string; // bout doc id, e.g. "bout_401907087"
  espnId: string; // competition id, e.g. "401907087"
  aFighterId: string;
  bFighterId: string;
  oddsSource: OddsSource;
  oddsFrozen: boolean;
}

export interface CandidateEvent {
  id: string;
  espnId: string;
  bouts: CandidateBout[];
}

export type PlannedOddsWrite<Ts> =
  | { action: 'write'; boutId: string; data: { a: number | null; b: number | null; source: 'espn'; updatedAt: Ts; frozen: false } }
  | { action: 'skip'; boutId: string; reason: 'manual' | 'frozen' | 'no-price' };

/**
 * Pure. Manual odds and frozen odds are never overwritten (docs/tasks/T08 acceptance criteria).
 * `oddsResponse` is `undefined` when the caller already knew to skip the fetch (manual/frozen) —
 * in that case the result is identical to passing a real response with no matching price.
 */
export function planBoutOdds<Ts>(
  bout: CandidateBout,
  oddsResponse: EspnOddsResponse | undefined,
  now: Ts,
): PlannedOddsWrite<Ts> {
  if (bout.oddsSource === 'manual') return { action: 'skip', boutId: bout.id, reason: 'manual' };
  if (bout.oddsFrozen) return { action: 'skip', boutId: bout.id, reason: 'frozen' };
  const parsed = oddsResponse ? parseBoutOdds(oddsResponse, bout.aFighterId, bout.bFighterId) : null;
  if (!parsed) return { action: 'skip', boutId: bout.id, reason: 'no-price' };
  return { action: 'write', boutId: bout.id, data: { a: parsed.a, b: parsed.b, source: 'espn', updatedAt: now, frozen: false } };
}

function boutEspnId(boutDocId: string): string {
  return boutDocId.replace(/^bout_/, '');
}

/** Open events whose lockAt falls within the lookahead window (docs/tasks/T08). Filters lockAt
 *  in memory rather than in the query so no composite index is needed for status+lockAt. */
async function loadCandidateEvents(): Promise<CandidateEvent[]> {
  const { db } = getAdmin();
  const snap = await db.collection('events').where('status', '==', 'open').get();
  const cutoffMs = Date.now() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000;

  const events: CandidateEvent[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as Event;
    if (data.lockAt.toMillis() > cutoffMs) continue;
    const boutsSnap = await db.collection('events').doc(doc.id).collection('bouts').get();
    const bouts: CandidateBout[] = [];
    for (const b of boutsSnap.docs) {
      const bd = b.data() as Bout;
      if (bd.status === 'cancelled') continue;
      bouts.push({
        id: b.id,
        espnId: boutEspnId(b.id),
        aFighterId: bd.a.fighterId,
        bFighterId: bd.b.fighterId,
        oddsSource: bd.odds.source,
        oddsFrozen: bd.odds.frozen,
      });
    }
    events.push({ id: doc.id, espnId: data.espnId, bouts });
  }
  return events;
}

interface Args {
  fixture: string | null;
  live: boolean;
}

function parseArgs(argv: string[]): Args {
  const flagValue = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i === -1 ? null : (argv[i + 1] ?? null);
  };
  return {
    fixture: flagValue('--fixture'),
    live: argv.includes('--live') && !argv.includes('--dry-run'),
  };
}

/** `--fixture` points at a JSON object keyed by competition id (same shape as one job run's worth
 *  of `core/.../odds` responses, e.g. fixtures/espn/odds-upcoming.json). */
async function loadFixtureMap(path: string): Promise<Record<string, EspnOddsResponse>> {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw) as Record<string, EspnOddsResponse>;
}

async function getOddsFor(
  eventEspnId: string,
  competitionEspnId: string,
  fixtureMap: Record<string, EspnOddsResponse> | null,
): Promise<EspnOddsResponse | undefined> {
  if (fixtureMap) return fixtureMap[competitionEspnId];
  return fetchBoutOdds(eventEspnId, competitionEspnId);
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  const events = await loadCandidateEvents();

  if (events.length === 0) {
    console.log(`no open events lock within the next ${LOOKAHEAD_DAYS} days`);
    if (args.live) await recordJobRun(JOB_NAME, true, '0 events in window');
    return;
  }

  const fixtureMap = args.fixture ? await loadFixtureMap(args.fixture) : null;
  const { db } = getAdmin();
  let written = 0;
  let skipped = 0;

  for (const event of events) {
    for (const bout of event.bouts) {
      const now = Timestamp.now();
      const skipFetch = bout.oddsSource === 'manual' || bout.oddsFrozen;
      const oddsResponse = skipFetch ? undefined : await getOddsFor(event.espnId, bout.espnId, fixtureMap);
      const plan = planBoutOdds(bout, oddsResponse, now);

      if (plan.action === 'skip') {
        console.log(`${bout.id}: skip (${plan.reason})`);
        skipped++;
        continue;
      }
      console.log(`${bout.id}: a=${plan.data.a ?? 'null'} b=${plan.data.b ?? 'null'}`);
      written++;
      if (args.live) {
        await db.collection('events').doc(event.id).collection('bouts').doc(bout.id).set({ odds: plan.data }, { merge: true });
      }
    }
  }

  const summary = `${written} bout(s) priced, ${skipped} skipped`;
  console.log(summary);
  if (args.live) {
    await recordJobRun(JOB_NAME, true, summary);
    log.info(JOB_NAME, summary);
  }
}

const isDirectRun = process.argv[1]?.endsWith('ingest-odds.ts') ?? false;
if (isDirectRun) {
  main().catch((error: unknown) => {
    log.error(JOB_NAME, 'odds ingest failed', { error: String(error) });
    recordJobRun(JOB_NAME, false, 'odds ingest failed', String(error))
      .catch(() => {})
      .finally(() => process.exit(1));
  });
}
