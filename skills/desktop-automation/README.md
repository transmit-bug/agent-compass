# desktop-automation — desktop-application automation

Drive, verify, and fix desktop applications through their UI. Vision-driven (Midscene),
instantiating the category blueprint: an operation layer, a model-invoked primitive owning
the verification discipline, and user-invoked business skills that share one opening.

| Skill | Layer | What it does |
|-------|-------|--------------|
| [computer-automation](./computer-automation/) | operation | Persistent session daemon, diff-gated screenshots, archived reports (`mid.sh`) |
| [screen-verify](./screen-verify/) | primitive | Verification discipline: verdicts, evidence, screen map, act-vs-ask |
| [screen-checker](./screen-checker/) | business | Judge screen against ground truth, one verdict per checkpoint |
| [screen-fixer](./screen-fixer/) | business | Fix a running app's UI until live screen matches a reference image |
| [screen-smoke](./screen-smoke/) | business | Launch a build and drive the core flow end-to-end with PASS/FAIL |

The `screen-*` skills are user-invoked (`disable-model-invocation: true`), share the same
opening — "run the screen-verify discipline … invoke computer-automation by name alongside
this one" — and depend one-way on the layers below. `screen-verify` is model-invoked by
design (its value is automatic reach). New workflows built on the `mid.sh` session commands
belong here as `screen-<name>` business skills.
