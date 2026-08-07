# Agent Compass

[![skills.sh](https://skills.sh/b/agent-compass)](https://skills.sh/agent-compass)

A collection of skills for **context engineering** — helping AI agents understand project structure, navigate codebases, and follow project conventions.

## Installation

```bash
npx skills add transmit-bug/agent-compass
```

Or install specific skills:

```bash
npx skills add transmit-bug/agent-compass --skill create-agentsmd
npx skills add transmit-bug/agent-compass --skill multi-agentsmd
```

## Skills

| Skill | Description |
|-------|-------------|
| [create-agentsmd](./create-agentsmd/) | Generate a complete AGENTS.md file for any repository |
| [multi-agentsmd](./multi-agentsmd/) | Generate layered AGENTS.md for structured projects with sub-directories |
| [multi-agentsmd-rules](./multi-agentsmd-rules/) | Add user-defined rules and constraints to AGENTS.md files |

## Groups

| Group | Skills | Description |
|-------|--------|-------------|
| **computeruse** | [`computer-automation`](./computer-automation/), [`uichecker`](./uichecker/), [`ui-fixer`](./ui-fixer/), [`smoke-runner`](./smoke-runner/) | Midscene desktop automation wrapped in business skills |

### computeruse — desktop automation, wrapped in business skills

Vision-driven desktop control (Midscene) split into two layers, with one-way, explicit dependencies:

- **Operation layer** — `computer-automation`: a persistent **session** daemon that connects once, gates every AI call behind a local screen-diff (zero LLM on unchanged frames), and archives every run (`index.md` + merged report). This is the midscene wrapper — the cost and speed optimization.
- **Business layer** — `uichecker`, `ui-fixer`, `smoke-runner`: software-development workflows built on top of the session. Each is an independent skill with a single dependency: `computer-automation`.

```
Business layer (user-invoked)             Operation layer (user-invoked)
┌────────────────────────────┐           ┌──────────────────────────────────────────┐
│  uichecker     verify UI   │           │  computer-automation (SKILL.md)           │
│  ui-fixer      fix to      │──────────▶│    ├─ scripts/mid.sh        session       │
│                match image │  depends  │    │    └─ midagent.js       daemon       │
│  smoke-runner  run flow +  │   on      │    ├─ scripts/screen-diff.py  diff gate   │
│                PASS/FAIL   │           │    ├─ scripts/extract-steps.py  report    │
└────────────────────────────┘           │    └─ npx @midscene/computer@1  CLI (fb)  │
                                         └──────────────────────────────────────────┘
```

- `uichecker` → `computer-automation` → `scripts/mid.sh` → `midagent.js` (daemon; resolves `@midscene/computer` from the project `node_modules`, falling back to a machine-wide global install) with `screen-diff.py` gate; falls back to the stateless CLI.
- `ui-fixer` additionally uses ImageMagick `compare` for the pixel signal and edits source code itself (the only business skill that changes code).
- Runtime deps: node ≥ 18, python3 + Pillow, ImageMagick (`uichecker`, `ui-fixer`).
- **Model config is assumed** (`MIDSCENE_MODEL_*` in `.env`) — deliberately not documented inside the skills; it is environment setup, not a workflow concern.

Install:

```bash
npx skills add transmit-bug/agent-compass --skill computer-automation --skill uichecker --skill ui-fixer --skill smoke-runner
```

All four skills are **user-invoked** (`disable-model-invocation: true`): the group costs zero
context and nothing fires without your call — desktop automation takes over your real mouse
and keyboard, so that gate is deliberate. Name the skill(s) you need: "uichecker +
computer-automation, check the export dialog", "ui-fixer + computer-automation, make the UI
match this image", "smoke-runner + computer-automation, verify the export flow".

**Extending the group**: a new business workflow is a new top-level `<name>/SKILL.md` with
`disable-model-invocation: true`, a `## Dependencies` section naming `computer-automation`
(the user loads both by name), steps written against the session commands
(`mid.sh start / shot / act / assert / finish`), and an entry in this table +
`skills-lock.json`. Keep the layers clean: the business skill decides *what* and *when*;
`computer-automation` decides *how*.

## Philosophy

> **Write what would confuse an agent, skip what wouldn't.**

Each skill focuses on a specific aspect of building agent-readable project context:

- **create-agentsmd**: Root-level project context (setup, testing, deployment)
- **multi-agentsmd**: Directory-level architecture and patterns
- **multi-agentsmd-rules**: User-defined constraints and guardrails

## Supported Agents

These skills work with any agent that supports the Agent Skills standard:

- Claude Code
- Cursor
- GitHub Copilot
- Windsurf
- Cline
- And [many more](https://skills.sh)

## Development

To validate skills locally:

```bash
npx skills-ref validate ./create-agentsmd
npx skills-ref validate ./multi-agentsmd
npx skills-ref validate ./multi-agentsmd-rules
npx skills-ref validate ./computer-automation
npx skills-ref validate ./uichecker
npx skills-ref validate ./ui-fixer
npx skills-ref validate ./smoke-runner
```

## License

MIT
