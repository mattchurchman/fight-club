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
_(T01 fills this in.)_
