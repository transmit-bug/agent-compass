# Screen Map — the durable UI context

`.midscene/screens.md` in the project cwd: what past sessions learned about an app's screens,
kept for the next session. It survives session rotation (only `.midscene/<slug>/` directories
are cleaned). Desktop screens cannot be enumerated from source — there are no routes — so the
map is **built by traversal**: entries appear on first verified encounter and are merged at
`finish`, never plan-written.

What it buys:

- **Route planning** — a long task is planned as a screen sequence before the first `act`.
- **Verbatim prompts** — the daemon's persistent cache keys on exact prompt + same screen;
  proven wording is a zero-LLM hit, and repeatability.
- **No re-exploration** — later sessions skip failed paths and re-discovery.

## Entry format

One section per screen, namespaced by app:

```markdown
## <app> — <screen>
- anchor: assert "<prompt that confirms arrival>"
- from <screen>: act "<exact prompt that performed the transition>" (verified YYYY-MM-DD)
- ops:
  - act "<exact prompt>" → <one-line outcome> (verified YYYY-MM-DD)
- gotchas: <transient UI → record pattern; slow dialog; focus stealing>
```

- **anchor** — an `assert` prompt that confirms you are on this screen. Assert it on arrival,
  before trusting any edge or op of the screen.
- **from / ops** — the proven prompts, **verbatim**. Paraphrasing breaks the cache hit and
  re-runs the experiment.
- **gotchas** — what cost a retry: toasts (verify with `record` + `assert --record`), slow
  loads, dialogs that steal focus.

## Write discipline

- A screen enters the map only after an `assert` confirmed you are on it and its edges/ops
  actually ran — first verified encounter only.
- At `finish`, merge while fresh: new screens, updated prompts, corrected gotchas. The
  session archive keeps the run detail; the map keeps only what generalizes.
- Multiple apps in one cwd are fine — namespace by the `## <app> — <screen>` header.

## Staleness

Desktop apps update with no diff to review, so entries rot silently. Every edge and op
carries `verified <date>`; an old date, or a known app update since, downgrades the entry to
a **hint**: re-`assert` the anchor before reusing an edge, and when an anchor fails,
re-explore and rewrite the entry in the same session.
