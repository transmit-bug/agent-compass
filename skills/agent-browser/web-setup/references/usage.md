# agent-browser — usage guide

How to run the web-app lifecycle (spec → dev → check → fix → smoke → maintain) in the
managed app's own repo with the agent-browser suite. Every stage follows the same rhythm:
**record → derive → orient → act**.

This file ships with **web-setup**; the agent-facing contract lives in
[../../web-verify/references/session-model.md](../../web-verify/references/session-model.md)
(owned by web-verify), and the worked per-stage steps live in each skill's own SKILL.md —
read those, they are canonical. Repo-only architecture context (not installed with the
skills): `docs/blueprint.md` and `docs/adr/0002-web-app-lifecycle-model.md`.

## Setup

### Machine, once

- Operation layer: `npm i -g agent-browser && agent-browser install`. The command surface
  is `agent-browser skills get core` — never hardcode CLI details into files or memory.
- Skills, **project-level only, never `-g`**: `npx skills add transmit-bug/agent-compass
  --skill web-router --skill web-verify --skill web-logic …` (full list in the group
  README).

### App repo, once

Run the **web-setup** skill — executed by the agent, not the user: it bootstraps the suite
scripts into `.agent-browser/scripts/`, scaffolds `.agent-browser/` (empty records + orient
doc), gitignores `.agent-browser/runs/`, records how to run the app
(`docs/agent-browser/app-notes.md`, linked from the orient doc — one launch to observe the
launch command and port), and notes auth facts (or records "no auth" so runs never re-ask).
The user's only part is the one-time interactive vault login when the app has one.

*Done when: `.agent-browser/index.md` exists, links the app notes, and a fresh session can
orient and start a run.*

## The lifecycle at a glance

- The **feature** is the unit; each feature arcs spec → dev → check → fix → smoke →
  maintain (dev↔check↔fix iterate until verified, smoke is the gate, maintain is ongoing).
- **Records** live in `.agent-browser/index.json` — runs and assessments, facts only.
  Everything else (status, next actions, the orient doc `index.md`) is **derived** by the
  scripts, never stored.
- The **tracker** (the app repo's own issue tracker) holds intent: spec tickets, found
  problems, blockers. Runs carry optional `--ticket <#n>` and `--blocked-by <#n,…>` refs.
- A fresh session **orients from exactly one artifact**: `.agent-browser/index.md`.
- **Re-testing is automatic.** A code change touching a run's provenance files or the UI
  surface, or a record aging past `staleSinceDays`, marks the run stale — it is re-verified
  by the owning skill before trust, without asking. The user is asked only for irreversible
  steps (tidy drops, destructive actions).
- Reusable context: **scenarios** (`docs/agent-browser/scenarios/`, the plan/recipe library
  — smoke / setup / business / flows) and **expectations** (`.agent-browser/expectations/*.md`).
  Answers to once-asked questions land in the durable docs' Decisions section — never
  re-asked.

## The stages

| Stage | Skill | Record |
|---|---|---|
| Onboard an app repo | web-setup | state home + app-notes + auth facts |
| Implement a feature | web-dev | run + checkpoint per acceptance point |
| Judge a rendered state | web-checker | run + one verdict per checkpoint (+ optional assess) |
| Converge to a fixed reference | web-fixer | run + gap-list checkpoints |
| Core-flow end-to-end | web-smoke | run + per-step PASS/FAIL |
| Business-logic review + cases | web-logic | business/ scenario + run + three-way problem classes |
| Staleness / tidy | web-maintain | `scan --mark` + `tidy --dry-run` / `--apply` |

Every stage runs the **web-verify** discipline (run model, perception, verdicts,
staleness) and writes through the same scripts (`agent-browser-run`, `agent-browser-stale`
— short for `.agent-browser/scripts/…`, bootstrapped by web-setup). Only the workflow
differs; the worked flow for one stage (web-logic) is spelled out in that skill's SKILL.md.

## Cross-session continuation

1. Fresh session: read `.agent-browser/index.md` — the derived status table, assessment
   gists, next actions.
2. Derive the next item: **stale** → re-verify with the stage's skill; **failing** →
   check/fix; **blocked** → resolve the blocker refs; open ticket without a run →
   not-started feature.
3. Act. **Never re-ask** — a question answered once lives in a gist or assessment, not in
   the conversation.

## Where each rule lives

| Topic | Home |
|---|---|
| Invocation axis, disclosure, workflow rules | repo `docs/blueprint.md` (not installed) |
| Run model, records, storage, commands | `web-verify/references/session-model.md` (ships with web-verify) |
| Verification discipline | `web-verify` (model-invoked primitive) |
| Orientation / routing | `web-router` — reads each skill's frontmatter |
| Lifecycle model, records vs derived views | repo `docs/adr/0002-web-app-lifecycle-model.md` (not installed) |
