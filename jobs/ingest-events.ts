// docs/tasks/T07-ingest-events.md — imports upcoming UFC events/bouts/fighters from ESPN.
// Usage: npm run jobs:ingest -- [--fixture <path>] [--live]
// Default is --dry-run (parse + print, no writes) unless --live is passed.
import { readFile } from 'node:fs/promises';
import { Timestamp } from 'firebase-admin/firestore';
import {
  DEFAULTS,
  eventId as toEventId,
  type Bout,
  type BoutFighterSnapshot,
  type Event,
  type EventStatus,
  type Fighter,
} from '@shared/index.ts';
import { getAdmin } from './lib/admin.ts';
import { log, recordJobRun } from './lib/log.ts';
import { fetchJson, parseEvents, type EspnScoreboard, type ParsedEvent, type ParsedFighter } from './lib/espn.ts';

const JOB_NAME = 'ingest';
const SITE = 'https://site.api.espn.com/apis/site/v2/sports/mma/ufc';
const LOOKAHEAD_DAYS = 45;
const FROZEN_STATUSES: ReadonlySet<EventStatus> = new Set(['locked', 'live', 'final', 'cancelled']);

export interface ExistingEvent {
  status: EventStatus;
  buyIn: number;
  budget: number;
  enabled: boolean;
  firstBloodEnabled: boolean;
  boutIds: string[];
}

export interface PlanConfig {
  autoEnableNumbered: boolean;
  buyIn: number;
  budget: number;
}

export type PlannedBoutWrite<Ts> =
  | { action: 'upsert'; id: string; data: Partial<Bout<Ts>> }
  | { action: 'cancel'; id: string };

export interface PlannedWrite<Ts> {
  event: { id: string; data: Partial<Event<Ts>> };
  bouts: PlannedBoutWrite<Ts>[];
  fighters: { id: string; data: Fighter<Ts> }[];
}

function toSnapshot(f: ParsedFighter): BoutFighterSnapshot {
  return { fighterId: f.fighterId, name: f.name, record: f.record, headshotUrl: f.headshotUrl };
}

/**
 * The upsert decision logic (pure — no Firestore). `Ts` lets tests use plain ISO strings
 * (`toTs = (iso) => iso`) and the real job use Firestore `Timestamp` (`toTs = Timestamp.fromMillis`).
 *
 * Rules (docs/tasks/T07-ingest-events.md):
 * - An event's `status`/`buyIn`/`budget`/`enabled`/`firstBloodEnabled` are set once, on creation,
 *   and never overwritten (an admin may have changed them since).
 * - Once an event is `locked` or later, bouts/fighters are never upserted — the only bout write
 *   allowed is marking one `cancelled` when it disappears from the source.
 * - A bout that already exists keeps its `odds`/`status`/`result` untouched (T08/T09 own those);
 *   only a brand-new bout gets the `scheduled`/default-odds/`null`-result starting state.
 */
export function planEventWrites<Ts>(
  existing: ExistingEvent | null,
  parsed: ParsedEvent,
  config: PlanConfig,
  now: Ts,
  toTs: (iso: string) => Ts,
): PlannedWrite<Ts> {
  const frozen = existing !== null && FROZEN_STATUSES.has(existing.status);

  const eventData: Partial<Event<Ts>> = {
    name: parsed.name,
    subtitle: parsed.subtitle,
    number: parsed.number,
    kind: parsed.kind,
    espnId: parsed.espnId,
    source: 'espn',
    updatedAt: now,
  };
  if (!frozen) {
    eventData.startsAt = toTs(parsed.startsAt);
    eventData.lockAt = toTs(parsed.lockAt);
    eventData.venue = parsed.venue;
    eventData.mainCardBoutIds = parsed.bouts.map((b) => b.boutId);
  }
  if (existing === null) {
    const enabled = config.autoEnableNumbered && parsed.kind === 'numbered';
    eventData.enabled = enabled;
    eventData.status = enabled ? 'open' : 'scheduled';
    eventData.buyIn = config.buyIn;
    eventData.budget = config.budget;
    eventData.firstBloodEnabled = false;
    eventData.paidEntrants = 0;
    eventData.pot = 0;
    eventData.finalizedAt = null;
  }

  const bouts: PlannedBoutWrite<Ts>[] = [];
  const fighters: { id: string; data: Fighter<Ts> }[] = [];

  if (!frozen) {
    const existingBoutIds = new Set(existing?.boutIds ?? []);
    const seenFighters = new Set<string>();
    for (const bout of parsed.bouts) {
      const data: Partial<Bout<Ts>> = {
        order: bout.order,
        weightClass: bout.weightClass,
        rounds: bout.rounds,
        isMainEvent: bout.isMainEvent,
        isMainCard: true,
        a: toSnapshot(bout.a),
        b: toSnapshot(bout.b),
      };
      if (!existingBoutIds.has(bout.boutId)) {
        data.odds = { a: null, b: null, source: 'default', updatedAt: now, frozen: false };
        data.status = 'scheduled';
        data.result = null;
      }
      bouts.push({ action: 'upsert', id: bout.boutId, data });

      for (const fighter of [bout.a, bout.b]) {
        if (seenFighters.has(fighter.fighterId)) continue;
        seenFighters.add(fighter.fighterId);
        fighters.push({
          id: fighter.fighterId,
          data: {
            name: fighter.name,
            nickname: null,
            record: fighter.record,
            country: fighter.country,
            headshotUrl: fighter.headshotUrl,
            espnId: fighter.espnId,
            updatedAt: now,
          },
        });
      }
    }
  }

  if (existing) {
    const parsedIds = new Set(parsed.bouts.map((b) => b.boutId));
    for (const id of existing.boutIds) {
      if (!parsedIds.has(id)) bouts.push({ action: 'cancel', id });
    }
  }

  return { event: { id: toEventId(parsed.espnId), data: eventData }, bouts, fighters };
}

function printSummary(events: ParsedEvent[]): void {
  if (events.length === 0) {
    console.log('no events found');
    return;
  }
  for (const e of events) {
    const main = e.bouts.find((b) => b.isMainEvent);
    const tag = e.number ? `#${e.number}` : e.kind;
    const headline = main ? `, main event: ${main.a.name} vs ${main.b.name}` : ', no main-card bouts yet';
    console.log(`${e.name} [${tag}] — ${e.bouts.length} main-card bout(s)${headline}`);
  }
}

function dateRange(days: number): string {
  const fmt = (d: Date): string =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  const start = new Date();
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  return `${fmt(start)}-${fmt(end)}`;
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

async function loadScoreboard(args: Args): Promise<EspnScoreboard> {
  if (args.fixture) {
    const raw = await readFile(args.fixture, 'utf8');
    return JSON.parse(raw) as EspnScoreboard;
  }
  return fetchJson<EspnScoreboard>(`${SITE}/scoreboard?dates=${dateRange(LOOKAHEAD_DAYS)}`);
}

async function loadExisting(evtId: string): Promise<ExistingEvent | null> {
  const { db } = getAdmin();
  const snap = await db.collection('events').doc(evtId).get();
  if (!snap.exists) return null;
  const data = snap.data() as Event;
  const bouts = await db.collection('events').doc(evtId).collection('bouts').get();
  return {
    status: data.status,
    buyIn: data.buyIn,
    budget: data.budget,
    enabled: data.enabled,
    firstBloodEnabled: data.firstBloodEnabled,
    boutIds: bouts.docs.map((d) => d.id),
  };
}

async function loadConfig(): Promise<PlanConfig> {
  const { db } = getAdmin();
  const snap = await db.collection('config').doc('app').get();
  const data = snap.data() as { autoEnableNumbered?: boolean; defaults?: { buyIn?: number; budget?: number } } | undefined;
  return {
    autoEnableNumbered: data?.autoEnableNumbered ?? true,
    buyIn: data?.defaults?.buyIn ?? DEFAULTS.buyIn,
    budget: data?.defaults?.budget ?? DEFAULTS.budget,
  };
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  const scoreboard = await loadScoreboard(args);
  const parsedEvents = parseEvents(scoreboard);
  printSummary(parsedEvents);

  if (!args.live) return;

  const { db } = getAdmin();
  const config = await loadConfig();
  let boutsWritten = 0;
  let fightersWritten = 0;
  let cancelled = 0;

  for (const parsed of parsedEvents) {
    const evtId = toEventId(parsed.espnId);
    const existing = await loadExisting(evtId);
    const now = Timestamp.now();
    const plan = planEventWrites(existing, parsed, config, now, (iso) => Timestamp.fromMillis(Date.parse(iso)));

    const batch = db.batch();
    batch.set(db.collection('events').doc(plan.event.id), plan.event.data, { merge: true });
    for (const b of plan.bouts) {
      const ref = db.collection('events').doc(evtId).collection('bouts').doc(b.id);
      if (b.action === 'cancel') {
        batch.set(ref, { status: 'cancelled' }, { merge: true });
        cancelled++;
      } else {
        batch.set(ref, b.data, { merge: true });
        boutsWritten++;
      }
    }
    for (const f of plan.fighters) {
      batch.set(db.collection('fighters').doc(f.id), f.data, { merge: true });
      fightersWritten++;
    }
    await batch.commit();
    log.info(JOB_NAME, `upserted ${parsed.name}`, { bouts: plan.bouts.length, fighters: plan.fighters.length });
  }

  const summary = `${parsedEvents.length} events, ${boutsWritten} bouts upserted, ${fightersWritten} fighters upserted, ${cancelled} bouts cancelled`;
  await recordJobRun(JOB_NAME, true, summary);
  log.info(JOB_NAME, summary);
}

const isDirectRun = process.argv[1]?.endsWith('ingest-events.ts') ?? false;
if (isDirectRun) {
  main().catch((error: unknown) => {
    log.error(JOB_NAME, 'ingest failed', { error: String(error) });
    recordJobRun(JOB_NAME, false, 'ingest failed', String(error))
      .catch(() => {})
      .finally(() => process.exit(1));
  });
}
