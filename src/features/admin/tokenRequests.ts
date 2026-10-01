// Token-request resolution (docs/tasks/T17 step 5). Approve posts a `grant` ledger row and resolves
// the request in one transaction; deny just resolves it — `firestore.rules` only lets an admin change
// `status`/`resolvedBy`/`resolvedAt` on `tokenRequests`, so a denial note has nowhere to persist to
// (see docs/PROGRESS.md backlog).
import { doc, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase.ts';
import {
  adaptTransaction,
  firestoreRefs,
  postLedger,
  type DocRef,
  type LedgerOutcome,
  type LedgerRefs,
  type LedgerTransaction,
} from './postLedger.ts';

export interface ApproveInput {
  requestId: string;
  uid: string;
  amount: number;
  adminUid: string;
}

export interface ApproveRefs extends LedgerRefs {
  requestDoc(id: string): DocRef;
}

/**
 * The transaction body, kept separate from the real `runTransaction` call so it can run against a
 * fake store in tests (mirrors `postLedger`'s own DI). `resolvedAt` is a sentinel the caller supplies
 * — `serverTimestamp()` in production, anything comparable in a test.
 */
export async function approveInTx(
  tx: LedgerTransaction,
  input: ApproveInput,
  refs: ApproveRefs,
  resolvedAt: unknown,
): Promise<LedgerOutcome> {
  const requestRef = refs.requestDoc(input.requestId);
  const requestSnap = await tx.get(requestRef);
  const request = requestSnap.data() as { status?: string; amount?: number; uid?: string } | undefined;
  if (request?.status !== 'pending') {
    throw new Error('This request was already resolved.');
  }
  // `amount` and `uid` arrive from the admin screen's listener snapshot. The grant is money, so
  // check them against the request as this transaction reads it rather than trusting the caller
  // (docs/tasks/T20).
  if (request.amount !== input.amount || request.uid !== input.uid) {
    throw new Error('This request changed while you were looking at it. Reload and try again.');
  }

  const outcome = await postLedger(
    tx,
    {
      uid: input.uid,
      amount: input.amount,
      type: 'grant',
      scope: null,
      note: `Token request ${input.requestId}`,
      createdBy: input.adminUid,
    },
    refs,
  );

  tx.update(requestRef, { status: 'approved', resolvedBy: input.adminUid, resolvedAt });
  return outcome;
}

export async function approveTokenRequest(requestId: string, uid: string, amount: number, adminUid: string): Promise<void> {
  const refs: ApproveRefs = { ...firestoreRefs(db), requestDoc: (id) => doc(db, 'tokenRequests', id) };
  await runTransaction(db, (tx) => approveInTx(adaptTransaction(tx), { requestId, uid, amount, adminUid }, refs, serverTimestamp()));
}

export async function denyTokenRequest(requestId: string, adminUid: string): Promise<void> {
  await updateDoc(doc(db, 'tokenRequests', requestId), {
    status: 'denied',
    resolvedBy: adminUid,
    resolvedAt: serverTimestamp(),
  });
}
