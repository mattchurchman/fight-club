import { describe, expect, it } from 'vitest';
import type { DocRef, LedgerRefs, LedgerTransaction } from './postLedger.ts';
import { approveInTx, type ApproveRefs } from './tokenRequests.ts';

// Same fake-store trick as `postLedger.test.ts`: a request doc plus a user/ledger store, so approval
// runs against plain objects instead of the emulator.

interface FakeRef extends DocRef {
  collection: 'ledger' | 'users' | 'tokenRequests';
}

function store(users: Record<string, number>, requests: Record<string, { status: string }>) {
  const rows = new Map<string, Record<string, unknown>>();
  const userBalances = new Map(Object.entries(users));
  const requestDocs = new Map(Object.entries(requests));
  let autoIds = 0;

  const refs: ApproveRefs = {
    ledgerDoc: (id): FakeRef => ({ collection: 'ledger', id: id ?? `auto_${++autoIds}` }),
    userDoc: (uid): FakeRef => ({ collection: 'users', id: uid }),
    requestDoc: (id): FakeRef => ({ collection: 'tokenRequests', id }),
  } satisfies LedgerRefs & ApproveRefs;

  const tx: LedgerTransaction = {
    get: (ref) => {
      const { collection, id } = ref as FakeRef;
      const data =
        collection === 'ledger'
          ? rows.get(id)
          : collection === 'users'
            ? userBalances.get(id) !== undefined
              ? { balance: userBalances.get(id) }
              : undefined
            : requestDocs.get(id);
      return Promise.resolve({ exists: data !== undefined, data: () => data });
    },
    set: (ref, data) => rows.set((ref as FakeRef).id, data as Record<string, unknown>),
    update: (ref, data) => {
      const { collection, id } = ref as FakeRef;
      if (collection === 'users') {
        userBalances.set(id, (data as { balance: number }).balance);
      } else if (collection === 'tokenRequests') {
        requestDocs.set(id, { ...requestDocs.get(id), ...(data as { status: string }) });
      }
    },
  };

  return { refs, tx, rows, userBalances, requestDocs };
}

describe('approveInTx', () => {
  it('posts exactly one ledger row and approves the request', async () => {
    const { refs, tx, rows, userBalances, requestDocs } = store({ u1: 100 }, { req1: { status: 'pending' } });

    const outcome = await approveInTx(tx, { requestId: 'req1', uid: 'u1', amount: 200, adminUid: 'admin1' }, refs, 'NOW');

    expect(outcome.posted).toBe(true);
    expect(rows.size).toBe(1);
    expect(userBalances.get('u1')).toBe(300);
    expect(requestDocs.get('req1')).toEqual({ status: 'approved', resolvedBy: 'admin1', resolvedAt: 'NOW' });
  });

  it('refuses to approve a request that is no longer pending', async () => {
    const { refs, tx, rows } = store({ u1: 100 }, { req1: { status: 'approved' } });

    await expect(
      approveInTx(tx, { requestId: 'req1', uid: 'u1', amount: 200, adminUid: 'admin1' }, refs, 'NOW'),
    ).rejects.toThrow('already resolved');
    expect(rows.size).toBe(0);
  });
});
