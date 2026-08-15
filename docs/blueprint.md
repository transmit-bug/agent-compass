# Category Blueprint — the architecture pattern for heavy skill groups

The pattern a group with real machinery instantiates: how skills are **layered** (who invokes
whom), how detail is **disclosed** (thin entries, on-demand references), what **workflow rules**
bind sessions, and how **state carries across sessions**. It is the pattern only — catalog
governance (labels, hashes, marketplace groups, vendoring) stays in `AGENTS.md`; per-group
routing stays in each group's `README.md`; per-repo configuration stays in `docs/agents/*`.

Derived from ADR-0001 (two-layer architecture), ADR-0002 (web-app lifecycle model), and
research into mattpocock/skills cross-session continuation (`docs/research/*` on the
`research/*` branches). Agent-compass does not imitate that catalog's governance or ceremony;
what transfers is the pattern below.

## 1. Invocation model

One axis: **who invokes a skill**.

- **User-invoked** (`disable-model-invocation: true`, zero context load) — reachable only by
  name; orchestrates.
- **Model-invoked** (default) — reachable automatically when the task fits; holds the reusable
  discipline.

Rules:

- A user-invoked skill may invoke model-invoked skills; it never invokes another user-invoked
  one.
- Dependencies are **prose invocation** ("run the X skill"), never deep cross-folder file
  links. A primitive owns its discipline and its references; orchestrators say "run it".
- Composition with the operation layer (ADR-0001): *who reaches the skill* (invocation axis)
  is orthogonal to *where machinery lives* (operation layer: scripts, CLI, daemon). Business
  skills decide what and when; the operation layer decides how; a model-invoked primitive sits
  in between when a group's shared discipline is worth owning once.

## 2. Progressive disclosure

- **SKILL.md = frontmatter + process only.** The entry is thin: the invocation contract (name,
  description, flags) and the workflow prose. Nothing else.
- Detail goes in **companion `.md` reference files** in the same folder, pulled by relative
  link at the point of use — read only when the flow reaches them.
- **scripts/ hold only deterministic artifacts** — templates, configs, computation. Judgment
  stays with the agent.
- The operation layer is the reference for its own surface: never hardcode command details in
  skills; load them from the CLI/daemon.

## 3. Workflow rules (numbers stripped)

These are policies, deliberately without token figures — budgets are model-dependent and the
figures drift. The *rules* are portable; the numbers are not.

- **One-window rule**: decisions that build on each other (grill → spec → tickets, or any
  equivalent chain) run in **one unbroken context window**; the artifacts are written from live
  context, so a later session never needs the dead conversation.
- **Phase-boundary tree**: at a boundary only, in order — **Continue** / **/clear** /
  **/handoff** / **subagent** / **/compact**. Compact is the default, not the first reach;
  every move except Continue turns a primary source into a secondary one. Never decide context
  mid-phase.
- **One artifact = one session**: size work so a fresh session loads exactly one artifact and
  writes one deliverable back — continuation is a 1:1 contract, not a search.
- **Anti-rot**: one decision lives in exactly one place (gist and link, never restate); durable
  artifacts hold decisions, not file paths or code snippets that decay; never re-ask a
  resolved question.

## 4. State-carrier pattern

For groups that manage persistent state (abstracted from ADR-0002):

- **Facts-only records**: persist only records — what was done, results — in a deterministic
  format (JSON). Derived views are computed, never stored.
- **Orient-first artifact**: one derived artifact (rendered from the records) is what a fresh
  session reads first. It carries current status, next actions, and gists of recent outcomes.
- **Read-and-act continuation**: a fresh session reads the orient artifact, derives the next
  item, and acts — no handoff ceremony files. Durable human-facing docs live in the
  consumer's own `docs/` and are linked from the orient artifact.
- **Intent in the tracker**: durable intent (what to do next) lives in the consumer's own
  issue tracker; records carry optional tracker refs, and next actions are derived from open
  tickets plus state.

## 5. Glossary

| Term | Meaning |
|---|---|
| **Business skill** | A user-facing workflow skill built on an operation layer; decides *what* and *when*. |
| **Orchestrator** | A business skill that drives primitives by prose invocation. Every business skill is an orchestrator when it invokes a primitive. |
| **Primitive** | A model-invoked shared discipline; owns its discipline and references; invoked by orchestrators by prose. |
| **Router / entry skill** | The deriving entry: model-invoked, routes by reading the group's README + SKILL.md frontmatter at runtime — cannot drift, no hand-maintained gloss. |
| **Operation layer** | The machinery a group's business skills are built on (scripts, CLI, daemon); depends on nothing within the category. |
| **User-invoked / model-invoked** | The invocation axis, expressed by frontmatter flags. |
| **Record / derived view** | A stored fact vs status rendered from records. |
| **Orient doc** | The derived artifact a fresh session reads first. |

## 6. Instantiating a group — checklist

Adopting the blueprint is answering six questions, in order:

1. **Surface** — list the user-invoked business skills and the operation layer they lean on.
2. **Primitives** — which shared disciplines deserve a model-invoked primitive (a
   grilling-analogue per group)? Anything re-stated across skills is a candidate.
3. **Entry** — is the surface big enough that routing is a genuine question? If yes, add a
   deriving entry skill (model-invoked; reads README + frontmatter).
4. **State** — does the group manage persistent state? If yes, apply the state-carrier
   pattern: records format, orient artifact, continuation rules, tracker split.
5. **Disclosure** — thin each SKILL.md; move detail to references; keep scripts deterministic.
6. **Rules** — state the workflow rules in the skills that own the behavior; keep figures out.

**Worked reference**: the agent-browser lifecycle model (ADR-0002) — per-feature arc
spec→dev→check→fix→smoke→maintain, facts-only index, orient doc (`index.md`),
direction-and-review autonomy. That group is the first instantiation of this blueprint.

## 7. Exclusions — what this pattern is not

- Catalog governance (labels, hashes, marketplace groups, vendoring) — that is `AGENTS.md`.
- Per-skill docs pages / publishing layers — agent-compass uses one CONTEXT.md + README index.
- Literal token figures — policies, not numbers.
- Dual-harness metadata (`agents/openai.yaml`) — only load-bearing if a second harness
  consumes it.
- Handoff ceremony files — the orient artifact replaces them.
- **Exception**: the `frontend` group ships model-invoked by design (its value is automatic
  reach); the pattern's default is user-invoked business skills.
