# Decision log

Append-only. Format: `## YYYY-MM-DD — <title> (Txx or "planning")`, then 2–5 lines covering the context, the decision and its consequences.

## 2026-09-29 — Stack: Firebase Spark + GitHub Actions (planning)
The owner won't enter a credit card and already knows Firebase. Spark has Auth, Firestore, Hosting and FCM but not Functions or Storage,
so server work runs as Node scripts in GitHub Actions using the Admin SDK. Headshots are hotlinked, not stored.

## 2026-09-29 — Rebuild rather than refactor (planning)
The legacy app (Express + Postgres, hand-built cards) had cross-event score corruption, admin checks done only in the browser,
and a reset-token leak. A clean rebuild is cheaper than a refactor. We start fresh with no data migration.

## 2026-09-29 — Game changes vs v1 (planning)
Confidence ranking is replaced by a Lock of the Night (drag-and-drop was broken on iOS, and stake already signals confidence).
Method odds are replaced by fixed multipliers (no free data source). The economy is a buy-in pot with an admin-granted token wallet.
First Blood stays as an optional manual prop.

## 2026-09-29 — Auth methods (planning)
Google + email/password, gated by an admin-managed allowlist. We don't use email-link sign-in (Spark caps it at 5 emails/day).

## 2026-09-29 — Odds come from ESPN, not The Odds API (T02)
T02 found `core/events/{id}/competitions/{id}/odds`: DraftKings moneylines keyed by **athlete id**, no key, no
quota (`docs/DATA_SOURCES.md` §6; 14/14 bouts priced 4 days before UFC 332). That removes the 500-credit/month
budget *and* the fighter-name matching `shared/names.ts` existed for. Decided: ESPN is the primary odds source;
The Odds API is demoted to an unverified documented fallback. **Needs the owner's OK** because it changes T08's
scope and `DATA_MODEL.md`: `bouts.odds.source` must gain `'espn'` (proposed: `'espn'|'oddsapi'|'manual'|'default'`).
Name matching is still worth keeping for manual admin entry, but no longer blocks the odds pipeline.

## 2026-09-29 — Event `kind` needs a third value (T02)
The UFC calendar carries cards that are neither numbered nor Fight Night: `Noche UFC: Silva vs. Delgado` and
`UFC Freedom 250: Topuria vs. Gaethje` (a special PPV whose "250" is not a UFC sequence number, so the numbered
regex must match `shortName`, not `name`). Dana White's Contender Series is also on the same calendar and is
excluded from import outright. **Proposal for the owner:** add `kind: 'special'` to `DATA_MODEL.md` and treat it
like `fightnight` for scoring but never auto-enable it. Until that's approved, T07 ingests these as
`kind: 'fightnight'`, `number: null`, `enabled: false`. `DATA_MODEL.md` is unchanged.
