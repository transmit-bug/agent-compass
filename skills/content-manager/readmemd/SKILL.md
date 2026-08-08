---
name: readmemd
description: 'Author and maintain project README.md files — what a stranger needs to run and understand the project.'
argument-hint: "Mode: create | refresh | trim (default: create)"
disable-model-invocation: true
license: MIT
metadata:
  author: agent-compass
  version: "1.0"
  category: documentation
---

# README Authoring

The README is a project's front door: a stranger with the repo checked out reads it first —
before the docs, before the code. Its job is to let that stranger judge the project and run
it, not to document everything. Keep it free of overlap with AGENTS.md: agent instructions
carry what would confuse an agent; the README carries what the stranger needs — each
document holds only what its reader can't find elsewhere.

> **The first screen must let a stranger judge it and run it.**

## Pick a mode

The mode comes from the argument when one is given (`/readmemd refresh`, `/readmemd trim`);
otherwise infer it from the situation:

- **`create`** (default) — no README yet: write one from scratch
- **`refresh`** — a README exists but is stale or incomplete: update it in place
- **`trim`** — a README has sediment: cut it back to what a stranger needs

## Process (all modes)

1. **Read through the stranger's eyes** — what exists: `package.json` scripts, entry points,
   tests, the current README, `docs/`. Note what the stranger would need to run it.
   Done when you could run the project's main command from the notes alone.
2. **Draft the structure** — the stranger's questions below become the headings; pick only
   the ones a stranger would ask, in the order they would ask them.
3. **Write** — exact commands wrapped in backticks, copy-pasteable from a fresh checkout;
   include the *why* behind a step, not just the command. Commands stay minimal: the
   quickstart critical path (install, run, test) only — `package.json`, `Makefile`, and CI
   config hold the rest, and a reader can open them.
4. **Walk the front door** — from a clean checkout, follow the README top to bottom: every
   command runs, every path resolves, the first screen answers "what is this, can I run it".
5. **Cut** — every line answers one of the stranger's questions below; anything left moves to
   `docs/` or dies.

## What a stranger asks

The reference for steps 2 and 5 — every heading and line of a README answers one of these:

- **What is this?** — one line on the first screen: what it does and why it exists
- **Can I use it?** — license, maturity, supported platforms, when to pick it over alternatives
- **How do I run it?** — quickstart: install, run, test — before anything deeper
- **How do I use it?** — the main usage paths, not the full API surface
- **How do I test it?** — the test command and what it covers
- **How do I contribute?** — pointer to contributing docs, PR conventions, issue process
- **Where do I learn more?** — links to deeper docs, not their contents

## Working first screen

```markdown
# <name>

<one line: what it does and why it exists>

## Quickstart
- Install: `npm install`
- Run: `npm run dev`    → http://localhost:3000
- Test: `npm test`
```

## Mode notes

### refresh

Update what's stale, keep what's true. Re-run every command against the current checkout
before trusting it. Prune headings no stranger would ask for; leave the rest of the file
alone when the front door still works.

### trim

Sediment is content that stopped answering a stranger's question: instructions a human can
infer, detail `docs/` already carries, command inventories `package.json` and `Makefile`
already show, commands that no longer run. Move it to `docs/` when it still earns its
place; cut it when it doesn't. Keep the first screen intact.
