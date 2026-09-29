# AGENTS.md — Operating manual for coding agents

This file is written for any AI coding agent (any vendor, any tool). Read it fully at the
start of every session. It is intentionally short. Everything else is loaded on demand.

Project: **Fight Club v2**, a private, invite-only UFC pick'em web app (PWA) for one group of friends.
Stack: Vite + React + TypeScript SPA, Firebase (Auth, Firestore, Hosting, FCM) on the free
**Spark** plan, scheduled jobs on **GitHub Actions**. See `docs/ARCHITECTURE.md` only if your task lists it.

---

## 1. Session protocol (follow exactly)

**One task per session. Never start a second task in the same context window.**

1. Read `docs/PROGRESS.md`. Your task is the one the user names, or else the **first row with
   status `todo` whose dependencies are all `done`**.
2. Open **only** that task file: `docs/tasks/Txx-*.md`.
3. **Model-tier check.** Each task declares a required tier (A, B or C, where A is the strongest). See `docs/MODEL_TIERS.md`.
   - If the user's kickoff message states a tier **≥ required**, continue. If it is higher than required,
     mention in one line that a cheaper tier would do, then continue.
   - If the user stated a **lower** tier, or stated none, **stop** and say:
     `This task (Txx) is designed for a Tier <X> model. Please switch to a Tier <X> model, clear the context, and send: "Run the next task. Model tier: <X>". Reply "continue" to proceed on the current model anyway.`
4. If the task has **USER ACTION REQUIRED** items that are not yet confirmed done, list them
   (copy the exact steps) and wait for the user to confirm before doing dependent work.
5. Set the task row to `in-progress` in `docs/PROGRESS.md`.
6. Load **only** the files under "Context to load". Use search (grep/glob) to find symbols instead
   of reading whole directories. If you're truly blocked, read the single relevant *section* of another doc.
7. Implement. Only touch files under "Files you may touch". If you see other needed work,
   write it as a follow-up in your handoff. Do not do it.
8. Run the Definition of Done (section 4). Fix until green.
9. Fill in the task file's **Completion notes** (≤10 lines: what was built, anything surprising,
   follow-ups). Update the `docs/PROGRESS.md` row: `done`, date, short commit hash.
   If you deviated from a spec, append a dated entry to `docs/DECISIONS.md`.
10. Commit with message `Txx: <summary>`. Push only if the user said pushing is OK.
11. End the session with this message (fill in the brackets):

```
✅ Txx complete: <one-line summary>
Next up: Tyy — <title> — requires a Tier <X> model.
<If Tyy has USER ACTION REQUIRED: list those steps here>
Before continuing:
  1. Switch your model to a Tier <X> model (see docs/MODEL_TIERS.md).
  2. Clear the context or start a new session.
  3. Send: "Run the next task. Model tier: <X>"
```

**If blocked** (a spec is ambiguous, an external API differs from docs, or a check fails for reasons outside
the task): don't guess on anything in `GAME_RULES.md` or `DATA_MODEL.md`. Add a `BLOCKED: <reason>`
note to the PROGRESS row, ask the user one precise question, and stop.

---

## 2. Hard rules

- **$0, no credit card.** Never use Cloud Functions, Cloud Storage, App Hosting, or anything that requires
  the Firebase Blaze plan or any paid service. Server-side work runs in `jobs/` via GitHub Actions.
- **Never commit secrets.** `.env*`, `service-account*.json`, and API keys go in `.gitignore`. Use
  `.env.example` with placeholder values. Firebase *web* config is public and may be committed.
- **Specs are contracts.** `docs/GAME_RULES.md` and `docs/DATA_MODEL.md` change only when a task
  explicitly says so, or when the user approves. Log the change in `docs/DECISIONS.md`.
- **Single source of truth for logic.** Scoring, payouts, odds math and validation live in `shared/` as pure
  functions. The web app and the jobs import them. Never duplicate that logic.
- **Trust boundary.** Players' browsers never write balances, ledger rows, scores, results or event status.
  Only admin-gated paths (enforced in `firestore.rules`) and `jobs/` (Admin SDK) do.
- **Approved dependencies only** (section 5). To add another, ask the user and log it in DECISIONS.md.
- TypeScript `strict`. Don't use `any` unless you add a comment explaining why.
- Never use `dangerouslySetInnerHTML`; render user text through React.
- Mobile-first. Every screen must work at 375px wide with 44px tap targets.
- Keep diffs focused. No drive-by refactors, renames or reformatting outside your files.
- Don't read or copy from the legacy repo (`mattchurchman/fight_club`). What we need from it is already in `docs/`.

## 3. Token-efficiency rules

- Don't echo file contents back to the user. Don't re-read a file you just wrote.
- Prefer targeted search over opening files. Open large files by line range.
- Tests use `fixtures/` and never hit live APIs. Only jobs run with `--live` touch the network.
- Summarize failing output (test names and first error line). Don't paste full logs.
- Keep completion notes ≤10 lines and the final message to the template above.

## 4. Definition of Done (every task)

```
npm run lint && npm run typecheck && npm test
```
Also run these when relevant: `npm run test:rules` (anything touching `firestore.rules` or data shape),
`npm run build` (anything touching `src/`), and the task-specific checks in the task file.
Before T01 exists, the task file defines its own checks.

## 5. Approved dependencies

Runtime: `react`, `react-dom`, `react-router-dom`, `firebase`, `clsx`, `date-fns`, `html-to-image` (T22 only).
Dev/tooling: `typescript`, `vite`, `@vitejs/plugin-react`, `vite-plugin-pwa`, `@vite-pwa/assets-generator`,
`tailwindcss` (+ its official Vite plugin), `vitest`, `@testing-library/react`, `@testing-library/jest-dom`,
`jsdom`, `eslint` (+ `typescript-eslint`, `eslint-plugin-react-hooks`), `prettier`, `firebase-tools`,
`@firebase/rules-unit-testing`, `firebase-admin` (jobs only), `tsx`, `@playwright/test` (T19 only),
`@fontsource/*` fonts.

## 6. Repo map (target)

```
shared/            pure TS: types, scoring, payouts, odds, validation, name matching
src/               web app (features/*, components/ui/*, lib/firebase.ts)
jobs/              Node scripts run by GitHub Actions (ingest, odds, lifecycle, notify)
fixtures/          captured API responses used by tests
tests/rules/       Firestore rules tests (emulator)
.github/workflows/ ci.yml, jobs.yml, deploy.yml
docs/              specs, tasks, progress
```
