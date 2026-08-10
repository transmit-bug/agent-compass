#!/usr/bin/env bash
# Check (and optionally apply) upstream drift for vendored skills.
#
# Vendored skills carry an `upstream` block in skills-lock.json:
#   "upstream": { "repo": "<owner>/<name>", "path": "<path/to/SKILL.md>", "ref": "main" }
#
# Usage:
#   ./scripts/sync-upstream.sh --check   # report SAME/DIFF per skill, exit 1 if any drift (no changes)
#   ./scripts/sync-upstream.sh           # pull changed SKILL.md files, recompute hashes (via scripts/sync-hashes.sh), update skills-lock.json
#
# The hash is computed the same way as AGENTS.md specifies:
# sha256 of concatenated (relativePath + content) over every file in the skill dir,
# files sorted by relative path.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK="$ROOT/skills-lock.json"
MODE="${1:---check}"

command -v python3 >/dev/null 2>&1 || { echo "error: python3 required" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "error: curl required" >&2; exit 1; }

ROWS="$(python3 - "$LOCK" <<'PY'
import json, sys
lock = json.load(open(sys.argv[1]))
for name, e in lock.get("skills", {}).items():
    up = e.get("upstream")
    if up:
        print(f"{name}\t{e['skillPath']}\t{up['repo']}\t{up['path']}\t{up['ref']}")
PY
)"

[ -n "$ROWS" ] || { echo "no upstream-tracked skills in skills-lock.json"; exit 0; }

DRIFT=0
while IFS=$'\t' read -r name skill_path repo up_path ref; do
  [ -n "$name" ] || continue
  url="https://raw.githubusercontent.com/$repo/$ref/$up_path"
  local_file="$ROOT/$skill_path"
  tmp="$(mktemp)"
  if ! curl -fsSL -o "$tmp" "$url"; then
    echo "ERR   $name — failed to fetch $url"
    rm -f "$tmp"
    DRIFT=1
    continue
  fi
  if [ -f "$local_file" ] && cmp -s "$tmp" "$local_file"; then
    echo "SAME  $name ($repo@$ref)"
    rm -f "$tmp"
    continue
  fi
  echo "DIFF  $name ($repo@$ref)"
  DRIFT=1
  if [ "$MODE" != "--check" ]; then
    cp "$tmp" "$local_file"
    echo "      -> updated $skill_path (review before committing)"
  fi
  rm -f "$tmp"
done <<< "$ROWS"

if [ "$MODE" != "--check" ] && [ "$DRIFT" -eq 1 ]; then
  echo ""
  "$ROOT/scripts/sync-hashes.sh"
  echo "Run 'git diff' to review the vendored SKILL.md files and skills-lock.json."
fi

exit "$DRIFT"
