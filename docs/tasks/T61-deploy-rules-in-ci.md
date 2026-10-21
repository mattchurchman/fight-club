# T61 — Deploy Firestore rules + indexes in CI, before Hosting

**Tier:** B · **Effort:** medium · **Size:** S · **Depends on:** T60
**USER ACTION REQUIRED:** only if the first deploy after this task fails at the rules step with a permission error
(403 / `PERMISSION_DENIED`):
1. Google Cloud console → **IAM & Admin → IAM**, for the project in `FIREBASE_PROJECT_ID`.
2. Find the service account whose email matches `client_email` in the `FIREBASE_SERVICE_ACCOUNT` JSON → **Edit**.
3. **Add role** `Firebase Rules Admin` and **Add role** `Cloud Datastore Index Admin` → Save.
4. GitHub → Actions → **Deploy** → the failed run → **Re-run failed jobs**.

## Goal
Today `deploy.yml` publishes only Hosting; rules and indexes go out by hand from a laptop (`npm run deploy:rules`).
In M10 that left the T58 `entrants` rules undeployed while the app that writes entrants was about to ship, which would
have rejected every pick submit. Make every deploy publish `firestore.rules` and `firestore.indexes.json` **first**,
then Hosting, so the two can never drift. If the rules step fails, Hosting must not deploy.

## Context to load (only these)
- `AGENTS.md` (always)
- `.github/workflows/deploy.yml`
- `.github/workflows/jobs.yml` lines 25–90 (how `FIREBASE_SERVICE_ACCOUNT` is scoped to steps)
- `firebase.json`
- `package.json` (`scripts` only)
- `docs/SETUP.md` `## S6`

## Files you may touch
`.github/workflows/deploy.yml`, `package.json` (scripts only), `docs/SETUP.md` (`## S6` only), `AGENTS.md`
(one line in §4, see step 4), `docs/tasks/T61-deploy-rules-in-ci.md`, `docs/PROGRESS.md`

## Steps
1. In `deploy.yml`, after `npm run build` and **before** the Hosting action, add a step `Deploy Firestore rules + indexes`:
   - Write the service account to a temp file with no shell interpolation of the secret, for example
     `printf '%s' "$FIREBASE_SERVICE_ACCOUNT" > "$RUNNER_TEMP/sa.json"`, with the secret passed via the step's `env`
     (step-scoped, matching the pattern in `jobs.yml`, never workflow-level).
   - Run `npx firebase deploy --only firestore:rules,firestore:indexes --project "$FIREBASE_PROJECT_ID" --non-interactive --force`
     with `GOOGLE_APPLICATION_CREDENTIALS=$RUNNER_TEMP/sa.json` in that step's env.
     `--force` lets it remove indexes that aren't in the file, keeping the file the single source of truth.
   - Delete the temp file at the end of the step (`if: always()` cleanup step, or `trap` in the same script).
2. Keep the existing `if:` guard on the job (CI success, same repo) unchanged. Steps run in order and stop on the first
   failure, so a failed rules deploy blocks Hosting; leave it that way and don't add `continue-on-error`.
3. `package.json`: keep `deploy:rules` for manual use, but change it to
   `firebase deploy --only firestore:rules,firestore:indexes` so laptop and CI deploy the same thing.
4. `docs/SETUP.md` `## S6`: replace the sentence about deploying rules from the laptop with: rules and indexes deploy
   automatically on every push to `main`, before Hosting; `npm run deploy:rules` remains for emergencies. Include the
   USER ACTION REQUIRED steps above as "If the rules step fails with a permission error". In `AGENTS.md` §4, add
   one line: "Rules and indexes deploy with the app on push to `main`; you don't need to ask the user to deploy them."
5. Check your work without new dependencies: run `npx firebase deploy --help` to confirm the flags exist in the
   installed `firebase-tools`, and re-read `deploy.yml` top to bottom for indentation and step order.

## Acceptance criteria
- [ ] Definition of Done passes (AGENTS.md §4)
- [ ] `deploy.yml`: rules+indexes step runs before the Hosting step; the secret appears only in that step's `env`
      and is never echoed; the temp key file is removed even on failure
- [ ] No workflow-level `env` holds the service account
- [ ] `git diff --stat` touches only the files listed above
- [ ] Completion notes tell the user to watch the next **Deploy** run and, if the rules step fails with 403, follow
      USER ACTION REQUIRED

## Out of scope
Changing the Hosting action, CI, or `jobs.yml`. Splitting the service account into separate deploy/jobs keys.
Investigating the earlier Hosting failure (re-running it is a user step).

## Completion notes
Added a "Deploy Firestore rules + indexes" step to `deploy.yml` between `npm run build` and the
Hosting action, writing the service account to `$RUNNER_TEMP/sa.json` (step-scoped env, no shell
interpolation) and running `firebase deploy --only firestore:rules,firestore:indexes --force
--non-interactive`, with an `if: always()` cleanup step removing the key file. No workflow-level
env added. `deploy:rules` in `package.json` now deploys the same two targets. Updated
`docs/SETUP.md` S6 and added the one-line note to `AGENTS.md` §4. `npx firebase deploy --help`
confirms `--only`, `--force`, `--non-interactive`, `--project` all exist in the installed
firebase-tools. Lint/typecheck/test all green.

```
 .github/workflows/deploy.yml | 12 ++++++++++++
 AGENTS.md                    |  1 +
 docs/SETUP.md                | 10 ++++++++--
 package.json                 |  2 +-
 4 files changed, 21 insertions(+), 2 deletions(-)
```

Watch the next **Deploy** run on GitHub Actions. If the rules step fails with a 403/
`PERMISSION_DENIED`, follow the USER ACTION REQUIRED steps in this task file / `docs/SETUP.md` S6.
