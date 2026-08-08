# AGENTS.md

## What this repository is

agent-compass is an **Agent Skills collection repository**: skills are organized by
category and distributed via GitHub + the skills CLI (`npx skills`). Its artifact is
"installable skills", not application code.

- Skills are organized into category containers, installed in groups via
  `.claude-plugin/marketplace.json`
- Skills follow the Agent Skills spec + writing-great-skills principles
- Generalize cross-domain capabilities into one skill instead of stacking one skill
  per domain

## Language

**All content in this repository must be written in English** — every document, skill,
comment, commit message, and record. Do not add content in Chinese or any other language.

## Repository layout

```
skills/                        # skill containers (CLI recursion depth 3)
├── content-manager/           # the context an agent carries in (AGENTS.md generation & constraints)
├── desktop-automation/        # desktop-application automation (midscene)
├── agent-browser/             # web-app development / testing / maintenance / smoke (+ operation-layer stub)
├── frontend/                  # frontend design guidance (vendor-tracked from upstream)
└── logic-test/                # cross-domain skills live at the container root
.claude-plugin/marketplace.json  # install groups (source must be "./"; bare "." is invalid)
skills-lock.json                 # skill registry (skillPath + computedHash [+ upstream])
scripts/sync-upstream.sh         # check/pull vendored skills against their upstream sources
README.md                        # human index (skill list lives here, not repeated in this file)
```

## Adding a skill

1. First judge whether it deserves to be its own skill: generalization first — use
   branches (one skill, multiple domains) rather than writing one skill per domain
2. Place it in the right category: `skills/<category>/<name>/SKILL.md`; cross-domain
   skills go in `skills/<name>/`
3. SKILL.md must follow:
   - All skills in this repo are `disable-model-invocation: true` (user-invoked, zero
     context load) — **exception**: the `frontend` group (and the `agent-browser`
     operation-layer stub) ship model-invoked by design; their value is automatic
     reach, so the zero-context rule is waived there
   - Steps have checkable completion criteria; guardrails are stated positively
   - Shared mechanics go in category-level `scripts/`, shared contracts in category-level
     `references/`; skills point to them via relative paths, zero duplication
   - Intent (how to do it, what "good" looks like) goes in Markdown; records (what was
     done, results) go in JSON; deterministic computation goes into scripts, judgment
     stays with the agent
4. Sync three places: register in `skills-lock.json` + group in
   `.claude-plugin/marketplace.json` + index in README

## Vendoring a skill from upstream

- Copy the skill files into the repo, keep its license file, and add an `upstream` block
  to its `skills-lock.json` entry:
  `{ "repo": "<owner>/<name>", "path": "<path/to/SKILL.md>", "ref": "main" }`
- Track drift with `./scripts/sync-upstream.sh --check` (report only) or without
  `--check` (pull changed files + recompute hashes). Review with `git diff` before
  committing — a vendored copy may carry local polish that a blind pull would overwrite.
- Don't mirror whole upstream collections: vendor only the skills you curated, and keep
  the originals installable from their own source.

## Modifying a skill

- After content changes you must update `computedHash` in `skills-lock.json`:
  sha256(concatenation of relativePath+content, files sorted by relative path); a
  directory move only changes `skillPath`, the hash stays the same
- Keep a single source of truth for every meaning: shared logic goes into category-level
  scripts/contracts, not copies in each skill

## Validation

- Run `npx skills add <repo> --list` in a temp directory to confirm discovery and
  grouping; do **not** install globally
- Validate locally inside the project directory (project-level), don't pollute the
  global skills directory
