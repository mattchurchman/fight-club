# Model tiers

Tasks are labeled with a tier so you can match the model's cost to the difficulty. The labels are vendor-neutral:
fill in the right-hand column with the models you actually use, and update it as vendors release new ones.

| Tier | Use it for | Traits needed | Your model(s) — edit me |
|---|---|---|---|
| **A** | Specs turned into correctness-critical code: security rules, scoring/payout engine, lifecycle jobs, data-source investigation, final security review | Deep reasoning, careful edge-case handling, reads specs precisely | e.g. your vendor's top reasoning model (flagship / "opus" / "pro" class) |
| **B** | Most feature work: React screens, integrations, jobs with a clear spec, tests | Strong everyday coder, good with frameworks | e.g. the vendor's mid/general model ("sonnet" / standard class) |
| **C** | Boilerplate, config, CI workflows, simple CRUD screens, copy tweaks | Fast and cheap, follows explicit steps | e.g. the vendor's small/fast model ("haiku" / "mini" / "flash" class) |

Rules of thumb
- A higher tier always works. It just costs more. A lower tier than the one listed is at your own risk.
- If a Tier C or B agent fails the Definition of Done twice, rerun the task on the next tier up.
- Always **clear the context / start a new session** between tasks. The docs carry all the memory that's needed.

Kickoff message (paste this at the start of every session):
```
Run the next task. Model tier: <A|B|C>
```
