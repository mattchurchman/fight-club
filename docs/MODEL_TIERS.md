# Model tiers & effort

Tasks are labeled with a **tier** (which model) and, from T26 on, an **effort** (how hard the model should think).
Matching both to the task is how we keep cost down: most UI tasks don't need the strongest model at max effort.
Labels are vendor-neutral; the vendor columns are the current picks (Codex: models on the Plus plan as of 2026-10-14). Pick the model by tier and set effort separately.

| Tier | Use it for | Traits needed | Claude (Claude Code) | Codex (OpenAI, Plus plan) |
|---|---|---|---|---|
| **A** | Correctness-critical code: security rules, scoring/payout engine, lifecycle jobs, data-source investigation, security review | Deep reasoning, careful edge cases, reads specs precisely | Opus | GPT-6.0 Astra (limited usage on Plus — save for Tier A) |
| **B** | Most feature work: React screens, integrations, jobs with a clear spec, tests | Strong everyday coder, good with frameworks | Sonnet | GPT-5.6 Sol |
| **C** | Boilerplate, config, token/class sweeps, copy tweaks, simple CRUD screens | Fast and cheap, follows explicit steps | Haiku | GPT-5.6 Terra |

| Effort | Use it when | Claude Code setting | Codex setting (`model_reasoning_effort`) |
|---|---|---|---|
| **low** | Mechanical edits with an exact spec (find/replace maps, config, copy) | effort `low` | `minimal` or `low` |
| **medium** | Normal feature work with a clear spec | effort `medium` (default) | `medium` (default) |
| **high** | New logic with tests, tricky state, anything a wrong answer would show players | effort `high` | `high` |

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
