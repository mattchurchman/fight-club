import { describe, expect, it } from 'vitest';
import { STARTING_GRANT_SCOPE } from '@shared/ledger-plan.ts';
import type { LedgerRow } from '@shared/index.ts';
import { postLedger, type DocRef, type LedgerRefs, type LedgerTransaction } from './ledger.ts';

// `postLedger` takes its refs, so this runs against a fake store instead of the emulator — the point
// under test is the re-run behaviour (docs/tasks/T09 step 1), not Firestore itself.

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
      const data = collection === 'ledger' ? rows.get(id) : users.get(id) !== undefined ? { balance: users.get(id) } : undefined;
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

describe('postLedger', () => {
  it('writes the row and the new balance together, under a deterministic id', async () => {
    const { refs, tx, rows, users } = store({ u1: 500 });
    const outcome = await postLedger(tx, { uid: 'u1', amount: -100, type: 'buyin', scope: 'evt_1' }, refs);

    expect(outcome).toEqual({ posted: true, id: 'buyin_evt_1_u1', balanceAfter: 400 });
    expect(users.get('u1')).toBe(400);
    expect(row(rows, 'buyin_evt_1_u1')).toMatchObject({
      uid: 'u1',
      amount: -100,
      type: 'buyin',
      eventId: 'evt_1',
      note: null,
      createdBy: 'system',
      balanceAfter: 400,
    });
  });

  it('is a no-op the second time, so a re-run cannot double-charge', async () => {
    const { refs, tx, rows, users } = store({ u1: 500 });
    const post = () => postLedger(tx, { uid: 'u1', amount: -100, type: 'buyin', scope: 'evt_1' }, refs);

    await post();
    const second = await post();

    expect(second).toEqual({ posted: false, id: 'buyin_evt_1_u1', balanceAfter: 400 });
    expect(users.get('u1')).toBe(400);
    expect(rows.size).toBe(1);
  });

  it('keys payouts and refunds by event and player too', async () => {
    const { refs, tx, users } = store({ u1: 400 });
    expect((await postLedger(tx, { uid: 'u1', amount: 280, type: 'payout', scope: 'evt_1' }, refs)).id).toBe('payout_evt_1_u1');
    expect((await postLedger(tx, { uid: 'u1', amount: 100, type: 'refund', scope: 'evt_2' }, refs)).id).toBe('refund_evt_2_u1');
    expect(users.get('u1')).toBe(780);
  });

  it('gives the signup grant its own key but no event', async () => {
    const { refs, tx, rows } = store({ u1: 0 });
    const outcome = await postLedger(
      tx,
      { uid: 'u1', amount: 500, type: 'grant', scope: STARTING_GRANT_SCOPE, note: 'welcome' },
      refs,
    );

    expect(outcome.id).toBe('grant_start_u1');
    expect(row(rows, 'grant_start_u1')).toMatchObject({ type: 'grant', eventId: null, note: 'welcome', balanceAfter: 500 });
  });

  it('lets an ad-hoc admin row take a random id, so it can repeat', async () => {
    const { refs, tx, rows, users } = store({ u1: 100 });
    const first = await postLedger(tx, { uid: 'u1', amount: 50, type: 'adjust', scope: null, createdBy: 'uid_admin' }, refs);
    const second = await postLedger(tx, { uid: 'u1', amount: 50, type: 'adjust', scope: null, createdBy: 'uid_admin' }, refs);

    expect(first.id).not.toBe(second.id);
    expect(rows.size).toBe(2);
    expect(users.get('u1')).toBe(200);
    expect(row(rows, second.id)).toMatchObject({ createdBy: 'uid_admin', balanceAfter: 200 });
  });

  it('refuses to move a balance that does not exist', async () => {
    const { refs, tx } = store({});
    await expect(
      postLedger(tx, { uid: 'ghost', amount: -100, type: 'buyin', scope: 'evt_1' }, refs),
    ).rejects.toThrow('unknown user ghost');
  });
});
