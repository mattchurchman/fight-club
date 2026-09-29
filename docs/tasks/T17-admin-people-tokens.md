# T17 — Admin console: invites, people & tokens

**Tier:** B · **Size:** M · **Depends on:** T06, T09, T16
**USER ACTION REQUIRED:** none

## Goal
The admin can invite friends, see everyone, approve or deny token requests, and grant or adjust tokens, all from a phone.
Every token change is a transactional ledger entry. New players automatically receive their starting grant.

## Context to load (only these)
- `AGENTS.md`
- `docs/DATA_MODEL.md` → config/app, allowlist, users, ledger, tokenRequests
- Exports only: `shared/ledger-plan.ts`, `jobs/lib/ledger.ts`, `src/components/ui/index.ts`, `src/features/auth/index.ts`

## Files you may touch
`src/features/admin/**` (people, tokens), `src/app/routes` (`/admin`, `/admin/people`, `/admin/tokens`),
`shared/lifecycle/grants.ts` (+ test), `jobs/lifecycle.ts` (add one call to the grants step)

## Steps
1. `src/features/admin/postLedger.ts`: the client-side twin of `jobs/lib/ledger.ts`. It uses `shared/ledger-plan.ts` inside a web-SDK
   `runTransaction`, so admin-posted rows are identical in shape to job-posted ones.
2. `/admin` home: cards for pending requests (count), players, invites, and a "Jobs" status panel (from `jobRuns/*`: last run, ok/error)
   with a hint on how to run a job from GitHub (SETUP §S10).
3. Invites: add an email, role and starting grant (default from config) → `allowlist`. List invites as pending or joined (joined = a user exists with that email). Revoke a pending invite.
4. People: the list with balance, events played, last seen, and actions: Grant / Deduct (amount + note → an `adjust` or `grant` ledger row), and Make admin.
5. Token requests: approve (posts a `grant` row + sets the request to approved) or deny (with an optional note), all in one transaction.
6. Starting grants: `grantStartingTokens()` (pure planner + executor) runs in the lifecycle job. For each user without a ledger doc
   `grant_start_<uid>`, it posts `allowlist.startingGrant`. The admin console also offers a "Post pending starting grants" button that does the same from the client.
7. Tests: ledger-plan math and IDs, the grants planner (idempotent), and request approval producing exactly one ledger row.

## Acceptance criteria
- [ ] On the seed: invite a new email, sign in as it, onboard, and the starting grant appears (via the button or a lifecycle run); approving a request raises the balance and adds a ledger row
- [ ] Rules tests still pass. Definition of Done passes. Build passes.

## Out of scope
Event controls (T18).

## Completion notes
_(agent fills in)_
