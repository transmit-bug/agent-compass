# Screen Map — the durable UI context

`.midscene/screens.md` in the project cwd: what past sessions learned about an app's screens,
kept for the next session. It is **committed** (team-shared durable context) while the rest
of `.midscene/` is runtime debris — see the setup skill for the exact `.gitignore` pattern.
Desktop screens cannot be enumerated from source — there are no routes — so the map is
**built by traversal**: entries appear on first verified encounter and are merged at
`finish`, never plan-written.

What it buys:

- **Route planning** — a long task is planned as an anchor sequence before the first `act`.
- **Verbatim prompts** — assertions key the daemon's persistent cache on exact prompt +
  same screen; proven wording is a zero-LLM hit and repeatability.
- **No re-exploration** — later sessions skip failed paths and re-discovery.

## File shape

```markdown
# Screen map

## Apps
- <app>: launch with `open -a <App>` / `start <App>` (or a project-specific command)

## <app> — <screen>
- anchor: assert "<prompt that confirms arrival>"
- from <screen>: act "<whole-flow prompt that performed the leg>" (verified YYYY-MM-DD)
- ops:
  - act "<whole-flow prompt>" → <one-line outcome> (verified YYYY-MM-DD)
- gotchas: <transient UI → record pattern; slow dialog; focus stealing>
```

- **Apps** — how each app is launched (recorded once, at setup or first use; never re-ask).
- **anchor** — an `assert` prompt that confirms you are on this screen. Derive it from the
  flow's expected effect, not from reading pixels; assert it on arrival, before trusting any
  edge or op of the screen. Anchors are the map's cache currency — keep them verbatim.
- **from / ops** — the proven **flow-level** prompts (whole legs, per the one-act-per-flow
  rule), **verbatim**. Paraphrasing breaks the cache hit and re-runs the experiment.
- **gotchas** — what cost a retry: toasts (verify with `record` + `assert --record`), slow
  loads, dialogs that steal focus.

## Write discipline

- A screen enters the map only after an `assert` confirmed you are on it and its edges/ops
  actually ran — first verified encounter only. No pixel-reading is required to write an
  entry: anchors come from flow semantics, ops from what ran.
- At `finish`, merge while fresh: new screens, updated prompts, corrected gotchas. The
  session archive keeps the run detail; the map keeps only what generalizes.
- Multiple apps in one cwd are fine — namespace by the `## <app> — <screen>` header.

## Staleness

Desktop apps update with no diff to review, so entries rot silently. Every edge and op
carries `verified <date>`; an old date, or a known app update since, downgrades the entry to
a **hint**: re-`assert` the anchor before reusing an edge, and when an anchor fails,
re-explore and rewrite the entry in the same session.
