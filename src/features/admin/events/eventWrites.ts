// docs/tasks/T18 steps 1–2: direct field edits an admin makes on an event or one of its bouts.
// `firestore.rules` already gates every write here to `isAdmin()` with no field restrictions
// (see `events`/`bouts` in firestore.rules), so these are plain merges — the transactional, money-
// moving actions (rescore/finalize/cancel) live in `actions.ts` instead.
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { BoutResult, OddsSource, ResultMethod, Winner } from '@shared/index.ts';
import { db } from '../../../lib/firebase.ts';
import { mainCardIdsInOrder } from './card.ts';
import type { OrderedBout } from './card.ts';

export async function setEventEnabled(eventId: string, enabled: boolean): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'events', eventId), { enabled, updatedAt: serverTimestamp() });
  await batch.commit();
}

/** docs/tasks/T18 step 1: only while `open` — the caller (the page) enforces `canEditEventTerms`. */
export async function setEventTerms(
  eventId: string,
  patch: { buyIn?: number; firstBloodEnabled?: boolean },
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'events', eventId), { ...patch, updatedAt: serverTimestamp() });
  await batch.commit();
}

/**
 * docs/tasks/T18 step 2: writes every bout whose `order`/`isMainCard` changed and keeps the event's
 * denormalized `mainCardBoutIds` display field in step (see `card.ts#mainCardIdsInOrder`).
 */
export async function saveCard(
  eventId: string,
  bouts: readonly OrderedBout[],
  changed: readonly OrderedBout[],
): Promise<void> {
  const batch = writeBatch(db);
  for (const bout of changed) {
    batch.update(doc(db, 'events', eventId, 'bouts', bout.id), {
      order: bout.order,
      isMainCard: bout.isMainCard,
    });
  }
  batch.update(doc(db, 'events', eventId), {
    mainCardBoutIds: mainCardIdsInOrder(bouts),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

/** docs/tasks/T18 step 2: overriding odds sets `source: 'manual'` so the odds job never touches it again. */
export async function overrideOdds(eventId: string, boutId: string, a: number, b: number): Promise<void> {
  const source: OddsSource = 'manual';
  const batch = writeBatch(db);
  batch.update(doc(db, 'events', eventId, 'bouts', boutId), {
    odds: { a, b, source, updatedAt: serverTimestamp(), frozen: true },
  });
  await batch.commit();
}

export interface ResultInput {
  winner: Winner;
  method: ResultMethod;
  round: number | null;
  time: string | null;
  firstBlood: 'A' | 'B' | 'none' | null;
}

/**
 * docs/tasks/T18 step 2: enters or overrides a bout result (`source: 'manual'`, so the results job
 * never overwrites it — see `shared/lifecycle/results.ts`). Moves the event `locked → live` on its
 * first result, matching what `planResults` does for an automated one.
 */
export async function setResult(
  eventId: string,
  boutId: string,
  eventStatus: 'locked' | 'live',
  input: ResultInput,
): Promise<void> {
  const result: Omit<BoutResult, 'updatedAt'> & { updatedAt: ReturnType<typeof serverTimestamp> } = {
    winner: input.winner,
    method: input.method,
    round: input.round,
    time: input.time,
    firstBlood: input.firstBlood,
    source: 'manual',
    updatedAt: serverTimestamp(),
  };
  const batch = writeBatch(db);
  batch.update(doc(db, 'events', eventId, 'bouts', boutId), { status: 'final', result });
  if (eventStatus === 'locked') {
    batch.update(doc(db, 'events', eventId), { status: 'live', updatedAt: serverTimestamp() });
  }
  await batch.commit();
}
