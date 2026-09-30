import { isPaid } from './scores.ts';
import type {
  EventPatch,
  LedgerIntent,
  LifecycleEntry,
  LifecycleEvent,
  Millis,
  Plan,
} from './types.ts';

// docs/GAME_RULES.md §6: "Event cancelled: everyone charged gets a full refund." Pure.

export interface CancelPlan extends Plan {
  reason: 'not-cancelled' | 'already-settled' | null;
  ledger: LedgerIntent[];
  refunded: string[];
  event: EventPatch;
}

/**
 * Refunds every buy-in taken for an event that was called off. `finalizedAt` doubles as the
 * settled-at stamp, which is what stops a second run from planning the refunds again (the
 * deterministic `refund_<eventId>_<uid>` ids make the writes themselves no-ops regardless).
 */
export function planCancel(
  event: LifecycleEvent,
  entries: readonly LifecycleEntry[],
  now: Millis,
): CancelPlan {
  if (event.status !== 'cancelled') {
    return { applies: false, reason: 'not-cancelled', ledger: [], refunded: [], event: {} };
  }
  if (event.finalizedAt !== null) {
    return { applies: false, reason: 'already-settled', ledger: [], refunded: [], event: {} };
  }

  const refunded = entries
    .filter(isPaid)
    .map((entry) => entry.uid)
    .sort();

  return {
    applies: true,
    reason: null,
    ledger: refunded.map((uid) => ({
      uid,
      amount: event.buyIn,
      type: 'refund' as const,
      eventId: event.id,
      note: 'event cancelled',
    })),
    refunded,
    event: { finalizedAt: now },
  };
}
