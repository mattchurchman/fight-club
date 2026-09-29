# T10 — GitHub Actions: CI, scheduled jobs, hosting deploy

**Tier:** C · **Size:** S · **Depends on:** T06, T07, T08, T09
**USER ACTION REQUIRED:** SETUP.md §S6 (add the GitHub secrets). If deploy auth fails, the user runs `npx firebase init hosting:github`
(answer: don't overwrite workflows; this only creates the deploy secret).

## Goal
Every push is checked. Jobs run on the schedule in ARCHITECTURE.md and can be triggered by hand. `main` deploys to Firebase Hosting.

## Context to load (only these)
- `AGENTS.md`
- `docs/ARCHITECTURE.md` → "Schedules" and "Environments"
- `package.json` (scripts)

## Files you may touch
`.github/workflows/ci.yml`, `.github/workflows/jobs.yml`, `.github/workflows/deploy.yml`, `README.md` (a "Deploy & jobs" section)

## Steps
1. `ci.yml` (push and PR): checkout, setup-node 22 with npm cache, setup-java 17, `npm ci`, lint, typecheck, test, test:rules, build.
2. `jobs.yml`:
   - Triggers: the `schedule` crons from ARCHITECTURE.md, plus `workflow_dispatch` with a `job` choice input (`ingest|odds|lifecycle|all`).
   - One job with a small bash step that decides which scripts to run from `github.event.schedule` / the input.
   - Env: `FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_PROJECT_ID`, `ODDS_API_KEY` from secrets. Always pass `--live`.
   - `concurrency: jobs` (never overlap), `timeout-minutes: 10`, npm cache.
3. `deploy.yml`: on push to `main` (after CI succeeds, via `workflow_run` or `needs`), build, then deploy hosting with
   `FirebaseExtended/action-hosting-deploy` (channel `live`), using the deploy secret. Firestore rules are **not** deployed from CI.
4. README: how to run a job manually from GitHub (and the GitHub mobile app), and where to see the logs.

## Acceptance criteria
- [ ] `actionlint` (run it via `npx`/docker if available, otherwise carefully self-review the YAML) is clean
- [ ] After the user pushes: CI is green, and a manual run of `jobs.yml` with `ingest` succeeds (ask the user to confirm)
- [ ] Definition of Done passes

## Out of scope
Changes to job logic.

## Completion notes
_(agent fills in)_
