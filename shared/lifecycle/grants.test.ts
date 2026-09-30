import { describe, expect, it } from 'vitest';
import { STARTING_GRANT_SCOPE } from '../ledger-plan.ts';
import { planStartingGrants } from './grants.ts';

describe('planStartingGrants', () => {
  it('grants every allowlisted user who has none yet', () => {
    const plan = planStartingGrants(
      [
        { uid: 'u1', email: 'A@Example.com' },
        { uid: 'u2', email: 'b@example.com' },
      ],
      new Map([
        ['a@example.com', 500],
        ['b@example.com', 250],
      ]),
      new Set(),
    );

    expect(plan.applies).toBe(true);
    expect(plan.grants).toEqual([
      { uid: 'u1', amount: 500, scope: STARTING_GRANT_SCOPE, note: 'Starting grant' },
      { uid: 'u2', amount: 250, scope: STARTING_GRANT_SCOPE, note: 'Starting grant' },
    ]);
  });

  it('is idempotent: a uid already granted is skipped', () => {
    const plan = planStartingGrants(
      [{ uid: 'u1', email: 'a@example.com' }],
      new Map([['a@example.com', 500]]),
      new Set(['u1']),
    );

    expect(plan).toEqual({ applies: false, reason: 'no-candidates', grants: [] });
  });

  it('skips a user whose email has no matching allowlist entry', () => {
    const plan = planStartingGrants(
      [{ uid: 'u1', email: 'ghost@example.com' }],
      new Map([['a@example.com', 500]]),
      new Set(),
    );

    expect(plan).toEqual({ applies: false, reason: 'no-candidates', grants: [] });
  });

  it('reports nothing to do when every user is already granted', () => {
    const plan = planStartingGrants(
      [
        { uid: 'u1', email: 'a@example.com' },
        { uid: 'u2', email: 'b@example.com' },
      ],
      new Map([
        ['a@example.com', 500],
        ['b@example.com', 250],
      ]),
      new Set(['u1', 'u2']),
    );

    expect(plan.applies).toBe(false);
    expect(plan.grants).toEqual([]);
  });
});
