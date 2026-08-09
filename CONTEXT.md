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
