# Architecture

## Constraints
- **$0 and no credit card.** Firebase Spark plan + GitHub free tier + The Odds API free key.
- Spark includes Auth, Firestore (1 GiB, 50K reads/day, 20K writes/day), Hosting (10 GB, 360 MB/day), FCM.
  Spark does **not** include Cloud Functions or Cloud Storage, so we use neither.
- Auth: **Google sign-in + email/password.** Email-link sign-in is capped at 5 emails/day on Spark, so we don't use it.

## Shape
```
                 ┌───────────────────────────── GitHub Actions (cron + manual) ─────────────┐
 ESPN (unofficial) ──► jobs/ingest-events.ts ─┐                                              │
 The Odds API     ──► jobs/ingest-odds.ts  ───┼─► Firestore (Admin SDK, bypasses rules)     │
                      jobs/lifecycle.ts ──────┘   lock → results → score → finalize → payout │
                      jobs/notify.ts ─────────────► FCM push                                 │
                 └────────────────────────────────────────────────────────────────────────────┘
 Browser (PWA, React) ◄──► Firestore (security rules) ; Firebase Auth ; Firebase Hosting
 shared/ (pure TS: scoring, payouts, validation) is imported by BOTH web and jobs.
```

## Why this works without servers
- **Pick locking** is enforced by security rules (`request.time < event.lockAt`), so it's exact even though
  jobs run on a coarse schedule.
- **Money-like writes** (balances, ledger, scores, payouts) come only from the Admin SDK in jobs, or from the
  admin user through rules that check `role == 'admin'`. Admin actions reuse `shared/` functions and
  write in a single batched transaction.
- **Images** are hotlinked headshot URLs from the data source (we store the URL only). Fallback is an initials avatar.

## Schedules (GitHub Actions, UTC)
| Workflow | When | Does |
|---|---|---|
| `jobs.yml` → `ingest` | daily 09:17 | import or update upcoming events, bouts, fighters |
| `jobs.yml` → `odds` | daily 15:17 + every 2h on Fri/Sat | refresh moneylines for open events (skips locked) |
| `jobs.yml` → `lifecycle` | every 15 min, Sat 12:00 → Sun 08:59 UTC (covers US, Europe, Abu Dhabi, Australia cards), + every 3 h otherwise (≈600 Actions-minutes/month; private-repo free quota is 2,000) | lock due events, import results, score, finalize |
| `jobs.yml` → any | `workflow_dispatch` | admin can run from the GitHub mobile app ("Run workflow") |
| `ci.yml` | push / PR | lint, typecheck, unit tests, rules tests, build |
| `deploy.yml` | push to `main` after CI | `firebase deploy --only hosting,firestore` |

GitHub cron can run 5–20 min late. That's fine: locking doesn't depend on it, and results arriving a few
minutes late is acceptable. Jobs are **idempotent** and exit fast when there's nothing to do.

## Repo layout
```
shared/  types.ts · odds.ts · scoring.ts · payouts.ts · validation.ts · names.ts · constants.ts (+ *.test.ts)
src/     main.tsx · app/(router, layout, providers) · lib/firebase.ts · components/ui/* ·
         features/{auth,events,picks,live,wallet,admin,standings,profile,share,notifications}/*
jobs/    lib/{admin.ts, espn.ts, oddsApi.ts, log.ts} · ingest-events.ts · ingest-odds.ts · lifecycle.ts · notify.ts
fixtures/ espn/*.json · odds/*.json
tests/rules/*.test.ts
```
Path alias: `@shared/*` → `shared/*`. There's one `package.json` (no monorepo tooling).

## Environments
- **Local:** Firebase Emulator Suite (Auth + Firestore + Hosting). Needs Java 21+ (firebase-tools
  15.x raised its minimum from 11; CI updated 2026-10-02). `npm run emulators`.
- **Prod:** one Firebase project. Web config lives in `src/lib/firebase.config.ts` (public). Job secrets live in GitHub
  Actions secrets: `FIREBASE_SERVICE_ACCOUNT`, `ODDS_API_KEY`, `FIREBASE_PROJECT_ID`.
