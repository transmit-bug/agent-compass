# Command Reference — `@midscene/computer@1`

Extended reference for the operation-layer skill `computer-automation`. The session loop in
SKILL.md is the preferred path; this file covers the **stateless CLI** (`npx -y
@midscene/computer@1`) in full — every command is a fresh node process that reconnects, so
repeat target flags (`--displayId`, or RDP `--host/--username/--password/...`) on every call.
Model configuration (`MIDSCENE_MODEL_*` in `.env`) is assumed in place.

## Connect (local desktop)

```bash
npx -y @midscene/computer@1 connect
npx -y @midscene/computer@1 connect --displayId <id>   # a specific display
```

## Connect via RDP

RDP mode drives a **remote Windows desktop**; the local mouse/keyboard is **not** touched.
Setting `--host` switches `connect` to RDP and routes every subsequent command through the
RDP helper bundled with `@midscene/computer`.

```bash
npx -y @midscene/computer@1 connect \
  --host rdp.example.com \
  --username Administrator \
  --password "$RDP_PASSWORD"
```

RDP flags for `connect` (`--host` activates RDP mode; others optional):

- `--host <fqdn-or-ip>` — RDP host. Required to enter RDP mode.
- `--port <number>` — RDP port (default `3389`).
- `--username <user>` — RDP user account.
- `--password <secret>` — RDP password. Prefer an environment variable or secret manager;
  never paste it into a shared transcript.
- `--domain <domain>` — Active Directory / NTLM domain.
- `--security-protocol <auto|tls|nla|rdp>` — negotiation (default `auto`).
- `--ignore-certificate` — skip TLS validation; only for trusted dev hosts with self-signed certs.
- `--admin-session` — attach to the admin/console session (equivalent to `mstsc /admin`).
- `--desktop-width <px>` / `--desktop-height <px>` — *requested* resolution; the server
  negotiates the actual size (e.g. requesting `1024x768` against a `1280x720`-pinned host
  lands on `1280x720`). Confirm with `listdisplays --host ...` after connect.

RDP notes:

- `--displayId` and `--headless` are **ignored** in RDP mode; an RDP session always exposes
  one virtual display of whatever the server negotiated.
- Two display-listing commands differ — pick the right one:
  - `list_displays` (underscore, platform tool) — enumerates **local** physical displays
    only; does not accept RDP flags. Useless after an RDP connect.
  - `listdisplays` (no underscore, action tool) — accepts RDP flags; in RDP mode returns the
    negotiated virtual display (e.g. `[{ "id": "...", "name": "RDP host:3389 (1280x720)",
    "primary": true }]`). Use this to verify the actual resolution.
- `RDP helper binary not found` — the optional `bin/<platform>/rdp-helper` was stripped from
  the install; reinstall the package or unpack a fresh tarball.
- **Latency expectations** (every invocation is a fresh process, so the RDP session
  re-establishes): `connect` / `take_screenshot` / `keyboardpress` / `scroll` ≈ 5 s (node
  startup + TLS+NLA handshake + first frame); `act` / `assert` / `tap --locate` ≈ 5 s + AI
  inference, typically 8–20 s end-to-end.
- **Connect failure diagnostics**: the first stderr line is the actionable error (e.g.
  `connect_failed: Failed to connect to RDP server: ERRCONNECT_LOGON_FAILURE: Logon failed.`);
  the stack trace after it is noise. Common `ERRCONNECT_*` causes:
  - `LOGON_FAILURE` — bad username/password/domain.
  - `CONNECT_TRANSPORT_FAILED` — host unreachable or port blocked; verify with `nc -zv <host> 3389`.
  - `TLS_CONNECT_FAILED` — TLS handshake rejected; try `--ignore-certificate` for self-signed
    dev hosts, or pin `--security-protocol nla`.

After a successful RDP `connect`, the rest of the workflow is identical to local mode — just
repeat the same `--host/--username/--password/--ignore-certificate` flags on every command.

## List displays (local)

```bash
npx -y @midscene/computer@1 list_displays
```

App launched but not visible on the screenshot? It may be on another display — list, then
either move the window or `connect --displayId <id>` to the display that has it.

## Take screenshot

```bash
npx -y @midscene/computer@1 take_screenshot
```


## Perform action — `act`

`act` autonomously handles clicking, typing, scrolling, waiting, and navigation. Give it the
**whole task with the desired effect**, not micro-steps:

```bash
npx -y @midscene/computer@1 act --prompt "type hello world in the search field and press Enter"
npx -y @midscene/computer@1 act --prompt "drag the file icon to the Trash"
npx -y @midscene/computer@1 act --prompt "search for the weather in Shanghai using the Chrome browser, tell me the result"
```

## Assert current screen state

`assert` checks the visible screen against a natural-language condition; it performs no UI
actions. Passes only when the condition holds:

```bash
npx -y @midscene/computer@1 assert --prompt "there is a login button visible"
npx -y @midscene/computer@1 assert --prompt "the active window shows a saved confirmation message"
npx -y @midscene/computer@1 assert --displayId 1 --prompt "the file picker is open"
```

- `--message "<custom>"` — replace the AI-generated failure reason with a custom message
  (useful for intent in QA/CI logs):

  ```bash
  npx -y @midscene/computer@1 assert \
    --prompt "the export completed dialog is visible" \
    --message "the export should finish after clicking Save"
  ```

- `--image <url|path>` + `--image-name <name>` — compare against a reference image (http(s),
  `data:` URI, or local path). Repeat in matching order for multiple references; add
  `--convertHttpImage2Base64 true` when the model cannot reach the URL directly
  (`@midscene/computer@1.9.0+`):

  ```bash
  npx -y @midscene/computer@1 assert \
    --prompt "the visible icon matches the supplied logo" \
    --image "./fixtures/logo.png" --image-name "logo"

  npx -y @midscene/computer@1 assert \
    --prompt "the active window matches both the icon and the logo" \
    --image "./fixtures/icon.png" --image-name "icon" \
    --image "./fixtures/logo.png" --image-name "logo"
  ```

## Record and assert transient UI

Use a recording when the state to verify may vanish before a current-screen assertion runs
(toast, banner, animation, transition):

```bash
# Terminal 1 — keep this foreground command running (never shell &)
npx -y @midscene/computer@1 record start --displayId 1 --output ./save-observation.json

# Terminal 2 — perform the interaction while Terminal 1 records
npx -y @midscene/computer@1 act --displayId 1 --prompt "click the Save button"

# Ctrl+C Terminal 1, wait for the saved-path message, then assert against the recording
npx -y @midscene/computer@1 assert --displayId 1 \
  --record ./save-observation.json \
  --prompt "a saved confirmation appeared"
```

Pass local-display or RDP target flags and `--output` to `record start`, then wait for
`Recording. Press Ctrl+C to stop and save.` Keep the recorder as a foreground process in its
own terminal — never background it. Perform the interaction (manually or from a second
terminal), Ctrl+C the recorder, wait until it prints the saved path, then `assert --record`.
Repeat target flags on actions and the final assert.

Optional capture flags: `--interval-ms`, `--max-frames` (caps sampled frames; the manifest
may hold one extra final representative frame), `--watchdog-ms` (default 5 min auto-finalize;
`--watchdog-ms 0` disables it). The output is a JSON manifest plus an adjacent
`<name>.frames` image directory — not an encoded video. Keep the JSON and image directory
together and pass the JSON path to `assert --record`. Use plain `assert` (no `--record`)
when only the current screen matters.

## Precise targeting — `tap --locate`

When the user provides a reference image (screenshot, icon, logo) and wants an exact visual
match, prefer `tap --locate` over a generic `act --prompt`. Pass `--locate` as JSON:

```bash
npx -y @midscene/computer@1 tap --locate '{
  "prompt": "tap the area contains the image",
  "images": [
    {
      "name": "target image",
      "url": "https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png"
    }
  ],
  "convertHttpImage2Base64": true
}'
```

The same `locate` JSON shape works for other commands that accept a `locate` parameter.

## Disconnect

```bash
npx -y @midscene/computer@1 disconnect
```

## Consume report files

The HTML report is for human reading (step-by-step execution + replay videos). To feed
another skill or tool, convert it first:

```bash
npx -y @midscene/computer@1 report-tool --action to-markdown --htmlPath ./midscene_run/report/.../index.html --outputDir ./output-markdown
npx -y @midscene/computer@1 report-tool --action split --htmlPath ./midscene_run/report/.../index.html --outputDir ./output-data
```

Prefer Markdown for LLM workflows; JSON when the report is processed programmatically.

## Precision flags — `--deep-locate` / `--deep-think`

Global flags; once set, relevant operations use them by default (no per-call parameter):

- `--deep-locate` — an extra visual-reasoning round to pinpoint the target. Use when an
  action hits the wrong spot (location drift); applies to every locating operation,
  including inside `act` and `tap --locate`.
- `--deep-think` — deeper planning for `act` (richer context, sub-goal decomposition). Use
  for complex multi-step instructions; affects planning only.

```bash
npx -y @midscene/computer@1 act --deep-locate --prompt "click the tiny red close button in the top-left of the window"
npx -y @midscene/computer@1 act --deep-think --prompt "open the Export dialog, choose PDF, and save it to the Desktop"
npx -y @midscene/computer@1 act --deep-locate --deep-think --prompt "open Preferences and switch to the Advanced tab"
```

## Workflow pattern (stateless CLI)

1. **Connect** — establish the session.
2. **Health check** — if `connect` already ran one (screenshot + mouse-movement test), skip.
   Otherwise do one manually: `take_screenshot` succeeds, then `act --prompt "move the mouse
   to a random position"` succeeds. Both must pass before proceeding.
3. **Launch the target app, screenshot** — confirm it is visible on screen.
4. **Execute** — `act` for actions, `assert` for resulting state, or `record` +
   `assert --record` for transient states.
5. **Disconnect** when done.
6. **Report** — outcome, key data, generated file paths.

## Best practices (CLI-specific)

- **macOS PATH**: before running midscene commands, ensure system utilities are reachable:
  ```bash
  export PATH="/usr/sbin:/usr/bin:/bin:/sbin:$PATH"
  ```
- **Batch related operations** into one `act` prompt (fewer screenshot-analyze cycles).
- **Version check** when `@midscene/*` behaves oddly:
  ```bash
  npm ls @midscene/computer @midscene/core @midscene/shared
  npm view @midscene/computer version
  ```

## Troubleshooting

- **macOS: Accessibility permission denied** — System Settings → Privacy & Security →
  Accessibility → enable your terminal app → restart it.
- **macOS: Xcode Command Line Tools not found** — `xcode-select --install`.
- **API key / model error** — `.env` in the working directory must contain
  `MIDSCENE_MODEL_API_KEY` (plus NAME/BASE_URL/FAMILY as needed). The daemon loads `.env`
  at startup. See <https://midscenejs.com/model-common-config>.
- **macOS: black screenshot** — the Mac is **locked** (login/lock window); macOS prohibits
  capture while locked. Use a screensaver (with "require password after" set to a long
  delay) instead of locking during automation.
- **macOS: `system_profiler: command not found`** — PATH incomplete; run the PATH export above.
- **AI cannot find the element** — screenshot to confirm it is visible; describe with color,
  position, surrounding text; check it is not behind another window.
- **`@midscene/*` version outdated** — upgrade with
  `npm i @midscene/computer@latest @midscene/core@latest @midscene/shared@latest`.
