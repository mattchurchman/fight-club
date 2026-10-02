# Security & launch review (T20)

Reviewed 2026-09-30 against `firestore.rules`, `tests/rules/**`, the money paths
(`shared/ledger-plan.ts`, `shared/lifecycle/**`, `src/features/admin/**`) and `.github/workflows/**`,
playing the clever friend who wants free tokens or an early look at the picks.
**Verdict: ship** — but the fixes below do nothing until `npm run deploy:rules` runs (SETUP §S8).

## Threat checklist

| Question | Verdict |
|---|---|
| Player writes own `balance`? | **Pass.** Update allows only `displayName`/`username`/`usernameLower`/`photoURL`/`lastSeenAt`; create pins `balance == 0`. Balances move only in an Admin-SDK or admin-gated transaction. |
| Player writes own `role` / becomes admin? | **Pass.** Admin identity is `config/app.admins` (admin-write). `users.role` is display metadata the rules never read. |
| Player writes a `ledger` row? | **Pass.** `create: if isAdmin()`; no update or delete for anyone. |
| Player writes `score`/`rank`/`payout`/`charged`/`status` on an entry? | **Pass.** Not in the update key list; pinned at create. |
| Player writes a bout `result`, `odds` or event `status`? | **Pass.** `events/**` is admin-write. |
| Player writes someone else's entry, the `allowlist`, or `config`? | **Pass.** `isOwner(uid)` / `isAdmin()`. |
| Reads others' picks pre-lock, by `get` **or** `list`? | **Pass.** Gated on `entriesRevealed()`; both paths now tested. |
| A non-invited account reads anything? | **Was FAIL — fixed (1).** |
| An entry written after `lockAt`? | **Pass.** `request.time < ev.lockAt` is server time, and `status == 'open'` too. Merge-sets and mixed batches are authorised per write; both now tested. |
| Ledger rows double-posted by a job re-run or a double-tap? | **Pass.** `buyin`/`payout`/`refund`/starting-`grant` carry deterministic ids, so a second pass no-ops inside the transaction; token approval re-reads `status == 'pending'`. Ad-hoc `grant`/`adjust` keep random ids by design (DECISIONS 2026-09-29) — see risks. |
| Pot conservation; any path that mints tokens? | **Pass.** `sum(payouts) == pot` is property-tested for n = 1..20 with random ties. Tokens enter only via an admin `grant`/`adjust` or a `payout`/`refund` against a charged pot. |
| Secrets in the repo or its history? | **Pass.** Only the Firebase *web* config (public by design) and placeholder env keys. No service account ever committed; `.gitignore` covers `.env*`, `*service-account*.json` and now emulator exports. |
| Workflow permissions least-privilege? | **Was FAIL — fixed (4).** |
| XSS? | **Pass.** No `dangerouslySetInnerHTML`, `innerHTML` or `eval` in `src/`, `shared/`, `jobs/`; user text renders through React. CSP added (5). |
| Firestore quota? | **Pass.** ~5–6K reads a fight night against 50K/day. |

## Fixes made

1. **Reads require membership, not a sign-in** (`firestore.rules`). The repo and web config are
   public and `LoginPage` offers email/password signup, so `signedIn()` let anyone register and read
   all 12 players' emails, balances, standings and post-lock picks. New `isMember()` = "has a
   `users/{uid}` profile", which `userCreateOk` only grants an allowlisted email. `config/app` and
   `usernames` also accept an un-onboarded invitee (`invitedOrMember()`), which onboarding needs.
   Own-doc reads of `users/{uid}` and `allowlist/{email}` stay open to the owner — a *non-existent*
   read there is how the session resolves `needsProfile` / `notInvited`.
2. **Username hijack closed.** The update rule checked `usernameLower == username.lower()` but not
   who owns the name, so a player could rename onto another player's (or the admin's) username. A
   rename now needs `getAfter(usernames/<new>).uid == uid`; `usernames` is never updatable in place,
   so a taken name can't be claimed.
3. **Fields are bounded.** `displayName` (1..40) and `username` (1..20) were validated at create but
   not on update — a player could write a megabyte or an empty name. An entry's
   `displayName`/`photoURL` must now equal the author's profile, so the leaderboard can't display
   someone else's name. `tokenRequests.note` capped at 280, those `displayName`s at 40; comments and
   token requests now require membership.
4. **Workflows.** All three declare `permissions: contents: read` (they had none).
   `FIREBASE_SERVICE_ACCOUNT` — an Admin SDK key that bypasses these rules entirely — moved from
   workflow `env` to the three steps that use it, so `npm ci` and its install scripts never see it.
   `deploy.yml` now requires the triggering CI run to come from this repo (`branches: [main]` matches
   a *fork's* branch named `main` too) and checks out `head_sha`, deploying exactly what CI verified.
5. **CSP + headers** (`firebase.json`, every path): `default-src 'self'`, `script-src 'self'
   https://apis.google.com` (the build emits no inline script; `apis.google.com` is Firebase's
   `signInWithPopup` helper iframe — found missing in a real post-deploy Google sign-in attempt on
   2026-10-01, which blocked the popup for every user, not just the one testing it), `object-src
   'none'`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS, and
   `Cross-Origin-Opener-Policy: same-origin-allow-popups` (plain `same-origin` breaks
   `signInWithPopup`). `connect-src` names the Firebase APIs plus `localhost`/`127.0.0.1`, which the
   emulator-served e2e build needs.
6. **Token approval re-reads its own amount.** `approveInTx` took `uid`/`amount` from the admin
   screen's snapshot; it now checks both against the request as the transaction reads it.

## Accepted risks

- **An admin is fully trusted with money.** `grant`/`adjust` have no cap or second signature, and
  rules don't verify `balanceAfter`. A double-tap on *Grant tokens* posts two rows (the button
  disables while posting; a deterministic id was rejected in DECISIONS 2026-09-29 so a deliberate
  repeat grant isn't silently swallowed). The append-only ledger makes every movement attributable
  and reversible by `adjust`.
- **Membership survives a revoked invite.** `isMember()` keys off the profile, and `users` delete is
  denied to everyone. Removing an `allowlist` row doesn't cut reads; deleting `users/{uid}` with the
  Admin SDK does.
- **No rate limits.** Rules can't count, so a player can spam `tokenRequests` or comments.
- **Membership costs one `exists()` (a billed read) per request.** Custom claims would be free but
  need a job to set them and a token refresh to land. Revisit only if quota bites.
- **An admin moving a `final` event back to `live`** re-folds standings, h2h and `users.stats` next
  lifecycle run. Pre-existing, in the PROGRESS backlog — don't do it.

## Verify after deploying

1. Sign in with **Google** once and watch the console: the e2e suite only covers email/password, so
   the popup flow is the one path this CSP hasn't been run against.
2. Check a headshot (`a.espncdn.com`) and a Google avatar (`lh3.googleusercontent.com`) render.
3. Sign up a throwaway account on a non-invited email — it must land on "not invited" with no data.
