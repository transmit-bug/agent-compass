---
name: web-router
description: Route a web-app lifecycle ask to the right agent-browser skill. Use when the user asks which web skill fits a task, how to proceed with a web app (develop, check, fix, smoke-test, maintain, assess), where a web app stands, or what to verify next.
allowed-tools:
  - Read
---

# Web Router — the deriving entry for the agent-browser suite

Model-invoked routing entry. The business skills stay user-invoked and directly callable —
this router is an optional on-ramp for orientation, never a gate, and no sequence is enforced
after it runs. The lifecycle arc is a map, not a pipeline.

## Route — the arc, anchored

The table is the route's shape only. The gloss is each skill's own frontmatter description —
read them, they are canonical; the route is re-derived every time, never memorized.

| Ask | Route |
|---|---|
| Implement / develop a feature | web-dev |
| Match / quality verdict on a rendered page | web-checker |
| Business-logic review + test cases | web-logic |
| Fix until the page matches | web-fixer |
| Core-flow end-to-end verification | web-smoke |
| Staleness / tidy / what drifted | web-maintain |
| "Where does the app stand?" | orient doc first, then the stage's skill |
| Ambiguous ask | orient doc + most stale item |

## Steps

1. **Read the map.** The group `README.md` is the index; every `web-*/SKILL.md` frontmatter
   `description` is the canonical gloss. Build the route from what they say — never from
   memory of a previous routing.
   *Done when: you can name what each skill does in the ask's own terms.*
2. **Read the orient doc.** The app's `.agent-browser/index.md`: derived status, next
   actions, assessment gists. This answers "where does the app stand" and what is stale,
   failing, or blocked. (The app repo is the user's cwd or the one they named.)
   *Done when: you know the app's current status and its stale/failing/blocked items.*
3. **Classify the ask onto the arc.** Match the user's intent to one route; check the match
   against that skill's own description. One slice ≈ one session — recommend one skill, not
   a tour.
   *Done when: exactly one skill + its entry step fits, or the ask is genuinely ambiguous.*
4. **Recommend and point, then stop.** Name the skill and its entry step; for lifecycle
   asks, name the orient-doc next action (stale → re-verify, failing → check/fix, blocked →
   resolve the blocker). Never fire the skill yourself — the user invokes it by name.
   *Done when: the recommendation names the skill, its entry step, and the next action; no
   skill was run.*

## Reference

- **Entry, not gate** — routing never blocks a skill the user already named; the router only
  orients.
- **Drift-proof by construction** — the route follows each skill's frontmatter; when a
  description changes, the router follows automatically.
- **Ambiguity** — an ask that maps to more than one skill routes to the orient doc and the
  most stale item; the derived status picks the next slice.
