#!/usr/bin/env bash
# SessionStart: print branch, last 5 commits, open TODOs in tracked source.
# Output goes to additionalContext (stdout). Always exits 0.
set -u

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "<not a git repo>")
LAST_COMMITS=$(git log --pretty=format:'  %h %s (%cr)' -n 5 2>/dev/null || echo "  <no commits>")

# Cap TODO scan to tracked TS/TSX in src/, excluding test files.
# Test fixtures often contain the literal string "TODO" inside markdown samples,
# which the unfiltered grep surfaces as a fake TODO every session.
TODOS=$(git ls-files 'src/*.ts' 'src/*.tsx' 2>/dev/null \
  | grep -v -E '\.test\.tsx?$' \
  | xargs grep -nE '\b(TODO|FIXME|XXX|HACK)\b' 2>/dev/null \
  | head -n 15)
TODO_COUNT=$(printf '%s\n' "$TODOS" | grep -c . 2>/dev/null || echo 0)

cat <<EOF
## Session start

- Branch: $BRANCH
- Last 5 commits:
$LAST_COMMITS
- Open TODOs (first 15, tracked .ts/.tsx in src/): $TODO_COUNT match(es)
EOF

if [ "$TODO_COUNT" -gt 0 ]; then
  echo
  echo '```'
  printf '%s\n' "$TODOS"
  echo '```'
fi

exit 0
