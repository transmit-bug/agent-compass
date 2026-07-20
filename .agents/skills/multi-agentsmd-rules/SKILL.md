---
name: multi-agentsmd-rules
description: 'Add rules and constraints to AGENTS.md. Use when the user wants to enforce conventions in specific directories.'
license: MIT
metadata:
  author: agent-compass
  version: "1.0"
  category: documentation
allowed-tools: Read Write AskUserQuestion
---

# AGENTS.md Rules

Add rules the user wants the AI to follow in a specific directory. These supplement the directory analysis from `multi-agentsmd` — that skill describes what exists, this skill records what the user requires.

## What goes here

Things the AI can't infer from reading code:

- **Constraints**: "Never use raw HTML form elements — always shadcn/ui"
- **Requirements**: "All API routes must have Zod validation"
- **Guardrails**: "Don't add new dependencies without asking"
- **Preferences**: "Use Chinese for all user-facing strings"
- **Warnings**: "The schema.ts file is 600 lines — don't refactor without discussion"

## Process

1. Ask what rule the user wants to add and for which directory
2. Write it into the appropriate AGENTS.md (root or sub-level)
3. Keep it to one line or a short bullet list — rules should be scannable

## Format

Rules are just bullets under a `## Rules` or `## Constraints` heading. No boilerplate.

```markdown
## Rules
- Use shadcn/ui primitives — never raw HTML form elements
- All user-facing strings in Chinese (Simplified)
- Don't add new dependencies without discussion
```

If the AGENTS.md doesn't exist yet for that directory, create it with just the rules heading.
