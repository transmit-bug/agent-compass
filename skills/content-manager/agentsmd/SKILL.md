---
name: agentsmd
description: 'Author AGENTS.md agent instructions — generate the root file, layer sub-directory files for monorepos, or add rules/constraints. Use when creating or updating agent instructions in any repository.'
argument-hint: "Mode: root | layered | rules (default: root)"
license: MIT
metadata:
  author: agent-compass
  version: "2.0"
  category: documentation
---

# AGENTS.md Authoring

One skill, three modes. AGENTS.md is an open format that gives coding agents the context
and instructions they need to work on a project — a "README for agents". It complements
README.md with the technical context an agent needs but a human README would clutter.

> **Write what would confuse an agent, skip what wouldn't.**

## Pick a mode

The mode comes from the argument when one is given (`/agentsmd layered`, `/agentsmd rules`);
otherwise infer it from the situation:

- **`root`** (default) — create or update the root `AGENTS.md` for a repository
- **`layered`** — create per-directory `AGENTS.md` files for a monorepo / structured project
- **`rules`** — add user-defined rules, constraints and guardrails to an existing `AGENTS.md`

A single session can combine modes (e.g. `root` for the root file, then `layered` for each
sub-directory that needs its own context, then `rules` for anything the user requires).

## Mode: root — the repository-level AGENTS.md

Create `AGENTS.md` at the repository root, following the guidance at <https://agents.md/>.

### Key principles

- **Agent-focused**: detailed technical instructions for automated tools
- **Complements README.md**: adds agent-specific context, doesn't replace human docs
- **Standardized location**: repository root (or subproject roots for monorepos)
- **Open format**: standard Markdown with flexible structure
- **Ecosystem compatibility**: works across 20+ AI coding tools (Cursor, Aider, Gemini CLI, ...)

### Essential sections

- **Project Overview** — what the project does, architecture if complex, key technologies
- **Setup Commands** — install steps, environment setup, dependency management, database setup
- **Development Workflow** — dev server, build commands, watch/hot-reload, package manager specifics
- **Testing Instructions** — how to run unit/integration/e2e tests, where tests live, naming
  conventions, coverage requirements, how to run a focused subset
- **Code Style Guidelines** — language conventions, lint/format rules, file organization,
  naming, import/export patterns
- **Build and Deployment** — build commands and outputs, environment configs, deploy steps, CI/CD

### Optional but recommended

- **Security Considerations** — security testing, secrets management, auth patterns, permissions
- **Pull Request Guidelines** — title format, required checks, review process, commit messages
- **Debugging and Troubleshooting** — common issues, logging patterns, debug config, perf notes
- **Monorepo Instructions** (if applicable) — working with multiple packages, cross-package
  dependencies, selective building/testing — then switch to the `layered` mode for sub-directories

### Process

1. **Analyze the project**: languages/frameworks, package managers, testing frameworks,
   architecture (monorepo vs single package)
2. **Identify key workflows**: `package.json` scripts, Makefile, CI/CD config, docs
3. **Write the sections that match the content** — no fixed template; include specific,
   actionable commands an agent can run directly
4. **Test the instructions**: every command should actually work
5. **Keep it focused** on what agents need to know, not general project information

### Example template

Customize, don't fill in blindly — only keep sections the project actually has:

```markdown
# AGENTS.md

## Project Overview

[Brief description of the project, its purpose, and key technologies]

## Setup Commands

- Install dependencies: `[package manager] install`
- Start development server: `[command]`
- Build for production: `[command]`

## Testing Instructions

- Run all tests: `[command]`
- Run unit tests: `[command]`
- Run integration tests: `[command]`
- [Specific testing patterns or requirements]

## Code Style

- [Language and framework conventions]
- [Linting rules and commands]
- [File organization patterns]

## Build and Deployment

- [Build process details]
- [Output directories]
- [Deployment commands]

## Pull Request Guidelines

- Title format: [component] Brief description
- Required checks: `[lint command]`, `[test command]`
```

### Working example (from agents.md)

```markdown
# Sample AGENTS.md file

## Dev environment tips

- Use `pnpm dlx turbo run where <project_name>` to jump to a package instead of scanning with `ls`.
- Run `pnpm install --filter <project_name>` to add the package to your workspace so Vite,
  ESLint, and TypeScript can see it.
- Use `pnpm create vite@latest <project_name> -- --template react-ts` to spin up a new React
  + Vite package with TypeScript checks ready.
- Check the name field inside each package's package.json to confirm the right name—skip the
  top-level one.

## Testing instructions

- Find the CI plan in the .github/workflows folder.
- Run `pnpm turbo run test --filter <project_name>` to run every check defined for that package.
- From the package root you can just call `pnpm test`. The commit should pass all tests before
  you merge.
- To focus on one step, add the Vitest pattern: `pnpm vitest run -t "<test name>"`.
- Fix any test or type errors until the whole suite is green.
- After moving files or changing imports, run `pnpm lint --filter <project_name>` to be sure
  ESLint and TypeScript rules still pass.
- Add or update tests for the code you change, even if nobody asked.

## PR instructions

- Title format: [<project_name>] <Title>
- Always run `pnpm lint` and `pnpm test` before committing.
```

## Mode: layered — per-directory AGENTS.md

For monorepos / structured projects: the root file carries the repository-level context, and
each sub-directory that needs its own agent context gets a smaller `AGENTS.md` of its own.
The closest AGENTS.md to a file takes precedence.

### Step 1: Analyze the directory

Read the entry point, one representative module, one test file, and config files. Find what's
non-obvious — the things an agent would get wrong without being told.

### Step 2: Pick what belongs

Describe patterns, not instances. Cut what's obvious. Cut what the parent already covers.
Don't create a file for a directory that's obvious.

### Step 3: Write

Pick sections that match the content — no fixed template: Architecture / Tests / Domain tools
/ Conventions / Gotchas / Key modules / Data model. Only what's relevant.

### Example

```markdown
## Architecture
Core → Storage → API, each layer isolated. Core is pure logic, no I/O.

## Tests
Colocated next to source. In-memory database.

## Gotcha
Static routes must be mounted before parameterized routes or they shadow each other.
```

## Mode: rules — constraints and guardrails

Add rules the user wants the AI to follow in a specific directory. These supplement directory
analysis: the other modes describe what *exists*; this mode records what the user *requires*.

### What goes here

Things the AI can't infer from reading code:

- **Constraints**: "Never use raw HTML form elements — always shadcn/ui"
- **Requirements**: "All API routes must have Zod validation"
- **Guardrails**: "Don't add new dependencies without asking"
- **Preferences**: "Use Chinese for all user-facing strings"
- **Warnings**: "The schema.ts file is 600 lines — don't refactor without discussion"

### Process

1. Ask what rule the user wants to add and for which directory
2. Write it into the appropriate AGENTS.md (root or sub-level)
3. Keep it to one line or a short bullet list — rules should be scannable

### Format

Rules are just bullets under a `## Rules` or `## Constraints` heading. No boilerplate.
If the AGENTS.md doesn't exist yet for that directory, create it with just the rules heading.

```markdown
## Rules
- Use shadcn/ui primitives — never raw HTML form elements
- All user-facing strings in Chinese (Simplified)
- Don't add new dependencies without discussion
```

## General notes

- AGENTS.md is living documentation — update it as the project evolves
- Be specific: exact commands, not vague descriptions; wrap commands in backticks
- Include context: explain *why* certain steps are needed, not just what to run
- Don't restate what's obvious from the code — agents read the code
