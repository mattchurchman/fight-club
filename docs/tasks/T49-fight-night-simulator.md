# T49 — Fight-night simulator (`npm run sim`)

**Tier:** B · **Effort:** high · **Size:** M · **Depends on:** —
**USER ACTION REQUIRED:** to watch it on a phone: run `npm run emulators`, `npm run dev -- --host`, then `npm run sim`,
and open the printed LAN URL on a phone on the same Wi-Fi. Sign in as `p1@test.dev` / `password123`.

## Goal
Rehearse a whole fight night locally — lock, each result, payout — through the real lifecycle code, so the owner can
see the app during and after an event before a real one. Never touches production.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Simulator"
- `jobs/seed-emulator.ts` (how users/events are seeded), `e2e/runJob.ts`, `e2e/resultFixtures.ts`,
  `e2e/happy-path.spec.ts` lines 95–130 (how the e2e drives lock → results → finalize with `--now`)
- `jobs/lifecycle.ts` lines 1–20 (usage) and its `parseArgs`

## Files you may touch
`jobs/simulate-night.ts` (new), `jobs/lib/sim-script.ts` (new) + test, `package.json` (one `sim` script), `docs/SETUP.md`
(add a "Rehearse a fight night" section)

## Steps
1. Refuse to run unless `FIRESTORE_EMULATOR_HOST` and `FIREBASE_AUTH_EMULATOR_HOST` are set (copy seed-emulator's guard).
   Script: `"sim": "<same emulator env as the seed script> npm run job -- jobs/simulate-night.ts"`.
2. **Setup** (idempotent, `--reset` wipes the sim's own docs first): ensure the 4 seed users exist (run the seed if
   `config/app` is missing), add 3 more friends (`p4…p6@test.dev`) the same way, and create event `evt_sim` from
   `fixtures/espn/scoreboard-upcoming.json` (5 main-card bouts, `status: 'open'`, `lockAt` = now + 2 min, odds set,
   `firstBloodEnabled: true`). Give every friend except `p1` a valid entry (fixed picks in `sim-script.ts`; each sums to
   the budget, one lock, a first-blood pick). Leave `p1` without picks so the owner makes their own in the app.
3. **Script** (`sim-script.ts`, pure, tested): the ordered steps — `lock`, then one `result` per bout in fight order
   (main event last; include at least one underdog win and one decision), then `finalize`. Each result has winner,
   method, round, time and `firstBlood`.
4. **Run loop:** print the next step, wait for Enter (or `--auto <seconds>`). Every lifecycle call passes
   `--live --event evt_sim --fixture <no-results fixture>` (build it the way `writeNoResultsFixture` in
   `e2e/resultFixtures.ts` does) so the job **never fetches ESPN**; manual results are what drive the night.
   `lock` → lifecycle with `--now <lockAt + 1s>` (if `p1` still has no entry, say so and continue).
   `result` → write the bout's `result` (`source: 'manual'`, with `firstBlood` set) and `status: 'final'`, set the next
   bout `status: 'live'`, then lifecycle with `--now <now>`. `finalize` → lifecycle with `--now <now>`; because every
   result carries `firstBlood`, finalize isn't held by the 12h first-blood grace (`shared/lifecycle/finalize.ts`).
   Run lifecycle the same way as `e2e/runJob.ts` (`execFileSync('npx', ['tsx', 'jobs/lifecycle.ts', …])`).
5. After each step print a one-line summary (e.g. `Result 3/5: Green def. Ribovics — SUB R1 · leader: Tony 1,537`).
6. SETUP.md: the 4 commands from USER ACTION, what you'll see, and `npm run sim -- --reset` to start over.

## Acceptance criteria
- [ ] Definition of Done passes; `sim-script.ts` test checks fight order, entry budgets and that every step is valid.
- [ ] Against the emulators: a full `npm run sim -- --auto 1` ends with the event `final`, payouts in the ledger, and
      standings updated; running it again with `--reset` works.
- [ ] Without emulator env vars the script exits with the refusal message and touches nothing.

## Out of scope
UI changes. Any production data. Changing lifecycle logic (if something can't be driven, log it and stop: lifecycle
changes need Tier A).

## Completion notes
_(agent fills in: ≤10 lines, ending with `git diff --stat`)_
