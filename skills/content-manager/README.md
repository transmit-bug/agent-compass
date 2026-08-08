# content-manager — the context an agent carries in

Skills for building the context an AI agent carries into a project.

| Skill | What it does |
|-------|--------------|
| [agentsmd](./agentsmd/) | Author `AGENTS.md` agent instructions — three modes: **root** (repository-level file), **layered** (per-directory files for monorepos), **rules** (user constraints and guardrails) |
| [readmemd](./readmemd/) | Author `README.md` human docs — three modes: **create** (from scratch), **refresh** (stale → current), **trim** (sediment → gone) |

`agentsmd` is model-invoked by design (its value is automatic reach); `readme` is user-invoked.
Invoke with an argument to pick a mode (`/agentsmd layered`, `/readmemd trim`); without one, the
agent infers the mode from the repository and the request.

New context-management skills (project scaffolding, conventions, architecture docs, etc.)
belong in this category.
