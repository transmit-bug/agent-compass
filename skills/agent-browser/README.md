# agent-browser — web-app development / testing / maintenance / smoke / logic

Suite of skills for the web-app lifecycle, driven by the **agent-browser** CLI — the
operation layer (external, referenced not vendored). Two model-invoked layers (the
[web-router](./web-router/) entry and the [web-verify](./web-verify/) primitive) plus six
user-invoked business skills.

Usage guide (setup, first session, cross-session continuation):
[docs/agent-browser-usage.md](../../docs/agent-browser-usage.md).

## When to use which

| Need | Skill |
|---|---|
| Which skill fits this web-app ask? | [web-router](./web-router/) — model-invoked entry; routes and points |
| Verification discipline (run model, perception, verdicts, staleness) | [web-verify](./web-verify/) — model-invoked primitive; every mode skill invokes it by prose |
| Implement / develop a feature | [web-dev](./web-dev/) |
| Does the page match expectations | [web-checker](./web-checker/) |
| Fix until it matches a reference | [web-fixer](./web-fixer/) |
| End-to-end core-flow verification | [web-smoke](./web-smoke/) |
| Verify staleness / re-run / tidy | [web-maintain](./web-maintain/) |
| Infer logic, generate cases, run, classify | [web-logic](./web-logic/) |

The lifecycle arc is a map, not a pipeline: each feature arcs spec → dev → check → fix →
smoke → maintain, smoke is the gate. "Where does the app stand" is answered by the **orient
doc** (`.agent-browser/index.md`, derived from records); durable docs live in the app's
`docs/agent-browser/` and are linked from it.

## Layering

```
business (user-invoked)                  primitive (model-invoked)    operation (external)
┌──────────────────────────────┐         ┌───────────────────────┐    ┌───────────────────────┐
│  web-dev      dev loop       │         │  web-verify           │    │  agent-browser CLI    │
│  web-checker  struct verdict │─prose──▶│  run model, ladder,   │──▶│  npm i -g             │
│  web-fixer    fix loop       │ invokes │  verdicts, staleness, │    │  agent-browser        │
│  web-smoke    flow verify    │         │  autonomy gate        │    │  skills get core      │
│  web-maintain staleness/tidy │         └───────────┬───────────┘    └───────────────────────┘
│  web-logic    logic testing  │                     │ shared
└──────────┬───────────────────┘                     ▼
           │  web-router (entry, model-invoked, routes)   scripts/agent-browser-run      (run lifecycle + assess)
           │                                              scripts/agent-browser-stale    (staleness scan + tidy)
           │                                              scripts/agent_browser_common.py (shared renderer)
           │                                              references/session-model.md     (contract, owned by web-verify)
```

Business skills are user-invoked (`disable-model-invocation: true`, zero context load) —
call them by name. web-router and web-verify are model-invoked: the router orients, the
verify discipline is what each mode skill inherits via its one-line invocation. Judgment
stays with the agent, deterministic computation goes into scripts, and command details
always come from `agent-browser skills get core` — the CLI is the reference, never stale.

## Installation

```bash
npm i -g agent-browser && agent-browser install   # operation layer (one-time)
npx skills add transmit-bug/agent-compass --skill web-router --skill web-verify \
  --skill web-smoke --skill web-checker --skill web-fixer --skill web-dev \
  --skill web-maintain --skill web-logic
```

Extending: a new web workflow = a new `<name>/SKILL.md` in this directory (user-invoked),
invoking the web-verify discipline, registered in this table + skills-lock.json.
