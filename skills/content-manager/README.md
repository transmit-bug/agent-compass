# content-manager — the context an agent carries in

Skills for building the context an AI agent carries into a project.

| Skill | What it does |
|-------|--------------|
| [agentsmd](./agentsmd/) | Author `AGENTS.md` agent instructions — three modes: **root** (repository-level file), **layered** (per-directory files for monorepos), **rules** (user constraints and guardrails) |

One skill, three modes. Invoke with an argument to pick a mode (`/agentsmd layered`,
`/agentsmd rules`); without one, the agent infers the mode from the repository and the request.

New context-management skills (project scaffolding, conventions, architecture docs, etc.)
belong in this category.
