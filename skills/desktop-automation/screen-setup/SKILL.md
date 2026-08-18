---
name: screen-setup
description: Onboard a project into the desktop-automation suite — verify dependencies and macOS permissions, check model config, write the .gitignore split (ignore runtime, keep the screen map), and scaffold .midscene/screens.md with the app launch facts. Use once per project before the first session, or when the environment changed.
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
---

# Screen Setup (business layer)

One-time configuration and hygiene for the desktop-automation suite in a project: checks
what only a machine can check, asks what only the user knows, writes what every later
session reads. Invoked by name — "use screen-setup on this project". Runs once per project;
re-running is safe (every step is idempotent and skips what already passes).

This is **not** app onboarding in the web sense — desktop apps have no enumerable routes to
scaffold. The deliverable is: a passing environment, a `.gitignore` that keeps the durable
screen map while dropping runtime debris, and a `screens.md` skeleton with launch facts.
The screen map itself is built by traversal in later sessions (screen-verify owns the
contract). The machinery — `mid.sh`, the daemon, the persistent cache — is
**computer-automation**'s: invoke it by name alongside this one whenever a step needs the
daemon.

## Steps

1. **Check dependencies.** All of: `node` ≥ 18, `python3` with Pillow, `@midscene/computer`
   resolvable (project `node_modules` via `npm ls @midscene/computer`, or machine-wide via
   `npm ls -g @midscene/computer`); ImageMagick `compare` only if the user plans to run
   screen-checker / screen-fixer. Install what is missing with the user's go-ahead — each is
   a machine-level change.
   *Done when: every required dependency answers its version command, or the user has
   explicitly declined one and the consequence is recorded.*

2. **Check capture permissions** (the #1 first-run failure). macOS: accessibility and
   screen-recording permission for the terminal that will run the daemon. Linux/X11: a
   reachable `DISPLAY` — the daemon inherits it at start, so confirm it before starting
   (and restart the daemon after display changes). Attempt a real capture via the daemon
   (`mid.sh agent start` then `mid.sh shot setup-check` — a black, blank, or failing
   capture means locked screen, missing permission, or wrong display). If the check
   fails, fix the cause (System Settings → Privacy & Security on macOS; correct `DISPLAY`
   on Linux), have the user restart the terminal where relevant, re-run until the capture
   succeeds, then `mid.sh agent stop`.
   *Done when: a screenshot is captured successfully on this machine.*

3. **Check model config.** `.env` in the project cwd must contain `MIDSCENE_MODEL_API_KEY`
   (plus `MIDSCENE_MODEL_NAME` / `BASE_URL` / `FAMILY` as the provider requires). If absent,
   show the key list, ask the user to fill `.env` themselves (the key never enters the
   transcript), and confirm the daemon loads it (`mid.sh agent start` → a trivial
   `mid.sh assert "the screen shows a desktop"` → `mid.sh agent stop`). Then verify verdict
   integrity: assert a statement whose truth you control locally (paint the root window a
   solid color, open a known dialog) — the verdict must agree with it. If a true statement
   comes back `VERDICT: UNRELIABLE` or FAIL with an empty thought, the SDK cannot parse this
   model's answers: record the model+SDK combo as a known-issue hint in the map's Hints
   section and report it — every later verdict routes through this oracle, so stop here
   rather than bless a broken pipeline.
   *Done when: one assertion round-trips through the configured model and agrees with the
   locally known truth.*

4. **Write the .gitignore split.** The screen map is committed; session archives, the
   daemon's cache, and logs are not. Directories cannot be re-included once ignored, so the
   pattern must ignore the children, then except the map — append exactly:
   ```gitignore
   .midscene/*
   !.midscene/screens.md
   ```
   Skip when the pattern (or an equivalent that keeps `screens.md` tracked) is already
   present; never blanket-ignore `.midscene/` — that would bury the map.
   *Done when: `git check-ignore .midscene/screens.md` fails (not ignored) while
   `git check-ignore .midscene/.cache.json` succeeds.*

5. **Scaffold the screen map.** If `.midscene/screens.md` does not exist, ask the user which
   app(s) this project automates and how each is launched (`open -a <App>` / `start <App>`
   / a project command). Create the file with the `# Screen map` header, an `## Apps`
   section holding one launch line per app, a `## Hints` section of code-derived screen/
   transition expectations when the app's source is readable, and empty screen sections to
   be filled by traversal. If it exists, verify the Apps section covers the named apps.
   *Done when: `.midscene/screens.md` exists, is git-trackable, and lists a launch command
   for every app the user named.*

6. **Report.** What passed, what was installed, what the user must still do (restart
   terminal after permission grants, fill a missing key), and the next step — usually a
   first session with screen-smoke or screen-checker.
   *Done when: the report names every check with a verdict and the next step.*

## Judgment

- **Check, don't assume.** A permission granted yesterday to another terminal does not
  cover this one; run the actual capture. The one assertion in step 3 is the only paid AI
  call in setup — it exists to prove the model config end-to-end.
- **Secrets stay with the user.** The API key is typed into `.env` by the user; setup only
  checks presence, never contents or values.
- **Delta only.** If the project already has docs naming the launch commands or auth facts,
  link them from the map's Apps section instead of restating.
