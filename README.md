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
```

## License

MIT
