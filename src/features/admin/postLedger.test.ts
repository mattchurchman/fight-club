import { describe, expect, it } from 'vitest';
import { STARTING_GRANT_SCOPE } from '@shared/ledger-plan.ts';
import type { LedgerRow } from '@shared/index.ts';
import { postLedger, type DocRef, type LedgerRefs, type LedgerTransaction } from './postLedger.ts';

// Mirrors `jobs/lib/ledger.test.ts`: `postLedger` takes its refs, so this runs against a fake store
// instead of the emulator. The point under test is that the client twin re-runs safely too.

interface FakeRef extends DocRef {
  collection: 'ledger' | 'users';
}

function store(balances: Record<string, number>) {
  const rows = new Map<string, Record<string, unknown>>();
  const users = new Map(Object.entries(balances));
  let autoIds = 0;

  const refs: LedgerRefs = {
    ledgerDoc: (id): FakeRef => ({ collection: 'ledger', id: id ?? `auto_${++autoIds}` }),
    userDoc: (uid): FakeRef => ({ collection: 'users', id: uid }),
  };

  const tx: LedgerTransaction = {
    get: (ref) => {
      const { collection, id } = ref as FakeRef;
      const data =
        collection === 'ledger' ? rows.get(id) : users.get(id) !== undefined ? { balance: users.get(id) } : undefined;
      return Promise.resolve({ exists: data !== undefined, data: () => data });
    },
    set: (ref, data) => rows.set((ref as FakeRef).id, data as Record<string, unknown>),
    update: (ref, data) => users.set((ref as FakeRef).id, (data as { balance: number }).balance),
  };

  return { refs, tx, rows, users };
}

function row(rows: Map<string, Record<string, unknown>>, id: string): LedgerRow<unknown> {
  return rows.get(id) as unknown as LedgerRow<unknown>;
}

describe('postLedger (client)', () => {
  it('writes the row and the new balance together, under a deterministic id', async () => {
    const { refs, tx, rows, users } = store({ u1: 500 });
    const outcome = await postLedger(
      tx,
      { uid: 'u1', amount: 500, type: 'grant', scope: STARTING_GRANT_SCOPE, createdBy: 'admin1' },
      refs,
    );

    expect(outcome).toEqual({ posted: true, id: 'grant_start_u1', balanceAfter: 1000 });
    expect(users.get('u1')).toBe(1000);
    expect(row(rows, 'grant_start_u1')).toMatchObject({
      uid: 'u1',
      amount: 500,
      type: 'grant',
      eventId: null,
      createdBy: 'admin1',
      balanceAfter: 1000,
    });
  });

  it('is a no-op the second time, so a re-click cannot double-grant', async () => {
    const { refs, tx, rows, users } = store({ u1: 0 });
    const post = () =>
      postLedger(tx, { uid: 'u1', amount: 500, type: 'grant', scope: STARTING_GRANT_SCOPE, createdBy: 'admin1' }, refs);

    await post();
    const second = await post();

    expect(second).toEqual({ posted: false, id: 'grant_start_u1', balanceAfter: 500 });
    expect(users.get('u1')).toBe(500);
    expect(rows.size).toBe(1);
  });

  it('lets an ad-hoc admin grant or adjust take a random id, so it can repeat', async () => {
    const { refs, tx, rows, users } = store({ u1: 100 });
    const first = await postLedger(tx, { uid: 'u1', amount: 50, type: 'adjust', scope: null, createdBy: 'admin1', note: 'fix' }, refs);
    const second = await postLedger(tx, { uid: 'u1', amount: 50, type: 'adjust', scope: null, createdBy: 'admin1', note: 'fix' }, refs);

    expect(first.id).not.toBe(second.id);
    expect(rows.size).toBe(2);
    expect(users.get('u1')).toBe(200);
    expect(row(rows, second.id)).toMatchObject({ createdBy: 'admin1', note: 'fix', balanceAfter: 200 });
  });

  it('refuses to move a balance for an unknown user', async () => {
    const { refs, tx } = store({});
    await expect(
      postLedger(tx, { uid: 'ghost', amount: 50, type: 'adjust', scope: null, createdBy: 'admin1' }, refs),
    ).rejects.toThrow('unknown user ghost');
  });
});
