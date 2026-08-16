# Session Model — the agent-browser suite contract

Shared disclosed reference for the `agent-browser` skill category, **owned by web-verify**
(the suite's verification primitive). Every mode skill (`web-dev`, `web-checker`,
`web-fixer`, `web-smoke`, `web-maintain`, `web-logic`) operates on this model; mode skills
reach it through web-verify, never by direct pointer. The command surface for driving the
browser lives in the CLI (`agent-browser skills get core`); this file owns the **run**
model, records, storage, lifecycle, and the orient doc.

## Principles

1. **Structure-first, vision-on-demand** — perceive pages through the DOM/accessibility tree
   by default; use pixels only when the task is appearance, the content has no DOM (canvas),
   or a human needs evidence.
2. **Determinism in scripts, judgment in the agent** — anything computable (staleness,
   retention, index rendering, status derivation) is scripted; the agent decides what the
   computed facts mean.
3. **CLI is the reference** — never hardcode command details in skills; load
   `agent-browser skills get core` for the authoritative surface.
4. **Git is the archive** — the index carries only the current state plus a retention window;
   the durable record of "what was tested, when" is the app repo's git history.
5. **Records only** — the index stores facts (what was done, results), never stage state or
   verdicts about the future; every view is derived deterministically (see *Records &
   derived views*).

## Perception ladder

| Level | Command | Answers |
|---|---|---|
| 1 structure | `snapshot -i` (accessibility tree + `@eN` refs) | layout, elements, roles, hierarchy |
| 2 content | `read`, `get text/attr/value/count/title/url` | rendered content, values, state |
| 3 compute | `eval --stdin` (JS) | derived state: counts, computed styles, conditions |
| 4 health | `console`, `errors` | page logs and errors — deterministic, zero LLM |
| 5 pixels | `screenshot [--annotate]` | only: appearance tasks, DOM-less content, human evidence |

Discipline: after any page-changing action, `wait` (element / `--text` / `--url` / `--fn`)
then re-`snapshot` — refs go stale the moment the page changes. Prefer deterministic
assertions (`wait --text`, `get count`, `eval` returning a boolean, `errors` empty) for
pass/fail; reserve LLM judgment for ambiguity (the **Unsure** verdict).

## Run model

A **run** is one traceable verification unit: `{worktree, app, slug, skill, branch, commit,
startedAt}`. `slug` is the flow name; the run `id` is `<app>-<flow>@<timestamp>`. Runs are
keyed per worktree (`git rev-parse --show-toplevel`) and per app+flow, so parallel projects
never collide.

Lifecycle: `running → complete | failed | aborted → superseded | stale → forgotten`.

- **Supersede is a chain, not an overwrite**: a new run for the same slug marks the previous
  complete run `supersededBy = <new id>`; the old entry stays until forgotten.
- **Write-as-you-go**: every checkpoint verdict is recorded immediately — an interrupted run
  (`status: aborted`) is a legal state with its completed checkpoints preserved.
- **Stale** is a verdict about the record (the verified content has drifted), set by the
  staleness scan — never deleted automatically.

## Records & derived views

`index.json` stores **records only**, in two lists:

- **Runs** — the latest run per app+flow: `{id, app, slug, skill, branch, commit, status,
  verdict, startedAt, finishedAt, stale, supersededBy, ticket?, blockers?, provenance?}`.
  `ticket` is the flow's tracker ref (`#<n>` in the app repo's own tracker); `blockers` is
  a list of open refs the flow waits on; `provenance` is the list of source files the
  verification rests on (web-logic records its plan's source files) — it feeds the
  staleness scan, so a logic-relevant code change flags the run stale.
- **Assessments** — holistic review per scope: `{app, scope, assessedAt, completeness,
  logic, flow, ui, gist}`. Scope is a feature name, or `app` for app-level concerns. Verdict
  kinds: `completeness: complete|partial|missing`, `logic: clear|ambiguous|contradictory`,
  `flow: sound|awkward|broken`, `ui: reasonable|ineffective|broken`. `gist` is the one-line
  summary; durable detail is linked, not pasted (see *Anti-rot*).

Everything else is **derived, never stored**: the status table, the orient doc, and the
per-feature **stage** (dev / check / fix / smoke / maintain / logic — from the latest run's
skill). Status is derived by precedence, worst first:

| Status | Derived when (latest run per app+flow) |
|---|---|
| not-started | no run recorded (and no record → no row; the agent derives this from open tracker tickets) |
| in-progress | latest run `running` / `aborted` / `failed`, or verdict `unsure` (unconcluded) |
| blocked | latest run carries `blockers` |
| stale | latest run flagged `stale` by the scan |
| failing | latest complete verdict `fail` |
| verified | latest complete verdict `pass` |

An assessment whose latest gist-kind is a concern (`missing` / `contradictory` / `broken`)
flags the feature in the orient doc and next actions; it does not change status precedence.

### Re-test policy — automatic, recorded

- **Code changed since a run** → the run is stale (strong: its provenance files or the UI
  surface changed, UI keywords hit, UI deps bumped) → **re-verify before trust**, by the
  owning skill; the new run supersedes the old.
- **New feature** (open tracker ticket, no run records) → not-started: establish its tests
  with the owning skill during orientation.
- **Old records** (no rerun past `staleSinceDays`) → weak-stale → re-verified the same way.
- Re-verification is **automatic** — the autonomy contract, not a question. Ask the user
  only for irreversible steps: tidy drops of non-superseded records, destructive actions.

## Orient doc

`index.md` is the **orient doc**: derived from records by the scripts, never hand-edited. A
fresh session reads it first (web-router's orient step), then acts. Sections:

1. **Status** — one row per app+flow: stage, derived status, last verified, verdict, notes
   (blockers / assessment concern / ticket ref).
2. **Assessments** — latest per scope with all four verdict kinds + gist.
3. **Next actions (derived)** — per status: stale → re-verify, failing → check/fix, blocked →
   resolve blockers, in-progress → resume; assessment concerns; open ticket refs collected
   from records (the agent consults the app tracker for their state).
4. **Expectations** — the reusable ground truths (`expectations/*.md`) available to pin from.
5. **Scenarios** — the plan/recipe library (`docs/agent-browser/scenarios/`, index first)
   under its own section, available to run or extend.
6. **Durable docs** — the rest of `docs/agent-browser/` (app notes, assessment reports);
   scenarios are excluded, they have their own section.
7. **Recent runs** — the recent-window trace.

Durable human-facing docs (flow recipes, assessment reports, app notes) live in the app
repo's `docs/agent-browser/`; the orient doc links them, never inlines them.

## Anti-rot

The suite's continuation depends on records that stay true:

- **Gists and links** — a record carries a one-line gist; detail is linked (a durable doc, a
  tracker ref), never pasted into the record.
- **No file paths in durable artifacts** — records and the orient doc carry links and refs,
  not paths that decay; evidence paths stay inside run records, where the run's own tree
  defines them.
- **Never re-ask** — a question answered once is recorded; the next session reads the answer
  instead of asking again. The answer's home: the relevant durable doc's Decisions section
  (`docs/agent-browser/app-notes.md`), an expectation, or an assessment gist.

## Storage layout

```
<app-repo>/
├── .agent-browser/            # committed — small, important state
│   ├── manifest.json          # deterministic-engine config (optional; defaults apply)
│   ├── index.json             # machine index (script-read/written; records only)
│   ├── index.md               # orient doc, rendered from index.json
│   ├── expectations/*.md      # reusable ground truth (web-checker / web-fixer)
└── .agent-browser/runs/       # gitignored — bulky evidence
    └── <app>/<slug>/
        ├── run.json           # single source of truth for the run
        ├── structure/         # primary evidence: snapshots, read excerpts, eval output
        ├── shots/             # branch evidence: screenshots
        ├── traces/            # diagnostics: har, vitals
        └── report.md          # human report, rendered from run.json

Evidence is per-flow, one working set — the latest run's; a superseded run's verdicts live
in its index record, and git is the archive (run dirs are gitignored by design).

docs/agent-browser/             # committed — durable knowledge (git-tracked)
├── app-notes.md                # how to run, decisions (web-setup)
└── scenarios/                  # the scenario library (web-logic / web-smoke)
    ├── README.md               # navigation index (id → what, priority, depends)
    ├── smoke/ · setup/ · business/ · flows/
    └── <category>/<id>.md      # one scenario per file, frontmatter-led
```

Add `.agent-browser/runs/` to the app repo's `.gitignore` once at setup.

**Expectations** (`expectations/*.md`) are reusable ground truths — expected structure,
states, and reference-image pointers for a scope (page, flow, or app). web-checker pins
from them instead of re-asking; web-fixer converges to them; a new one is written when a
check recurs and none exists. They are the shared reference for recurring checks — the
counterpart of `flows/` (sequences) for states.

**Scenarios** (`docs/agent-browser/scenarios/`) are the durable plans and recipes the suite
executes — the unit a run verifies. One markdown artifact, organized by category and
composed by reference (see *Scenarios*); written by web-logic (derived logic plans, before
execution), web-smoke (defined flows), and any skill that records a reusable case.

## Scenarios

`docs/agent-browser/scenarios/` is the durable plan home. Durable knowledge lives in
`docs/agent-browser/` (git-tracked) while `.agent-browser/` holds state — plans no longer
live with the state. Each scenario is one markdown document with frontmatter; the suite
never duplicates one meaning across two scenarios.

Layout (the category is the navigation axis):

| Directory | What lives there | Written by | Verdict |
|---|---|---|---|
| `smoke/` | pages load, no white screen / error overlay | web-smoke | pass/fail per page |
| `setup/` | preconditions & fixtures (connect, seed data) — no standalone verdict | web-logic | — |
| `business/` | one domain's logic: plan entries + test cases | web-logic | per case |
| `flows/` | user journeys: thin compositions of the above | web-smoke | overall |

`scenarios/README.md` is the navigation index (id → what, priority, depends); keep it in
sync when adding a scenario. Frontmatter: `id` (unique kebab), `category`, `priority`
(critical | high | medium | low), `depends` (scenario ids composed), `provenance` (source
files the scenario rests on). Body: `Initial state` → `Steps` (action + expected) →
`Success criteria` → `Cases` (business only).

Composition is by reference, resolved by the agent at run time (`depends` /
`<!-- include: setup/... -->`): a `flows/` scenario references business scenarios and
never restates their rules; preconditions live in `setup/`. Provenance is the staleness
hook: a changed provenance file makes every scenario resting on it stale — re-derive with
web-logic before trusting its verdicts.

## Content doctrine

- **Intent** (what to do, when it is good enough) → **Markdown** prose; the agent executes
  intent with judgment, so variability survives.
- **Records** (what was done, results) → **JSON**; fixed shape is what makes execution
  traces diffable and scriptable.
- **Engine config** (staleness parameters) → **small JSON** (`manifest.json`), machine-read.
- A flow written as JSON becomes a command list; written as Markdown it stays intent.

## manifest.json (optional)

```jsonc
{
  "app": "pacsviewer",
  "uiSurface": ["src/**", "components/**", "pages/**", "app/**", "*.tsx", "*.jsx", "*.vue", "*.css", "*.scss"],
  "uiKeywords": ["feat", "fix", "redesign", "ui", "style", "layout", "component", "visual"],
  "uiDeps": ["react", "next", "vue", "svelte", "angular", "antd", "tailwind", "chakra", "mantine"],
  "thresholds": { "maxAttempts": 3, "staleSinceDays": 30, "keepRuns": 5, "commitHorizon": 50 }
}
```

Defaults apply when a key is missing (they match the scan script's `DEFAULTS`).
`uiSurface` globs, `uiKeywords`, and `uiDeps` feed the staleness scan; `thresholds` feed both
the scan and the retention tidy.

## Scripts

Both scripts ship with the **web-verify** skill and are bootstrapped by web-setup into the
app repo's `.agent-browser/scripts/` (the state home is self-contained: skills installs only
carry SKILL.md per skill, so the machinery lives with the state). Invoke them from the app
repo root as `.agent-browser/scripts/agent-browser-run …` (short form `agent-browser-run`
in this document). They operate on `.agent-browser/` and the app's git; they only compute
and store — they never decide. They share one renderer
(`agent_browser_common.py`) for the orient doc.

### agent-browser-run — run lifecycle

| Command | Effect |
|---|---|
| `agent-browser-run init` | scaffold `.agent-browser/` (empty records + orient doc) and append `.agent-browser/runs/` to `.gitignore` — idempotent |
| `agent-browser-run start <app> <flow> [--skill <name>] [--ticket <ref>] [--blocked-by <ref,…>] [--provenance <files,…>]` | create run dir, capture branch/commit, supersede previous complete run, register in index |
| `agent-browser-run checkpoint <app> <flow> --json '<{step, method, expected, actual, verdict, evidence}>'` | append a verdict (write-as-you-go), re-render index.md |
| `agent-browser-run assess <app> <scope> --json '<{completeness, logic, flow, ui, gist}>'` | record a structured assessment (scope = feature or `app`), re-render index.md |
| `agent-browser-run finish <app> <flow> --status <complete\|failed\|aborted>` | set terminal state, render report.md + index.md |
| `agent-browser-run ls [app]` / `show <flow>` | list runs / show one flow's latest run JSON |
| `agent-browser-run prune --evidence <days> --keep <K>` | explicit evidence cleanup (index untouched) |

Verdicts are per-checkpoint: `pass` / `fail` / `unsure`. Overall verdict at finish:
any `fail` → `fail`; else any `unsure` → `unsure`; else `pass`.

### agent-browser-stale — staleness scan + retention tidy

| Command | Effect |
|---|---|
| `agent-browser-stale scan [--since <days>] [--mark]` | deterministic staleness scan; prints the stale list. `--mark` also records the computed staleness facts on the index records and re-renders the orient doc |
| `agent-browser-stale tidy [--dry-run]` / `--apply` | selective forgetting per retention policy; dry-run previews |

Staleness signals (scan): **strong** — changed files intersect the run's `provenance`
(`reason: provenance-change`) or `uiSurface` (`reason: ui-change`), commit subjects hit
`uiKeywords`, or `uiDeps` bumped in package.json since the run's commit; **weak** — run
older than `staleSinceDays` without a rerun.

Forgetting triggers (tidy): superseded and outside the `keepRuns` window of its
app+slug; or commits since the run's commit exceed `commitHorizon` (the verified content
was rewritten); or stale by age with no newer run. Forgotten = removed from the index and
the run's evidence pruned together — git remains the record.

## Evidence

Primary evidence is structural: per-checkpoint `snapshot`/`read`/`eval` outputs saved under
`structure/`. Screenshots under `shots/` are for the visual branch and for human review.
Reports never end silently. Trust: screenshots may carry sensitive content — auth through
the vault (`agent-browser auth login <name>`), never echo secrets; launch sensitive targets
with `--allowed-domains` to contain the browser.
