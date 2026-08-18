# Screen Map — the durable UI context

`.midscene/screens.md` in the project cwd: what past sessions learned about an app's screens,
kept for the next session. It is **committed** (team-shared durable context) while the rest
of `.midscene/` is runtime debris — see the setup skill for the exact `.gitignore` pattern.
Desktop screens cannot be enumerated from source — there are no routes — so the map is
**built by traversal**: entries appear on first verified encounter and are merged at
`finish`, never plan-written.

What it buys:

- **Route planning** — a long task is planned as an anchor sequence before the first `act`.
- **Cold start** — code-derived **hints** (screens, elements, transitions read from the
  source) give the first session a route hypothesis and element vocabulary instead of
  blind probing.
- **Verbatim prompts** — assertions key the daemon's persistent cache on exact prompt +
  same screen; proven wording is a zero-LLM hit and repeatability.
- **No re-exploration** — later sessions skip failed paths and re-discovery.

## File shape

```markdown
# Screen map

## Apps
- <app>: launch with `open -a <App>` / `start <App>` (or a project-specific command)

## Hints — code-derived, never executed
- <app> — <screen>: expect <key elements / function>; reachable from <screen> via
  <transition> (derived YYYY-MM-DD from <routes.ts / menus / window registration>)

## <app> — <screen>
- anchor: assert "<prompt that confirms arrival>"
- from <screen>: act "<whole-flow prompt that performed the leg>" (verified YYYY-MM-DD)
- ops:
  - act "<whole-flow prompt>" → <one-line outcome> (verified YYYY-MM-DD)
- gotchas: <transient UI → record pattern; slow dialog; focus stealing>
```

- **Apps** — how each app is launched (recorded once, at setup or first use; never re-ask).
- **Hints** — assumptions read from the source before anything ran: screens that should
  exist, their key elements, the transitions between them. They inform planning and prompt
  phrasing — never claimed as cache hits or proven routes. Promotion is by execution: the
  first verified encounter moves the expectation into a real `## <app> — <screen>` section
  (anchor + edges), and the hint line is deleted. A disproven hint is deleted outright.
  For black-box apps (no readable source), skip the layer — traversal is the only teacher.
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
a **hint**: run `mid.sh cache invalidate "<anchor prompt>"`, then re-`assert` the anchor
**verbatim** — the invalidate drops the cached verdict while keeping the wording (and its
future cache hits) intact, so a fresh verdict costs one AI call, not a re-worded experiment.
When the anchor fails, re-explore and rewrite the entry in the same session.
