// The client-side twin of `jobs/lib/ledger.ts` (docs/tasks/T17 step 1). Same shape, same
// re-runnable-by-deterministic-id behaviour, but built on the web SDK's `runTransaction` so
// admin-posted rows go through `firestore.rules` instead of the Admin SDK.
import type { DocumentData, DocumentReference, Firestore, Transaction } from 'firebase/firestore';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { ledgerId, planLedgerRow } from '@shared/ledger-plan.ts';
import type { LedgerRow, LedgerType, User } from '@shared/index.ts';
import { db } from '../../lib/firebase.ts';

/** What the caller asks to post. `scope` is `STARTING_GRANT_SCOPE` or null (admin `grant`/`adjust` rows). */
export interface LedgerPost {
  uid: string;
  /** Signed: negative for a deduction, positive for a grant. */
  amount: number;
  type: LedgerType;
  scope: string | null;
  note?: string | null;
  /** The admin's uid. */
  createdBy: string;
}

export interface LedgerOutcome {
  /** False when the row was already there, i.e. a re-click of an already-applied action. */
  posted: boolean;
  id: string;
  balanceAfter: number;
}

// Structural stand-ins for the pieces of the web SDK this module touches, so tests run against a
// fake store instead of the emulator — see `jobs/lib/ledger.test.ts` for the same trick server-side.
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

export function firestoreRefs(database: Firestore): LedgerRefs {
  return {
    ledgerDoc: (id) => (id === null ? doc(collection(database, 'ledger')) : doc(database, 'ledger', id)),
    userDoc: (uid) => doc(database, 'users', uid),
  };
}

/**
 * Posts one ledger row and moves the balance with it, inside `tx`. Re-runnable: a `type`/`scope`
 * pair with a natural key (the starting grant) gets a deterministic id, so a second click on an
 * already-applied action is a no-op instead of a double grant.
 */
export async function postLedger(
  tx: LedgerTransaction,
  input: LedgerPost,
  refs: LedgerRefs,
): Promise<LedgerOutcome> {
  const id = ledgerId(input.type, input.scope, input.uid);
  const ledgerRef = refs.ledgerDoc(id);
  const userRef = refs.userDoc(input.uid);

  const existing = id === null ? null : await tx.get(ledgerRef);
  if (existing?.exists) {
    const row = existing.data() as LedgerRow<unknown>;
    return { posted: false, id: ledgerRef.id, balanceAfter: row.balanceAfter };
  }

  const userSnap = await tx.get(userRef);
  if (!userSnap.exists) {
    throw new Error(`ledger: cannot post ${input.type} for unknown user ${input.uid}`);
  }

  const planned = planLedgerRow((userSnap.data() as User).balance, {
    uid: input.uid,
    amount: input.amount,
    type: input.type,
    scope: input.scope,
    note: input.note ?? null,
    createdBy: input.createdBy,
    now: serverTimestamp(),
  });

  tx.set(ledgerRef, planned.row);
  tx.update(userRef, { balance: planned.newBalance });
  return { posted: true, id: ledgerRef.id, balanceAfter: planned.newBalance };
}

export function adaptTransaction(tx: Transaction): LedgerTransaction {
  return {
    get: async (ref) => {
      const snap = await tx.get(ref as DocumentReference<DocumentData>);
      return { exists: snap.exists(), data: () => snap.data() };
    },
    set: (ref, data) => tx.set(ref as DocumentReference<DocumentData>, data as DocumentData),
    update: (ref, data) => tx.update(ref as DocumentReference<DocumentData>, data as DocumentData),
  };
}

/** `postLedger` in its own Firestore transaction — one row, one retryable admin action. */
export async function postLedgerRow(input: LedgerPost, database: Firestore = db): Promise<LedgerOutcome> {
  const refs = firestoreRefs(database);
  return runTransaction(database, (tx) => postLedger(adaptTransaction(tx), input, refs));
}

/**
 * `postLedger` against a `Transaction` a caller already has open, e.g. token-request approval
 * (docs/tasks/T17 step 5), which reads and resolves the request in the same transaction as the grant.
 */
export function postLedgerInTx(tx: Transaction, input: LedgerPost, database: Firestore = db): Promise<LedgerOutcome> {
  return postLedger(adaptTransaction(tx), input, firestoreRefs(database));
}
