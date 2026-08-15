# Agent Compass

A curated collection of practical skills for AI agent workflows, distributed from GitHub and
installed via the skills CLI. Practicality-first: a skill earns its place by paying off in a
real development workflow.

## Language

**Skill**:
A self-contained, installable unit of agent capability: a directory with a `SKILL.md`
conforming to the Agent Skills spec.
_Avoid_: tool, plugin, extension

**Category**:
A group of related skills under `skills/`, shipped and installed together.
_Avoid_: pack, area

**Operation layer**:
The machinery a category's business skills are built on (a session daemon, a CLI wrapper,
shared scripts). Business skills depend on it; it depends on nothing within the category.

**Business skill**:
A user-facing workflow skill built on an operation layer. It decides *what* to do and *when*;
the operation layer decides *how*.
_Avoid_: workflow, action

### Web-app lifecycle (agent-browser)

**Feature**:
The lifecycle unit of a managed web app — a user-facing capability with a slug.
_Avoid_: ticket, task, story

**Flow**:
A repeatable verification recipe under a feature (`.agent-browser/flows/*.md`), the unit a run executes.
_Avoid_: scenario

**Run**:
One traceable verification execution of a flow, anchored to worktree/branch/commit, carrying per-checkpoint verdicts.
_Avoid_: test, check

**Record**:
A stored fact in `index.json` (runs, verdicts, timestamps, optional ticket refs) — the only persisted state.
_Avoid_: state, entry

**Derived view**:
Status rendered from records by a deterministic script (stage state, status table, orient doc) — never stored.
_Avoid_: status as state

**Stage**:
A position on the feature arc (spec → dev → check → fix → smoke → maintain); stage state is derived, not stored.
_Avoid_: phase

**Orient doc**:
The per-app `index.md` a fresh session reads first — derived status, next actions, and gists of recent assessments.
_Avoid_: handoff doc

**Autonomy contract**:
The initiative split in the suite — the human sets direction and reviews; the model reads code, verifies, assesses, records, opens app-repo tickets, and fixes, asking only when an answer can't be derived or an action is irreversible or expensive.
_Avoid_: delegation
