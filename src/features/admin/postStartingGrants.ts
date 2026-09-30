// The client half of the starting-grant step (docs/tasks/T17 step 6) — same planner the lifecycle
// job runs, invoked by the admin console's "Post pending starting grants" button. Unlike the job,
// this has no cheap way to know in advance who's already been paid, so it plans for everyone and
// relies on `postLedgerRow`'s deterministic `grant_start_<uid>` id to no-op the rest.
import { planStartingGrants } from '@shared/lifecycle/grants.ts';
import { postLedgerRow } from './postLedger.ts';
import type { AllowlistEntryWithId, UserWithId } from './hooks.ts';

export async function postPendingStartingGrants(
  users: readonly UserWithId[],
  allowlist: readonly AllowlistEntryWithId[],
  adminUid: string,
): Promise<number> {
  const allowlistMap = new Map(allowlist.map((entry) => [entry.id, entry.startingGrant]));
  const plan = planStartingGrants(
    users.map((u) => ({ uid: u.id, email: u.email })),
    allowlistMap,
    new Set(),
  );

  let posted = 0;
  for (const grant of plan.grants) {
    const outcome = await postLedgerRow({
      uid: grant.uid,
      amount: grant.amount,
      type: 'grant',
      scope: grant.scope,
      note: grant.note,
      createdBy: adminUid,
    });
    if (outcome.posted) posted += 1;
  }
  return posted;
}
