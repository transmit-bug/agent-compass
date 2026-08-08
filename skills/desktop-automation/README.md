# desktop-automation — desktop-application automation

Drive, verify, and fix desktop applications through their UI. Vision-driven (Midscene),
split into an operation layer and business layers with one-way dependencies.

| Skill | Layer | What it does |
|-------|-------|--------------|
| [computer-automation](./computer-automation/) | operation | Persistent session daemon, diff-gated screenshots, archived reports |
| [uichecker](./uichecker/) | business | Judge screen against ground truth, one verdict per checkpoint |
| [ui-fixer](./ui-fixer/) | business | Fix a running app's UI until live screen matches a reference image |
| [smoke-runner](./smoke-runner/) | business | Launch a build and drive the core flow end-to-end with PASS/FAIL |

Business skills depend on `computer-automation` and are user-invoked
(`disable-model-invocation: true`). New workflows built on the session commands
(`mid.sh start / shot / act / assert / finish`) belong in this category — check, fix,
smoke, and future automated testing.
