// The only automated writer of `users.balance` (docs/DATA_MODEL.md: "every write to users.balance
// happens in the same transaction as its ledger row"). The decision of *what* to write is pure and
// lives in `shared/ledger-plan.ts`; this file is the Firestore half.
import { Timestamp } from 'firebase-admin/firestore';
import { STARTING_GRANT_SCOPE, ledgerId, planLedgerRow } from '@shared/ledger-plan.ts';
import type { LedgerRow, LedgerType, User } from '@shared/index.ts';
import { getAdmin } from './admin.ts';

export { STARTING_GRANT_SCOPE };

/** What the caller asks to post. `scope` is an event id, `STARTING_GRANT_SCOPE`, or null (admin rows). */
export interface LedgerPost {
  uid: string;
  /** Signed: negative for a buy-in, positive for a grant, payout or refund. */
  amount: number;
  type: LedgerType;
  scope: string | null;
  note?: string | null;
  createdBy?: string;
}

export interface LedgerOutcome {
  /** False when the row was already there, i.e. this is a re-run of a job that had got this far. */
  posted: boolean;
  id: string;
  balanceAfter: number;
}

// Structural stand-ins for the Firestore types, narrowed to what this module touches. The real
// `Transaction` and `DocumentReference` satisfy them, and so can a fake in a unit test — which is
// what keeps `jobs/lib/ledger.test.ts` off the emulator.
export interface DocRef {
  readonly id: string;
}

export interface DocSnap {
  readonly exists: boolean;
  data(): unknown;
}

export interface LedgerTransaction {
  get(ref: DocRef): Promise<DocSnap>;
  set(ref: DocRef, data: unknown): unknown;
  update(ref: DocRef, data: unknown): unknown;
}

export interface LedgerRefs {
  /** `id` is null for an ad-hoc row, where Firestore allocates the id. */
  ledgerDoc(id: string | null): DocRef;
  userDoc(uid: string): DocRef;
}

function firestoreRefs(): LedgerRefs {
  const { db } = getAdmin();
  return {
    ledgerDoc: (id) => (id === null ? db.collection('ledger').doc() : db.collection('ledger').doc(id)),
    userDoc: (uid) => db.collection('users').doc(uid),
  };
}

/**
 * Posts one ledger row and moves the balance with it, inside `tx`.
 *
 * Re-runnable: rows with a natural key (`buyin`/`payout`/`refund` for an event, the starting grant)
 * get a deterministic id, so finding the doc already there makes this a no-op instead of charging or
 * paying twice.
 *
 * Firestore requires every read in a transaction to precede every write, and this does one of each —
 * so call it at most once per transaction. Use `postLedgerRow` for the usual one-row-one-transaction
 * case, which is also what keeps a partial run recoverable.
 */
export async function postLedger(
  tx: LedgerTransaction,
  input: LedgerPost,
  refs: LedgerRefs = firestoreRefs(),
): Promise<LedgerOutcome> {
  const id = ledgerId(input.type, input.scope, input.uid);
  const ledgerRef = refs.ledgerDoc(id);
  const userRef = refs.userDoc(input.uid);

  const existing = id === null ? null : await tx.get(ledgerRef);
  if (existing?.exists) {
    const row = existing.data() as LedgerRow<Timestamp>;
    return { posted: false, id: ledgerRef.id, balanceAfter: row.balanceAfter };
  }

  const userSnap = await tx.get(userRef);
  if (!userSnap.exists) {
    throw new Error(`ledger: cannot post ${input.type} for unknown user ${input.uid}`);
  }

  const planned = planLedgerRow<Timestamp>((userSnap.data() as User<Timestamp>).balance, {
    uid: input.uid,
    amount: input.amount,
    type: input.type,
    scope: input.scope,
    note: input.note ?? null,
    createdBy: input.createdBy ?? 'system',
    now: Timestamp.now(),
  });

  tx.set(ledgerRef, planned.row);
  tx.update(userRef, { balance: planned.newBalance });
  return { posted: true, id: ledgerRef.id, balanceAfter: planned.newBalance };
}

/** `postLedger` in its own transaction — one row, one retryable unit of work. */
export async function postLedgerRow(input: LedgerPost): Promise<LedgerOutcome> {
  const { db } = getAdmin();
  return db.runTransaction((tx) => postLedger(tx, input));
}
