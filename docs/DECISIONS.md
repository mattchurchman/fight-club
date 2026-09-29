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
