# Session Model — the agent-browser suite contract

Shared disclosed reference for the `agent-browser` skill category. Every business skill
(`web-dev`, `web-checker`, `web-fixer`, `web-smoke`, `web-maintain`) operates on this model.
The command surface for driving the browser lives in the CLI (`agent-browser skills get core`);
this file owns the **run** model, storage, and lifecycle.

## Principles

1. **Structure-first, vision-on-demand** — perceive pages through the DOM/accessibility tree
   by default; use pixels only when the task is appearance, the content has no DOM (canvas),
   or a human needs evidence.
2. **Determinism in scripts, judgment in the agent** — anything computable (staleness,
   retention, index rendering) is scripted; the agent decides what the computed facts mean.
3. **CLI is the reference** — never hardcode command details in skills; load
   `agent-browser skills get core` for the authoritative surface.
4. **Git is the archive** — the index carries only the current state plus a retention window;
   the durable record of "what was tested, when" is the app repo's git history.

## Perception ladder

| Level | Command | Answers |
|---|---|---|
| 1 structure | `snapshot -i` (accessibility tree + `@eN` refs) | layout, elements, roles, hierarchy |
| 2 content | `read`, `get text/attr/value/count/title/url` | rendered content, values, state |
| 3 compute | `eval --stdin` (JS) | derived state: counts, computed styles, conditions |
| 4 health | `console`, `errors --bail` | page logs and errors — deterministic, zero LLM |
| 5 pixels | `screenshot [--annotate]` | only: appearance tasks, DOM-less content, human evidence |

Discipline: after any page-changing action, `wait` (element / `--text` / `--url` / `--fn`)
then re-`snapshot` — refs go stale the moment the page changes. Prefer deterministic
assertions (`wait --text`, `get count`, `eval` returning a boolean, `errors --bail`) for
pass/fail; reserve LLM judgment for ambiguity (the **Unsure** verdict).

## Run model

A **run** is one traceable verification unit: `{worktree, app, slug, skill, branch, commit,
startedAt}`. Slug = `<app>-<flow>`. Runs are keyed per worktree (`git rev-parse
--show-toplevel`) so parallel projects never collide.

Lifecycle: `running → complete | failed | aborted → superseded | stale → forgotten`.

- **Supersede is a chain, not an overwrite**: a new run for the same slug marks the previous
  complete run `supersededBy = <new id>`; the old entry stays until forgotten.
- **Write-as-you-go**: every checkpoint verdict is recorded immediately — an interrupted run
  (`status: aborted`) is a legal state with its completed checkpoints preserved.
- **Stale** is a verdict about the record (the verified content has drifted), set by the
  staleness scan — never deleted automatically.

## Storage layout

```
<app-repo>/
├── .agent-browser/            # committed — small, important state
│   ├── manifest.json          # deterministic-engine config (optional; defaults apply)
│   ├── index.json             # machine index (script-read/written)
│   ├── index.md               # human view, rendered from index.json
│   └── flows/*.md             # repeatable flow recipes (prose intent)
└── .agent-browser/runs/       # gitignored — bulky evidence
    └── <app>/<slug>/
        ├── run.json           # single source of truth for the run
        ├── structure/         # primary evidence: snapshots, read excerpts, eval output
        ├── shots/             # branch evidence: screenshots
        ├── traces/            # diagnostics: har, vitals
        └── report.md          # human report, rendered from run.json
```

Add `.agent-browser/runs/` to the app repo's `.gitignore` once at setup.

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
  "uiSurface": ["src/components/**", "src/pages/**", "src/styles/**", "*.tsx"],
  "uiKeywords": ["feat", "fix", "redesign", "ui", "style", "layout", "component"],
  "uiDeps": ["react", "next", "antd", "tailwindcss"],
  "thresholds": { "maxAttempts": 3, "staleSinceDays": 30, "keepRuns": 5, "commitHorizon": 50 }
}
```

Defaults apply when a key is missing. `uiSurface` globs, `uiKeywords`, and `uiDeps` feed the
staleness scan; `thresholds` feed both the scan and the retention tidy.

## Scripts

Both scripts run from the app repo root; they operate on `.agent-browser/` and the app's git.
They only compute and store — they never decide.

### agent-browser-run — run lifecycle

| Command | Effect |
|---|---|
| `agent-browser-run start <app> <flow> [--skill <name>]` | create run dir, capture branch/commit, supersede previous complete run, register in index |
| `agent-browser-run checkpoint <app> <flow> --json '<{step, method, expected, actual, verdict, evidence}>'` | append a verdict (write-as-you-go), re-render index.md |
| `agent-browser-run finish <app> <flow> --status <complete\|failed\|aborted>` | set terminal state, render report.md + index.md |
| `agent-browser-run ls [app]` / `show <slug>` | list runs / show one run's JSON |
| `agent-browser-run prune --evidence <days> --keep <K>` | explicit evidence cleanup (index untouched) |

Verdicts are per-checkpoint: `pass` / `fail` / `unsure`. Overall verdict at finish:
any `fail` → `fail`; else any `unsure` → `unsure`; else `pass`.

### agent-browser-stale — staleness scan + retention tidy

| Command | Effect |
|---|---|
| `agent-browser-stale scan [--since <days>]` | deterministic staleness scan; prints a JSON list of stale runs with reasons |
| `agent-browser-stale tidy [--dry-run]` / `--apply` | selective forgetting per retention policy; dry-run previews |

Staleness signals (scan): **strong** — changed files intersect `uiSurface`, commit subjects
hit `uiKeywords`, or `uiDeps` bumped in package.json since the run's commit; **weak** —
run older than `staleSinceDays` without a rerun.

Forgetting triggers (tidy): superseded and outside the `keepRuns` window of its
app+slug; or commits since the run's commit exceed `commitHorizon` (the verified content
was rewritten); or stale by age with no newer run. Forgotten = removed from the index and
the run's evidence pruned together — git remains the record.

## Evidence

Primary evidence is structural: per-checkpoint `snapshot`/`read`/`eval` outputs saved under
`structure/`. Screenshots under `shots/` are for the visual branch and for human review.
Reports never end silently.
