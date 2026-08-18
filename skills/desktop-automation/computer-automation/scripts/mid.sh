#!/usr/bin/env bash
# mid.sh — Midscene session/archive wrapper
# Archives to <cwd>/.midscene/<slug>/; timestamps are read from filesystem mtimes.
# Usage:
#   mid.sh start <slug>      start a session (auto -2/-3 on name clash)
#   mid.sh shot <purpose>    take a screenshot and archive it as screenshots/NNN-purpose.png
#   mid.sh finish            collect reports → markdown → index.md → cleanup → keep last 20 sessions
#   mid.sh cache clear|stats persistent assert cache (screen hash + exact prompt)
#   mid.sh ls                list sessions by time
#   mid.sh clean [N]         manual cleanup (default keeps 20)
set -u

ROOT="$(pwd)/.midscene"
STATE="$ROOT/.current"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIDSCENE="npx -y @midscene/computer@1"
KEEP="${KEEP:-20}"
PORT="${MIDAGENT_PORT:-39417}"

daemon_up() { curl -sf -m 2 "http://127.0.0.1:$PORT/ping" >/dev/null 2>&1; }

sanitize() { printf '%s' "$1" | tr -s ' /\\' '-'; }

current() {
  [ -f "$STATE" ] && cat "$STATE" || true
}

cmd_start() {
  local name; name="$(sanitize "${2:-}")"
  [ -z "$name" ] && { echo "usage: mid.sh start <slug>" >&2; exit 2; }
  mkdir -p "$ROOT"
  local dir="$ROOT/$name" n=2
  while [ -e "$dir" ]; do dir="$ROOT/$name-$n"; n=$((n + 1)); done
  mkdir -p "$dir/screenshots"
  printf '%s\n' "$dir" > "$STATE"
  echo "session started: $dir"
}

cmd_shot() {
  local dir; dir="$(current)"
  [ -n "$dir" ] || { echo "error: run mid.sh start first" >&2; exit 2; }
  local purpose; purpose="$(sanitize "${2:-step}")"

  if daemon_up; then
    local body resp
    body="$(python3 -c 'import json,sys;print(json.dumps({"purpose":sys.argv[1],"sessionDir":sys.argv[2]}))' "$purpose" "$dir")"
    resp="$(curl -sf -m 120 -X POST "http://127.0.0.1:$PORT/shot" -H 'Content-Type: application/json' --data-binary "$body")"
    [ -n "$resp" ] || { echo "error: daemon /shot failed" >&2; exit 1; }
    python3 -c "import json,sys;d=json.loads(sys.argv[1]);print(d.get('msg',''))" "$resp"
    return
  fi

  # CLI fallback (no daemon)
  local out
  out="$($MIDSCENE take_screenshot 2>/dev/null | grep -oE '/[^ ]+\.(png|jpeg|jpg)' | tail -1)"
  [ -n "$out" ] || { echo "error: screenshot failed" >&2; exit 1; }
  local last_img
  last_img="$(ls -t "$dir/screenshots"/*.png 2>/dev/null | head -1)"
  if [ -n "$last_img" ]; then
    if python3 "$SKILL_DIR/screen-diff.py" --strict "$last_img" "$out" >/dev/null 2>&1; then
      echo "SKIP identical to ${last_img##*/}, not re-archived (CLI mode)"
      return 0
    fi
  fi
  local seq=1 last
  last="$(ls "$dir/screenshots" 2>/dev/null | grep -oE '^[0-9]+' | sort -n | tail -1)"
  [ -n "$last" ] && seq=$((last + 1))
  local fname; fname="$(printf '%03d' "$seq")-$purpose.png"
  cp "$out" "$dir/screenshots/$fname"
  echo "archived: $dir/screenshots/$fname (CLI mode)"
}

cmd_act() {
  local dir; dir="$(current)"
  [ -n "$dir" ] || { echo "error: run mid.sh start first" >&2; exit 2; }
  local prompt="${2:-}"
  [ -n "$prompt" ] || { echo "usage: mid.sh act <prompt>" >&2; exit 2; }
  if daemon_up; then
    local body resp
    body="$(python3 -c 'import json,sys;print(json.dumps({"prompt":sys.argv[1],"sessionDir":sys.argv[2]}))' "$prompt" "$dir")"
    resp="$(curl -sf -m 600 -X POST "http://127.0.0.1:$PORT/act" -H 'Content-Type: application/json' --data-binary "$body")"
    [ -n "$resp" ] || { echo "error: daemon /act failed" >&2; exit 1; }
    python3 -c "import json,sys;d=json.loads(sys.argv[1]);print(d.get('msg',''));print('');print(d.get('result') or '')" "$resp"
  else
    $MIDSCENE act --prompt "$prompt" 2>&1 | grep -v "npm warn"
  fi
}

cmd_assert() {
  local dir; dir="$(current)"
  [ -n "$dir" ] || { echo "error: run mid.sh start first" >&2; exit 2; }
  local prompt="${2:-}"
  [ -n "$prompt" ] || { echo "usage: mid.sh assert <prompt> [message]" >&2; exit 2; }
  if daemon_up; then
    local body resp
    body="$(python3 -c 'import json,sys;print(json.dumps({"prompt":sys.argv[1],"message":sys.argv[2] if len(sys.argv)>2 else None,"sessionDir":sys.argv[3]}))' "$prompt" "${3:-}" "$dir")"
    resp="$(curl -sf -m 600 -X POST "http://127.0.0.1:$PORT/assert" -H 'Content-Type: application/json' --data-binary "$body")"
    [ -n "$resp" ] || { echo "error: daemon /assert failed" >&2; exit 1; }
    python3 -c "import json,sys;d=json.loads(sys.argv[1]);print(d.get('msg',''));print('thought:',d.get('thought') or '')" "$resp"
  else
    $MIDSCENE assert --prompt "$prompt" 2>&1 | grep -v "npm warn"
  fi
}

cmd_cache() {
  case "${2:-}" in
    clear)
      if daemon_up; then
        curl -sf -m 5 -X POST "http://127.0.0.1:$PORT/cache/clear" >/dev/null 2>&1
        echo "persistent cache cleared (daemon memory + $ROOT/.cache.json)"
      else
        rm -f "$ROOT/.cache.json"
        echo "persistent cache cleared ($ROOT/.cache.json)"
      fi
      ;;
    stats)
      if daemon_up; then
        curl -sf -m 3 "http://127.0.0.1:$PORT/status" | python3 -c "import json,sys;d=json.load(sys.stdin);print('cache entries:',d.get('cacheEntries'),'/',d.get('cacheMax'),'  match distance <=',d.get('cacheDist'))"
      else
        if [ -f "$ROOT/.cache.json" ]; then
          python3 -c "import json;print('cache entries:',len(json.load(open('$ROOT/.cache.json'))),'(daemon down)')"
        else
          echo "no persistent cache yet (daemon down)"
        fi
      fi
      ;;
    *) echo "usage: mid.sh cache clear|stats" >&2; exit 2 ;;
  esac
}

cmd_agent() {
  local action="${2:-status}"
  case "$action" in
    start)
      if daemon_up; then echo "daemon already running (port $PORT)"; return; fi
      mkdir -p "$ROOT"
      # Resolve @midscene/computer from the project's node_modules first, falling back to a
      # machine-wide global install (npm i -g @midscene/computer).
      export NODE_PATH="${NODE_PATH:+$NODE_PATH:}$(npm root -g 2>/dev/null)"
      nohup node "$SKILL_DIR/midagent.js" serve >> "$ROOT/.agent.log" 2>&1 &
      local pid=$!
      echo "$pid" > "$ROOT/.agent.pid"
      for _ in $(seq 1 40); do
        daemon_up && { echo "daemon started (pid $pid, port $PORT)"; return; }
        sleep 0.5
      done
      echo "daemon failed to start, log: $ROOT/.agent.log" >&2
      return 1 ;;
    stop)
      if curl -sf -m 5 -X POST "http://127.0.0.1:$PORT/stop" >/dev/null 2>&1; then
        echo "daemon stopped"
      else
        echo "daemon not running"
      fi
      # Wait for the port to be released so no stale process lingers
      for _ in $(seq 1 20); do
        daemon_up || break
        sleep 0.3
      done
      rm -f "$ROOT/.agent.pid" ;;
    status)
      if daemon_up; then
        curl -sf -m 3 "http://127.0.0.1:$PORT/status" | python3 -m json.tool
      else
        echo "daemon not running"
      fi ;;
    *) echo "usage: mid.sh agent start|stop|status" >&2 ;;
  esac
}

# Per-step conclusions from the merged report: see extract-steps.py (separate file, used by finish)

cmd_finish() {
  local dir; dir="$(current)"
  [ -n "$dir" ] || { echo "error: run mid.sh start first" >&2; exit 2; }
  local tmp="$ROOT/.tmp-$$"
  mkdir -p "$tmp"

  # 1. merge all reports into one report.html + report.md (one report handles all images)
  local htmls=() args=()
  for html in $(ls -tr midscene_run/report/computer-*.html 2>/dev/null); do htmls+=("$html"); done
  if [ "${#htmls[@]}" -gt 0 ]; then
    for h in "${htmls[@]}"; do args+=(--htmlReport "$h"); done
    if $MIDSCENE report-tool --action merge-html "${args[@]}" --outputDir "$tmp" --outputName report --overwrite >/dev/null 2>&1 && [ -f "$tmp/report.html" ]; then
      mv "$tmp/report.html" "$dir/report.html"
      mkdir -p "$tmp/md"
      if $MIDSCENE report-tool --action to-markdown --htmlPath "$dir/report.html" --outputDir "$tmp/md" >/dev/null 2>&1 && [ -f "$tmp/md/report.md" ]; then
        mv "$tmp/md/report.md" "$dir/report.md"
        [ -d "$tmp/md/screenshots" ] && mv "$tmp/md/screenshots" "$dir/report-frames"
      fi
      echo "merged reports: ${#htmls[@]} runs → report.html + report.md"
    else
      echo "warning: report merge failed, skipping"
    fi
  fi
  rm -rf "$tmp"

  # 2. clean up leftover /tmp screenshots
  rm -f /tmp/screenshot-*.png /tmp/midscene-screenshot-*.png 2>/dev/null

  # 3. write index.md (per-step conclusions from the merged report)
  {
    echo "# $(basename "$dir")"
    echo
    echo "- started: $(stat -c %y "$dir" | cut -d. -f1)"
    echo "- ended: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "- path: $dir"
    echo
    echo "## Screenshots"
    ls "$dir/screenshots" 2>/dev/null | sort | while read -r f; do echo "- \`$f\`"; done
    echo
    echo "## Steps & conclusions"
    if [ -f "$dir/report.md" ]; then
      python3 "$SKILL_DIR/extract-steps.py" "$dir/report.md" || true
    else
      echo "_(no report)_"
    fi
  } > "$dir/index.md"

  # 4. clean up midscene_run in cwd
  rm -rf midscene_run

  # 5. keep the most recent KEEP sessions
  ls -dt "$ROOT"/*/ 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -rf

  rm -f "$STATE"
  echo "finish done: index.md written → $dir"
}

cmd_ls() {
  ls -dt "$ROOT"/*/ 2>/dev/null | while read -r d; do
    echo "$(stat -c '%y' "$d" | cut -d. -f1)  $(basename "$d")"
  done
}

cmd_clean() {
  local keep="${2:-$KEEP}"
  ls -dt "$ROOT"/*/ 2>/dev/null | tail -n +$((keep + 1)) | xargs -r rm -rf
  echo "cleaned (keeping $keep sessions)"
}

case "${1:-}" in
  start)  cmd_start "$@" ;;
  shot)   cmd_shot "$@" ;;
  act)    cmd_act "$@" ;;
  assert) cmd_assert "$@" ;;
  agent)  cmd_agent "$@" ;;
  cache)  cmd_cache "$@" ;;
  finish) cmd_finish ;;
  ls)     cmd_ls ;;
  clean)  cmd_clean "$@" ;;
  *)
    cat <<'EOF'
mid.sh — Midscene session/archive wrapper
usage:
  mid.sh agent start|stop|status   persistent session daemon (local diff gate, LLM on demand)
  mid.sh start <slug>              start a session (.midscene/<slug>/) (english slug)
  mid.sh shot <purpose>            screenshot + archive (only changed frames, english purpose)
  mid.sh act <prompt>              perform an action (persistent cache: same screen + exact prompt → zero LLM)
  mid.sh assert <prompt> [msg]     assert / verify
  mid.sh cache clear|stats         persistent result cache (.midscene/.cache.json)
  mid.sh finish                    merge reports → index.md → cleanup → keep last 20
  mid.sh ls / clean [N]            list / clean sessions
EOF
    exit 1 ;;
esac
