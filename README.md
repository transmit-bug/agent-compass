# Agent Compass

[![skills.sh](https://skills.sh/b/agent-compass)](https://skills.sh/agent-compass)

A collection of skills for AI agent workflows, organized by domain:

- **content-manager** — the context an agent carries into a project (AGENTS.md + README authoring)
- **desktop-automation** — desktop-application automation (driving, verifying, and fixing apps through their UI)
- **agent-browser** — web-application development, testing, maintenance, smoke and logic verification driven by the agent-browser toolset
- **frontend** — distinctive frontend design guidance plus the agent-browser operation layer (vendor-tracked from upstream)
- **backend** — general-purpose backend discipline skills (state machines, reliability, migrations)
- **design** — pre-implementation design work: turning ideas into approved design specs

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
│   ├── agent-browser/            # web dev/test/maintain/smoke/logic (structure-first)
│   │   ├── agent-browser/        # operation-layer stub (vendor-tracked from vercel-labs/agent-browser)
│   │   ├── web-router/  web-verify/  web-setup/   # entry + primitive + onboarding
│   │   ├── web-dev/  web-checker/  web-fixer/
│   │   ├── web-smoke/  web-maintain/  web-logic/
│   │   ├── scripts/    # agent-browser-run / agent-browser-stale (+ shared renderer)
│   │   └── references/ # session-model.md (contract, owned by web-verify)
│   ├── frontend/                 # frontend design guidance (vendor-tracked from anthropics/claude-plugins-public)
│   │   └── frontend-design/
│   ├── backend/                  # general backend discipline (state machines, reliability, migrations)
│   │   ├── state-machine/        # design & verify state machines
│   │   ├── reliable-api/         # idempotency, retries, outbox, exactly-once
│   │   └── data-migration/       # safe data-layer evolution
│   ├── design/                   # pre-implementation design work (brainstorm → spec)
│   │   └── spark/                # turn ideas into approved design specs through dialogue
├── scripts/sync-upstream.sh     # check vendored skills against upstream, update on request
├── skills-lock.json
└── README.md
```

`skills/` is the standard container directory: the skills CLI walks it up to 3 levels deep,
so category folders are discovered natively. Each category is a sub-directory; every skill
remains a self-contained directory with its own `SKILL.md` (Agent Skills spec compliant).

**Grouped installs**: `.claude-plugin/marketplace.json` (Claude Code plugin-marketplace
format) declares the six groups — `content-manager`, `desktop-automation`, `agent-browser`,
`frontend`, `backend`, `design` — so `npx skills add transmit-bug/agent-compass` shows a collapsible,
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
`references/session-model.md`, owned by the web-verify primitive):

- **agent-browser** — operation-layer discovery stub for the agent-browser CLI (vendor-tracked
  from `vercel-labs/agent-browser`; by design it never goes stale — it points at
  `agent-browser skills get core`, which always matches the installed CLI version)
- **web-router** — model-invoked deriving entry: routes a lifecycle ask to the right skill
  (reads README + frontmatter, never a hand-maintained gloss); entry, not gate
- **web-setup** — onboard an app repo: scaffold `.agent-browser/` + orient doc, gitignore the
  evidence, record how to run the app, check the operation layer and vault
- **web-verify** — model-invoked primitive owning the verification discipline (run model,
  perception ladder, verdicts, staleness/retention, autonomy gate); every mode skill
  invokes it by one prose line
- **web-dev** — build loop: edit → reload → check structure/errors → iterate to acceptance
- **web-checker** — judge a rendered page against expected structure (or a reference image) → verdicts
- **web-fixer** — converge a page to a fixed reference: judge → fix → reload, until the gap list is empty
- **web-smoke** — verify a defined core flow end-to-end with per-step assertions → PASS/FAIL
- **web-maintain** — git-driven staleness scan + selective forgetting (tidy)
- **web-logic** — test a web app's business logic: infer it from source, generate test cases, run them, classify problems three ways (implementation mismatch / logic flaw / wrong inference)

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

### backend — general-purpose backend discipline

Skills for the hard, general parts of backend work — the discipline behind state,
reliability, and data, applicable across industries. All user-invoked, zero context.

| Skill | Description |
|-------|-------------|
| [state-machine](./skills/backend/state-machine/) | Design and verify state machines in any codebase — legal transitions, terminal states, persistence, and crash recovery. |
| [reliable-api](./skills/backend/reliable-api/) | Make an API or event flow safe under retries and replays — idempotency, retry policy, outbox, exactly-once semantics. |
| [data-migration](./skills/backend/data-migration/) | Plan and verify safe data-layer changes — schema migrations, backfills, dual-writes, and rollback, without downtime or data loss. |

### design — pre-implementation design work

Skills for the phase before implementation: turning ideas into approved design specs.

| Skill | Description |
|-------|-------------|
| [spark](./skills/design/spark/) | Turn an idea into a design spec through dialogue — one question at a time, then a written spec under `docs/spark/`, then stop. |

**Related ecosystem**: skills that pair with this phase — `grilling` (stress-test a plan),
`to-spec` / `to-tickets` / `implement` (the pipeline that runs after the spec) — live in the
[Matt Pocock ecosystem](https://github.com/mattpocock/skills) and are installed from there;
agent-compass does not duplicate them.

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
# Discovery + grouping — the sanctioned check (AGENTS.md). Run in a temp dir; never
# install globally:
npx skills add transmit-bug/agent-compass --list

# Structural validation — skills-ref implements the official Agent Skills spec, which
# does not model this repo's `disable-model-invocation` extension (blueprint §1: the
# user-invoked invocation axis, carried by most business skills) nor the vendored stub's
# upstream `hidden` field. Those skills are covered by the discovery check above.
npx skills-ref validate ./skills/content-manager/agentsmd
npx skills-ref validate ./skills/agent-browser/web-router
npx skills-ref validate ./skills/agent-browser/web-verify
npx skills-ref validate ./skills/frontend/frontend-design
```

To check vendored skills against their upstream sources:

```bash
./scripts/sync-upstream.sh --check
```

## License

MIT
