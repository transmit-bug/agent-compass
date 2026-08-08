# Agent Compass

[![skills.sh](https://skills.sh/b/agent-compass)](https://skills.sh/agent-compass)

A collection of skills for AI agent workflows, organized by domain:

- **content-manager** — the context an agent carries into a project (AGENTS.md + README authoring)
- **desktop-automation** — desktop-application automation (driving, verifying, and fixing apps through their UI)
- **agent-browser** — web-application development, testing, maintenance and smoke verification driven by the agent-browser toolset
- **frontend** — distinctive frontend design guidance plus the agent-browser operation layer (vendor-tracked from upstream)
- **logic-test** — cross-domain business-logic testing: derive logic from source, generate test cases, run them, classify problems

## Repository Layout

```
agent-compass/
├── skills/
│   ├── content-manager/          # context an agent carries in
│   │   ├── agentsmd/             # root | layered | rules — one skill, three modes
│   │   └── readmemd/              # create | refresh | trim — the stranger's front door
│   ├── desktop-automation/    # desktop automation (drive/verify/fix)
│   │   ├── computer-automation/
│   │   ├── uichecker/
│   │   ├── ui-fixer/
│   │   └── smoke-runner/
│   ├── agent-browser/            # web dev/test/maintain/smoke (structure-first)
│   │   ├── agent-browser/        # operation-layer stub (vendor-tracked from vercel-labs/agent-browser)
│   │   ├── web-dev/  web-checker/  web-fixer/
│   │   ├── web-smoke/  web-maintain/
│   │   ├── scripts/    # agent-browser-run / agent-browser-stale
│   │   └── references/ # session-model.md (run contract)
│   ├── frontend/                 # frontend design guidance (vendor-tracked from anthropics/claude-plugins-public)
│   │   └── frontend-design/
│   └── logic-test/               # cross-domain: source → logic → cases → triage
├── scripts/sync-upstream.sh     # check vendored skills against upstream, update on request
├── skills-lock.json
└── README.md
```

`skills/` is the standard container directory: the skills CLI walks it up to 3 levels deep,
so category folders are discovered natively. Each category is a sub-directory; every skill
remains a self-contained directory with its own `SKILL.md` (Agent Skills spec compliant).

**Grouped installs**: `.claude-plugin/marketplace.json` (Claude Code plugin-marketplace
format) declares the five groups — `content-manager`, `desktop-automation`, `agent-browser`,
`frontend`, `logic-test` — so `npx skills add transmit-bug/agent-compass` shows a collapsible,
grouped selection and you can install one group at a time (each skill also stays installable
by name via `--skill <name>`).

## Installation

```bash
npx skills add transmit-bug/agent-compass
```

Or install specific skills:

```bash
npx skills add transmit-bug/agent-compass --skill agentsmd
npx skills add transmit-bug/agent-compass --skill computer-automation --skill uichecker --skill ui-fixer --skill smoke-runner
```

## Categories

### content-manager — the context an agent carries in

Skills for building project context: AGENTS.md carries agent instructions, README.md carries
what a human needs. Each is one skill with three modes.

| Skill | Description |
|-------|-------------|
| [agentsmd](./skills/content-manager/agentsmd/) | Author AGENTS.md in three modes — **root** (repository-level file), **layered** (per-directory files for monorepos), **rules** (user constraints/guardrails). Argument: `root \| layered \| rules` |
| [readmemd](./skills/content-manager/readmemd/) | Author README.md in three modes — **create** (from scratch), **refresh** (stale → current), **trim** (sediment → gone). Argument: `create \| refresh \| trim` |

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

Web-app lifecycle skills driven by the **agent-browser** skill + CLI (operation layer;
the run model, storage, and retention contract is shared in
`references/session-model.md`):

- **agent-browser** — operation-layer discovery stub for the agent-browser CLI (vendor-tracked
  from `vercel-labs/agent-browser`; by design it never goes stale — it points at
  `agent-browser skills get core`, which always matches the installed CLI version)
- **web-dev** — build loop: edit → reload → check structure/errors → iterate to acceptance
- **web-checker** — judge a rendered page against expected structure (or a reference image) → verdicts
- **web-fixer** — converge a page to a fixed reference: judge → fix → reload, until the gap list is empty
- **web-smoke** — verify a defined core flow end-to-end with per-step assertions → PASS/FAIL
- **web-maintain** — git-driven staleness scan + selective forgetting (tidy)

The suite is **structure-first, vision-on-demand**: perception
runs through the DOM/accessibility tree (snapshot → read → eval → console/errors); pixels are
only for appearance tasks, DOM-less content, and human evidence. Runs anchor to
worktree+branch+commit under `.agent-browser/` (committed index + gitignored evidence); git is
the archive and the index forgets by policy, never grows forever. Install the operation layer
once: `npm i -g agent-browser && agent-browser install`.

### frontend — frontend design guidance

- **frontend-design** — distinctive, intentional visual design for new or reshaped UI
  (aesthetic direction, typography, layout, avoiding template-default looks). Vendor-tracked
  from `anthropics/claude-plugins-public` (Apache-2.0); see its `LICENSE.txt`.

**Invocation note**: unlike the other groups, `frontend-design` is **model-invoked** — its
value is that the agent reaches for it automatically whenever the task involves building or
reshaping UI. Installing the `frontend` group therefore adds a small amount of routing
context by design; if you prefer zero context, install it per-project instead.

### logic-test — cross-domain business-logic testing

- **logic-test** — infer business logic from source, generate test cases, run them on the
  real app, and classify problems three ways (implementation mismatch / logic flaw /
  wrong inference). Cross-domain: the execution channel branches at the last step — web
  via `agent-browser`, desktop via `computer-automation`, backend via plain Bash.

**Dependencies**: the install group bundles both execution channels so it works out of the
box — installing the `logic-test` group also installs the `agent-browser` operation stub
and the `computer-automation` session skill.

```bash
npx skills add transmit-bug/agent-compass   # pick the logic-test group
```

Testing backends only (plain Bash, no channel needed)? Install just the skill:

```bash
npx skills add transmit-bug/agent-compass --skill logic-test
```

## Philosophy

> **Write what would confuse an agent, skip what wouldn't.**

Each skill focuses on a specific aspect of building agent-readable project context:

- **agentsmd**: AGENTS.md authoring — root-level context (setup, testing, deployment), directory-level
  architecture (layered), and user-defined constraints (rules), one skill with three modes
- **readmemd**: README.md authoring — the front door for a stranger: create / refresh / trim, one skill
  with three modes

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
npx skills-ref validate ./skills/content-manager/agentsmd
npx skills-ref validate ./skills/content-manager/readmemd
npx skills-ref validate ./skills/desktop-automation/computer-automation
npx skills-ref validate ./skills/desktop-automation/uichecker
npx skills-ref validate ./skills/desktop-automation/ui-fixer
npx skills-ref validate ./skills/desktop-automation/smoke-runner
npx skills-ref validate ./skills/agent-browser/agent-browser
npx skills-ref validate ./skills/agent-browser/web-dev
npx skills-ref validate ./skills/agent-browser/web-checker
npx skills-ref validate ./skills/agent-browser/web-fixer
npx skills-ref validate ./skills/agent-browser/web-smoke
npx skills-ref validate ./skills/agent-browser/web-maintain
npx skills-ref validate ./skills/frontend/frontend-design
```

To check vendored skills against their upstream sources:

```bash
./scripts/sync-upstream.sh --check
```

## License

MIT
