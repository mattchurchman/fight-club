import type { LedgerRow, LedgerType } from './types.ts';

// The ledger half of docs/tasks/T09. Pure: no clock, no I/O — the caller passes `now` and the
// balance it read. `jobs/lib/ledger.ts` is the only thing that turns these plans into writes.
//
// docs/DATA_MODEL.md makes `ledger` append-only and pairs every balance change with its row, so the
// job must be able to re-run without double-charging or double-paying. The lever is the doc id:
// every row the lifecycle job posts has a **deterministic** id derived from (type, scope, uid), so a
// second run finds the doc already there and does nothing. Ad-hoc admin rows (`grant`, `adjust`) have
// no natural key and keep Firestore's random ids.

/**
 * The scope of a ledger row: an event id for `buyin`/`payout`/`refund`, `STARTING_GRANT_SCOPE` for
 * the one-off signup grant, or `null` for an ad-hoc admin row. Only the event id reaches Firestore —
 * see `planLedgerRow`, which stores `eventId: null` for the starting grant.
 */
export const STARTING_GRANT_SCOPE = 'start';

/**
 * The id for a row whose key is natural, or `null` when the caller should let Firestore allocate one.
 * `buyin_<eventId>_<uid>` · `payout_<eventId>_<uid>` · `refund_<eventId>_<uid>` · `grant_start_<uid>`.
 */
export function ledgerId(type: LedgerType, scope: string | null, uid: string): string | null {
  if (type === 'buyin' || type === 'payout' || type === 'refund') {
    return scope === null ? null : `${type}_${scope}_${uid}`;
  }
  if (type === 'grant' && scope === STARTING_GRANT_SCOPE) {
    return `grant_start_${uid}`;
  }
  return null;
}

/** What a planner asks for: a signed token movement against one player. `Ts` is the caller's clock type. */
export interface LedgerInput<Ts> {
  uid: string;
  /** Signed: negative for a buy-in, positive for a grant, payout or refund. */
  amount: number;
  type: LedgerType;
  /** See `STARTING_GRANT_SCOPE`. */
  scope: string | null;
  note: string | null;
  /** A uid, or `'system'` for anything a job posts (docs/DATA_MODEL.md). */
  createdBy: string;
  now: Ts;
}

export interface PlannedLedgerRow<Ts> {
  /** `null` means "no natural key" — the caller allocates a random doc id. */
  id: string | null;
  row: LedgerRow<Ts>;
  newBalance: number;
}

/** Builds one ledger row and the balance it leaves behind. `balance` is the player's balance before it. */
export function planLedgerRow<Ts>(
  balance: number,
  input: LedgerInput<Ts>,
): PlannedLedgerRow<Ts> {
  const newBalance = balance + input.amount;
  return {
    id: ledgerId(input.type, input.scope, input.uid),
    row: {
      uid: input.uid,
      amount: input.amount,
      type: input.type,
      // The starting grant is scoped but belongs to no event.
      eventId: input.scope === STARTING_GRANT_SCOPE ? null : input.scope,
      note: input.note,
      createdBy: input.createdBy,
      createdAt: input.now,
      balanceAfter: newBalance,
    },
    newBalance,
  };
}
