# Model tiers & effort

Tasks are labeled with a **tier** (which model) and, from T26 on, an **effort** (how hard the model should think).
Matching both to the task is how we keep cost down: most UI tasks don't need the strongest model at max effort.
Labels are vendor-neutral; fill in the right-hand column with what you actually use.

| Tier | Use it for | Traits needed | Your model(s) — edit me |
|---|---|---|---|
| **A** | Correctness-critical code: security rules, scoring/payout engine, lifecycle jobs, data-source investigation, security review | Deep reasoning, careful edge cases, reads specs precisely | Claude Opus (or your vendor's flagship) |
| **B** | Most feature work: React screens, integrations, jobs with a clear spec, tests | Strong everyday coder, good with frameworks | Claude Sonnet (or the vendor's standard model) |
| **C** | Boilerplate, config, token/class sweeps, copy tweaks, simple CRUD screens | Fast and cheap, follows explicit steps | Claude Haiku (or the vendor's small/fast model) |

| Effort | Use it when | Claude Code / API setting |
|---|---|---|
| **low** | Mechanical edits with an exact spec (find/replace maps, config, copy) | effort `low` (or thinking off) |
| **medium** | Normal feature work with a clear spec | effort `medium` (default) |
| **high** | New logic with tests, tricky state, anything a wrong answer would show players | effort `high` |

Rules of thumb
- A higher tier or effort always works; it just costs more. Lower than listed is at your own risk.
- If a Tier C or B agent fails the Definition of Done twice, rerun the task one tier up (same effort).
- **Always clear the context / start a new session between tasks**, even when the next task uses the same model.
  The docs carry all the memory that's needed; a stale context is the most expensive thing in this project.
- Tasks are grouped into **runs** (see PROGRESS.md). Inside a run the tier rarely changes, so between tasks you
  usually only clear the context (and sometimes change effort).

Kickoff message (paste this at the start of every session):
```
Run the next task. Model tier: <A|B|C>. Effort: <low|medium|high>
```
