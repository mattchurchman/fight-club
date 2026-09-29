# T20 — Security & launch review

**Tier:** A · **Size:** M · **Depends on:** T19 (and ideally every MVP task)
**USER ACTION REQUIRED:** at the end: `npm run deploy:rules`, push to main, and invite the first friends (SETUP §S8).

## Goal
An independent, skeptical review of the trust boundary and money-like flows before friends join. Fix what's small and list the rest.
Review as if a clever friend wants to give themselves free tokens or peek at picks early.

## Context to load (only these)
- `AGENTS.md`
- `docs/DATA_MODEL.md`, `docs/GAME_RULES.md` → sections 2, 6
- `firestore.rules`, `tests/rules/**` (by search, not whole-file reads if large)
- `shared/ledger-plan.ts`, `shared/lifecycle/index.ts`, `src/features/admin/postLedger.ts`

## Files you may touch
`firestore.rules`, `tests/rules/**`, `docs/SECURITY_REVIEW.md` (new), small fixes (≤30 lines each) in `shared/**`, `jobs/**`, `src/**`

## Steps
1. Threat checklist and verdict for each:
   - Can a player write any of: balance, role, ledger, scores, rank, payout, results, odds, event status, other people's entries, allowlist, config?
   - Can a player read others' picks before lock (list queries included)? Can a non-invited account read anything?
   - Can an entry be created or changed after `lockAt` (clock skew, batched writes, `set` with merge)?
   - Can ledger rows be double-posted by re-running jobs or double-tapping admin buttons?
   - Pot conservation, and no path that mints tokens except `grant`/`adjust` by an admin.
   - Secrets: grep the git history for keys and service accounts. Check `.gitignore`. Check the GitHub workflow permissions (`permissions:` least privilege).
   - XSS: no `dangerouslySetInnerHTML`, and user text is escaped. Look at the CSP headers in `firebase.json`; add a reasonable CSP if feasible.
   - Quotas: estimate Firestore reads per fight night for 12 users with live listeners, against the 50K/day limit.
2. Add rules tests for any gap found. Fix it.
3. Write `docs/SECURITY_REVIEW.md` (≤80 lines): the checklist with pass/fail, the fixes made, and the accepted risks.

## Acceptance criteria
- [ ] Every checklist item has a verdict. There are no open "fail" items without an accepted-risk note the user agreed to.
- [ ] `npm run test:rules` and the Definition of Done pass

## Out of scope
New features.

## Completion notes
_(agent fills in)_
