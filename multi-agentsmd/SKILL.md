---
name: multi-agentsmd
description: 'Generate layered AGENTS.md for structured projects. Use when creating or updating AGENTS.md in projects with sub-directories.'
---

# Multi-level AGENTS.md

> **Write what would confuse an agent, skip what wouldn't.**

## Step 1: Analyze the directory

Read entry point, one representative module, one test file, config files. Find what's non-obvious.

## Step 2: Pick what belongs

Describe patterns, not instances. Cut what's obvious. Cut what the parent already covers.

## Step 3: Write

Pick sections that match the content — no fixed template.

Architecture / Tests / Domain tools / Conventions / Gotchas / Key modules / Data model

Only what's relevant. Don't create a file if the directory is obvious.

## Example

```markdown
## Architecture
Core → Storage → API, each layer isolated. Core is pure logic, no I/O.

## Tests
Colocated next to source. In-memory database.

## Gotcha
Static routes must be mounted before parameterized routes or they shadow each other.
```
