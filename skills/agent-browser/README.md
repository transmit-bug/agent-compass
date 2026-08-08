# agent-browser — web-app development / testing / maintenance / smoke / logic

Suite of user-invoked skills for the web-app lifecycle, driven by the **agent-browser**
skill + CLI — the operation layer (external, referenced not vendored:
`npm i -g agent-browser && agent-browser install`).

## When to use which

| Need | Skill |
|---|---|
| Implement / develop a feature | [web-dev](./web-dev/) |
| Does the page match expectations | [web-checker](./web-checker/) |
| Fix until it matches a reference | [web-fixer](./web-fixer/) |
| End-to-end core-flow verification | [web-smoke](./web-smoke/) |
| Verify staleness / re-run / tidy | [web-maintain](./web-maintain/) |
| Infer logic, generate cases, run, classify | [logic-test](./logic-test/) |

## Run model (summary)

- **structure-first, vision-on-demand** — perception defaults to the DOM /
  accessibility tree (snapshot → read → eval → console/errors); pixels only for
  "appearance tasks / DOM-less content / human-facing evidence".
- **run** — one traceable verification unit, anchored to worktree + branch + commit;
  supersede chain, write-through on write.
- **storage** — `.agent-browser/` (committed: manifest / index / flows MD) +
  `.agent-browser/runs/` (gitignored evidence).
- **selective forgetting** — the index carries only the current state + window; git is
  the archive; tidy forgets explicitly, never in the background.
- Full contract: [references/session-model.md](references/session-model.md)

## Layering

```
business layers (user-invoked)                    operation layer (external)
┌──────────────────────────────┐                  ┌─────────────────────────────┐
│  web-dev      dev loop       │                  │  agent-browser skill + CLI   │
│  web-checker  struct/visual  │──depends on────▶│    npm i -g agent-browser     │
│               verdict        │  (one-way)      │    agent-browser install      │
│  web-fixer    fix loop       │                  │    skills get core (ref)     │
│  web-smoke    flow verify    │                  └─────────────────────────────┘
│  web-maintain staleness/forget│
│  logic-test   logic testing  │
└──────────┬───────────────────┘
           │ shared
           ▼
   scripts/agent-browser-run (run lifecycle)  →  scripts/agent-browser-run (run lifecycle)
   scripts/agent-browser-stale (staleness scan + tidy)
   references/session-model.md (contract)
```

All six skills are user-invoked (`disable-model-invocation: true`, zero context
load) — call them by name when needed; this README is the human routing index.
Judgment stays with the agent, deterministic computation goes into scripts, and command
details always come from `agent-browser skills get core` (the CLI is the reference,
never stale).

## Installation

```bash
npm i -g agent-browser && agent-browser install   # operation layer (one-time)
npx skills add transmit-bug/agent-compass --skill web-smoke --skill web-checker \
  --skill web-fixer --skill web-dev --skill web-maintain --skill logic-test
```

Extending: a new web workflow = a new `<name>/SKILL.md` in this directory
(user-invoked), pointing at the shared scripts and contract, registered in this table
+ skills-lock.json.
