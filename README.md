# Fight Club v2

A private, invite-only UFC pick'em for one group of friends. Tap your winners, spread 1,000 points, name your
Lock of the Night, and brag. Events, fighters, headshots, odds and results import automatically. There's a token wallet the
admin controls. It installs to your phone's home screen. It runs entirely on free tiers, with no credit card.

- What we're building: `docs/PRODUCT.md`
- How it works: `docs/ARCHITECTURE.md`
- Where we are: `docs/PROGRESS.md`

## Building it with AI coding agents

The work is split into 25 tasks (`docs/tasks/`). Each one is sized for **one fresh context window** and labeled with a
**model tier** (A strongest, C cheapest; see `docs/MODEL_TIERS.md`). Agents follow `AGENTS.md`.

**The loop, once per task:**

1. Start a **new session** (or clear the context) in your agent tool, in this folder.
2. Select a model of the tier the previous agent told you (T01 is **Tier B**).
3. Send: `Run the next task. Model tier: B` (use the tier letter you're actually on).
4. Answer any questions and do any 👤 steps it lists (`docs/SETUP.md`).
5. When it prints "✅ Txx complete", review the diff, push if you're happy, and go back to step 1 with the tier it names.

Tips: if an agent fails the checks twice, rerun the task one tier up. If a task feels too big, ask the agent to split it
and add rows to PROGRESS.md. Don't run two tasks in one session.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — typecheck and build for production
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint
- `npm run format` — format the repo with Prettier
- `npm run typecheck` — typecheck all projects (app, node, shared, jobs)
- `npm test` — run the test suite once
- `npm run test:watch` — run the test suite in watch mode
- `npm run test:rules` — run Firestore rules tests (placeholder until T06)
- `npm run emulators` — start the Firebase Emulator Suite (Auth, Firestore, Hosting + UI at http://127.0.0.1:4000),
  importing/exporting state to `.emulator-data/`
- `npm run seed` — seed the running emulators with a test event and accounts (below). Run this in a second
  terminal after `npm run emulators` is up.
- `npm run deploy:rules` — deploy `firestore.rules` and `firestore.indexes.json` to the real project
- `npm run job -- <path>` — run a job script with `tsx`, loading `.env.local` if present
- `npm run jobs:hello` — run the sample `jobs/hello.ts` script

## Deploy & jobs

**Push to `main`** triggers CI, which runs lint, typecheck, tests, build. If it passes, the app deploys to
Firebase Hosting automatically.

**Jobs** (ingest, odds, lifecycle) run on a schedule in GitHub Actions. You can also run them manually:
1. GitHub repo → **Actions** → **Jobs** → **Run workflow**
2. Select which job(s): `ingest`, `odds`, `lifecycle`, or `all`
3. Check the logs at **Actions** → **Jobs** → the run

You can run jobs from the GitHub mobile app too.

For local job runs, see `npm run job` above.

## Emulator test accounts

`npm run seed` creates these Auth + Firestore accounts (password `password123` for all). Later tasks
(auth UI, admin console, etc.) rely on these exact emails:

| Email            | Role   | Starting balance |
| ---------------- | ------ | ---------------- |
| `admin@test.dev` | admin  | 500              |
| `p1@test.dev`    | player | 500              |
| `p2@test.dev`    | player | 500              |
| `p3@test.dev`    | player | 500              |

It also creates one `open` event (UFC 332, from `fixtures/`) with 5 main-card bouts and `lockAt` two days
out, so pick submission can be exercised locally once T14 exists.
