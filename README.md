# Agent Compass

[![skills.sh](https://skills.sh/b/agent-compass)](https://skills.sh/agent-compass)

A collection of skills for AI agent workflows, organized by domain:

- **content-manager** — the context an agent carries into a project (AGENTS.md generation and constraints)
- **desktop-automation** — desktop-application automation (driving, verifying, and fixing apps through their UI)
- **agent-browser** — web-application development, testing, maintenance and smoke verification driven by the agent-browser toolset

## Repository Layout

```
agent-compass/
├── skills/
│   ├── content-manager/          # AI 纳入的管理上下文
│   │   ├── create-agentsmd/
│   │   ├── multi-agentsmd/
│   │   └── multi-agentsmd-rules/
│   ├── desktop-automation/    # 桌面应用自动化（操作/验证/修复）
│   │   ├── computer-automation/
│   │   ├── uichecker/
│   │   ├── ui-fixer/
│   │   └── smoke-runner/
│   └── agent-browser/            # Web 开发/测试/维护/冒烟（structure-first）
│       ├── web-dev/  web-checker/  web-fixer/
│       ├── web-smoke/  web-maintain/
│       ├── scripts/    # agent-browser-run / agent-browser-stale
│       └── references/ # session-model.md（run 模型契约）
├── skills-lock.json
└── README.md
```

`skills/` is the standard container directory: the skills CLI walks it up to 3 levels deep,
so category folders are discovered natively. Each category is a sub-directory; every skill
remains a self-contained directory with its own `SKILL.md` (Agent Skills spec compliant).

## Installation

```bash
npx skills add transmit-bug/agent-compass
```

Or install specific skills:

```bash
npx skills add transmit-bug/agent-compass --skill create-agentsmd
npx skills add transmit-bug/agent-compass --skill multi-agentsmd
npx skills add transmit-bug/agent-compass --skill computer-automation --skill uichecker --skill ui-fixer --skill smoke-runner
```

## Categories

### content-manager — the context an agent carries in

Skills for building agent-readable project context: root-level, directory-level, and rule-level instructions.

| Skill | Description |
|-------|-------------|
| [create-agentsmd](./skills/content-manager/create-agentsmd/) | Generate a complete AGENTS.md file for any repository |
| [multi-agentsmd](./skills/content-manager/multi-agentsmd/) | Generate layered AGENTS.md for structured projects with sub-directories |
| [multi-agentsmd-rules](./skills/content-manager/multi-agentsmd-rules/) | Add user-defined rules and constraints to AGENTS.md files |

### desktop-automation — desktop-application automation

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

All four skills are **user-invoked** (`disable-model-invocation: true`): the group costs zero
context and nothing fires without your call — desktop automation takes over your real mouse
and keyboard, so that gate is deliberate. Name the skill(s) you need: "uichecker +
computer-automation, check the export dialog", "ui-fixer + computer-automation, make the UI
match this image", "smoke-runner + computer-automation, verify the export flow".

**Extending the group**: a new business workflow is a new `<category>/<name>/SKILL.md` under
`skills/desktop-automation/` with `disable-model-invocation: true`, a `## Dependencies` section
naming `computer-automation` (the user loads both by name), steps written against the session
commands (`mid.sh start / shot / act / assert / finish`), and an entry in the category table +
`skills-lock.json`. Keep the layers clean: the business skill decides *what* and *when*;
`computer-automation` decides *how*.

### agent-browser — web development & QA

Web-app lifecycle skills driven by the **agent-browser** skill + CLI (external operation
layer; the run model, storage, and retention contract is shared in
`references/session-model.md`):

- **web-dev** — build loop: edit → reload → check structure/errors → iterate to acceptance
- **web-checker** — judge a rendered page against expected structure (or a reference image) → verdicts
- **web-fixer** — converge a page to a fixed reference: judge → fix → reload, until the gap list is empty
- **web-smoke** — verify a defined core flow end-to-end with per-step assertions → PASS/FAIL
- **web-maintain** — git-driven staleness scan + selective forgetting (tidy)

All five are **user-invoked**. The suite is **structure-first, vision-on-demand**: perception
runs through the DOM/accessibility tree (snapshot → read → eval → console/errors); pixels are
only for appearance tasks, DOM-less content, and human evidence. Runs anchor to
worktree+branch+commit under `.agent-browser/` (committed index + gitignored evidence); git is
the archive and the index forgets by policy, never grows forever. Install the operation layer
once: `npm i -g agent-browser && agent-browser install`.

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
npx skills-ref validate ./skills/content-manager/create-agentsmd
npx skills-ref validate ./skills/content-manager/multi-agentsmd
npx skills-ref validate ./skills/content-manager/multi-agentsmd-rules
npx skills-ref validate ./skills/desktop-automation/computer-automation
npx skills-ref validate ./skills/desktop-automation/uichecker
npx skills-ref validate ./skills/desktop-automation/ui-fixer
npx skills-ref validate ./skills/desktop-automation/smoke-runner
npx skills-ref validate ./skills/agent-browser/web-dev
npx skills-ref validate ./skills/agent-browser/web-checker
npx skills-ref validate ./skills/agent-browser/web-fixer
npx skills-ref validate ./skills/agent-browser/web-smoke
npx skills-ref validate ./skills/agent-browser/web-maintain
```

## License

MIT
