// docs/tasks/T24-push-notifications.md — FCM web push.
//
// Three hooks, each a pure planner (who gets what — unit-tested in notify.test.ts without the
// emulator) plus a thin Firestore+Admin-Messaging runner:
//   - lock reminder: events 45-75 min from lockAt, to players with no entry yet.
//   - finalize summary: one per submitted entry, right after jobs/lifecycle.ts finalizes an event.
//   - token request resolution: tokenRequests resolved since the last run.
//
// `runLockReminders` and `runTokenRequestApprovals` are called both from here (this file's own
// `--live` cron, for the weekday gap — see .github/workflows/jobs.yml) and from
// jobs/lifecycle.ts's main() (covering fight-weekend cadence for free). Both are idempotent
// (`notified.lockReminder` / `notifiedAt`), so running from two schedules in the same window
// never double-sends.
import { Timestamp } from 'firebase-admin/firestore';
import type { Message } from 'firebase-admin/messaging';
import type { Event, TokenRequest } from '@shared/index.ts';
import type { Millis } from '@shared/lifecycle/index.ts';
import { getAdmin } from './lib/admin.ts';
import { log, recordJobRun } from './lib/log.ts';

const JOB_NAME = 'notify';

export interface NotificationPayload {
  title: string;
  body: string;
  /** App-relative deep link the service worker opens on click. */
  url: string;
}

// ---------------------------------------------------------------------------
// Pure planners
// ---------------------------------------------------------------------------

export interface LockReminderEvent {
  id: string;
  name: string;
  status: Event['status'];
  lockAt: Millis;
  notifiedLockReminder: boolean;
}

const LOCK_REMINDER_MIN_MS = 45 * 60 * 1000;
const LOCK_REMINDER_MAX_MS = 75 * 60 * 1000;

/** Events whose lock is 45-75 min out, not yet reminded. */
export function planLockReminderEvents(
  events: readonly LockReminderEvent[],
  now: Millis,
): LockReminderEvent[] {
  return events.filter((event) => {
    if (event.status !== 'open' || event.notifiedLockReminder) return false;
    const until = event.lockAt - now;
    return until >= LOCK_REMINDER_MIN_MS && until <= LOCK_REMINDER_MAX_MS;
  });
}

export interface FinalizeEntryInput {
  uid: string;
  rank: number;
  payout: number;
}

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** One payload per submitted entry: "you finished Nth (+X tokens)". */
export function planFinalizeSummaries(
  eventId: string,
  eventName: string,
  entries: readonly FinalizeEntryInput[],
): { uid: string; payload: NotificationPayload }[] {
  return entries.map((entry) => ({
    uid: entry.uid,
    payload: {
      title: 'Results are in',
      body: `You finished ${ordinal(entry.rank)} in ${eventName} (${entry.payout >= 0 ? '+' : ''}${entry.payout} tokens).`,
      url: `/events/${eventId}`,
    },
  }));
}

export interface TokenRequestInput {
  id: string;
  uid: string;
  amount: number;
  status: TokenRequest['status'];
  notifiedAt: Millis | null;
}

/** Resolved requests nobody's been told about yet. */
export function planTokenRequestNotifications(
  requests: readonly TokenRequestInput[],
): { id: string; uid: string; payload: NotificationPayload }[] {
  return requests
    .filter((request) => request.status !== 'pending' && request.notifiedAt === null)
    .map((request) => ({
      id: request.id,
      uid: request.uid,
      payload: {
        title: request.status === 'approved' ? 'Token request approved' : 'Token request denied',
        body:
          request.status === 'approved'
            ? `Your request for ${request.amount} tokens was approved.`
            : `Your request for ${request.amount} tokens was denied.`,
        url: '/wallet',
      },
    }));
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

/** Sends one payload to every device of every uid (Admin SDK `sendEach`), pruning dead tokens. */
export async function sendToUsers(uids: readonly string[], payload: NotificationPayload): Promise<void> {
  const { db, messaging } = getAdmin();
  const unique = [...new Set(uids)];
  if (unique.length === 0) return;

  const targets: { uid: string; token: string }[] = [];
  await Promise.all(
    unique.map(async (uid) => {
      const snap = await db.collection('users').doc(uid).collection('devices').get();
      for (const doc of snap.docs) targets.push({ uid, token: doc.id });
    }),
  );
  if (targets.length === 0) return;

  const messages: Message[] = targets.map((target) => ({
    token: target.token,
    data: { title: payload.title, body: payload.body, url: payload.url },
  }));

  const result = await messaging.sendEach(messages);
  await Promise.all(
    result.responses.map((response, i) => {
      if (response.success) return Promise.resolve();
      const code = response.error?.code;
      if (!code || !INVALID_TOKEN_CODES.has(code)) {
        log.warn(JOB_NAME, `send failed for ${targets[i]!.uid}`, { code });
        return Promise.resolve();
      }
      return db.collection('users').doc(targets[i]!.uid).collection('devices').doc(targets[i]!.token).delete();
    }),
  );
}

// ---------------------------------------------------------------------------
// Orchestration (Firestore ⇄ planners)
// ---------------------------------------------------------------------------

/** One payload per submitted entry, sent right after jobs/lifecycle.ts finalizes an event. */
export async function sendFinalizeSummaries(
  eventId: string,
  eventName: string,
  entries: readonly FinalizeEntryInput[],
  live: boolean,
): Promise<number> {
  const notifications = planFinalizeSummaries(eventId, eventName, entries);
  if (live) {
    for (const notification of notifications) await sendToUsers([notification.uid], notification.payload);
  }
  return notifications.length;
}

/** Players with no entry yet, for events locking in 45-75 min. Returns how many events fired. */
export async function runLockReminders(now: Millis, live: boolean): Promise<number> {
  const { db } = getAdmin();
  const snap = await db.collection('events').where('status', '==', 'open').get();
  const events: LockReminderEvent[] = snap.docs.map((doc) => {
    const data = doc.data() as Event<Timestamp> & { notified?: { lockReminder?: boolean } };
    return {
      id: doc.id,
      name: data.name,
      status: data.status,
      lockAt: data.lockAt.toMillis(),
      notifiedLockReminder: data.notified?.lockReminder === true,
    };
  });
  const due = planLockReminderEvents(events, now);

  for (const event of due) {
    const entriesSnap = await db.collection('events').doc(event.id).collection('entries').get();
    const submitted = new Set(entriesSnap.docs.map((doc) => doc.id));
    const usersSnap = await db.collection('users').get();
    const uids = usersSnap.docs.map((doc) => doc.id).filter((uid) => !submitted.has(uid));

    console.log(`  lock reminder ${event.id}: ${uids.length} player(s) without an entry`);
    if (live) {
      await sendToUsers(uids, {
        title: 'Picks lock in 1 hour',
        body: `${event.name}'s picks lock soon — get your entry in.`,
        url: `/events/${event.id}`,
      });
      await db.collection('events').doc(event.id).set({ notified: { lockReminder: true } }, { merge: true });
    }
  }
  return due.length;
}

/** Token requests an admin resolved since the last run. Returns how many fired. */
export async function runTokenRequestApprovals(live: boolean): Promise<number> {
  const { db } = getAdmin();
  const snap = await db.collection('tokenRequests').where('status', 'in', ['approved', 'denied']).get();
  const requests: TokenRequestInput[] = snap.docs.map((doc) => {
    const data = doc.data() as TokenRequest<Timestamp> & { notifiedAt?: Timestamp | null };
    return {
      id: doc.id,
      uid: data.uid,
      amount: data.amount,
      status: data.status,
      notifiedAt: data.notifiedAt?.toMillis() ?? null,
    };
  });
  const due = planTokenRequestNotifications(requests);

  for (const notification of due) {
    console.log(`  token request ${notification.id}: notify ${notification.uid}`);
    if (live) {
      await sendToUsers([notification.uid], notification.payload);
      await db.collection('tokenRequests').doc(notification.id).set({ notifiedAt: Timestamp.now() }, { merge: true });
    }
  }
  return due.length;
}

// ---- Entry point ----

interface Args {
  live: boolean;
  now: Millis;
  testUid: string | null;
}

function parseArgs(argv: string[]): Args {
  const flagValue = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i === -1 ? null : (argv[i + 1] ?? null);
  };
  const nowArg = flagValue('--now');
  const now = nowArg ? Date.parse(nowArg) : Date.now();
  if (Number.isNaN(now)) throw new Error(`--now: not an ISO timestamp: ${nowArg}`);
  return {
    live: argv.includes('--live') && !argv.includes('--dry-run'),
    now,
    testUid: flagValue('--test'),
  };
}

/** Standalone schedule for lock reminders only (docs/ARCHITECTURE.md "Schedules"): lifecycle's
 *  own weekday cadence (every 3h) is too sparse to reliably hit the 45-75 min window, so this runs
 *  every 15 min, every day. Finalize summaries and token-request approvals ride along with
 *  jobs/lifecycle.ts instead, since those aren't time-sensitive the same way. */
export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);

  if (args.testUid) {
    console.log(`test push → ${args.testUid}`);
    if (args.live) {
      await sendToUsers([args.testUid], {
        title: 'Fight Club',
        body: 'Test push — notifications are working.',
        url: '/me',
      });
    }
    return;
  }

  const reminders = await runLockReminders(args.now, args.live);
  const line = `${reminders} lock reminder(s)${args.live ? '' : ' (dry run — nothing sent)'}`;
  console.log(line);
  if (args.live) {
    await recordJobRun(JOB_NAME, true, line);
    log.info(JOB_NAME, line);
  }
}

const isDirectRun = process.argv[1]?.endsWith('notify.ts') ?? false;
if (isDirectRun) {
  main().catch((error: unknown) => {
    log.error(JOB_NAME, 'notify failed', { error: String(error) });
    recordJobRun(JOB_NAME, false, 'notify failed', String(error))
      .catch(() => {})
      .finally(() => process.exit(1));
  });
}
