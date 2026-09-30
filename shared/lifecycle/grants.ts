import { STARTING_GRANT_SCOPE } from '../ledger-plan.ts';
import type { Plan } from './types.ts';

// The starting-grant half of docs/tasks/T17. Every player gets `allowlist.startingGrant` exactly
// once, posted as a `grant_start_<uid>` ledger row (shared/ledger-plan.ts). That deterministic id is
// what actually stops a second run from paying twice; `alreadyGranted` here just lets the caller (the
// lifecycle job, or the admin console's "post pending starting grants" button) skip opening a
// transaction for players who plainly don't need one.

export interface GrantCandidate {
  uid: string;
  email: string;
}

export interface GrantIntent {
  uid: string;
  amount: number;
  scope: typeof STARTING_GRANT_SCOPE;
  note: string | null;
}

export interface GrantsPlan extends Plan {
  reason: 'no-candidates' | null;
  grants: GrantIntent[];
}

/**
 * `allowlist` is keyed by lower-cased email → starting grant amount. A user with no matching
 * allowlist entry (shouldn't happen — `users` can only be created while allowlisted, per
 * docs/DATA_MODEL.md — but the allowlist row could since have been revoked) is skipped rather than
 * guessing an amount.
 */
export function planStartingGrants(
  users: readonly GrantCandidate[],
  allowlist: ReadonlyMap<string, number>,
  alreadyGranted: ReadonlySet<string>,
): GrantsPlan {
  const grants: GrantIntent[] = [];
  for (const user of users) {
    if (alreadyGranted.has(user.uid)) continue;
    const amount = allowlist.get(user.email.toLowerCase());
    if (amount === undefined) continue;
    grants.push({ uid: user.uid, amount, scope: STARTING_GRANT_SCOPE, note: 'Starting grant' });
  }
  grants.sort((a, b) => a.uid.localeCompare(b.uid));

  return grants.length > 0
    ? { applies: true, reason: null, grants }
    : { applies: false, reason: 'no-candidates', grants: [] };
}
