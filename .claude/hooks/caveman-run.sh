#!/usr/bin/env bash
# Run a vendored caveman hook script with a node binary located at runtime.
#
# Claude Code runs hooks in a minimal, non-interactive environment that does
# not source nvm/fnm, so `node` is usually absent from PATH on machines where
# node is managed by a version manager. Bare `node hook.js` then fails with
# "command not found" and caveman never activates. This wrapper finds node
# wherever it lives and execs it, so the vendored plugin works on any computer
# with node installed — PATH, nvm, or Homebrew.
#
# Usage: caveman-run.sh <absolute-path-to-hook.js>
# stdin is passed through untouched (UserPromptSubmit hooks read JSON on stdin).
# If no node is found, exit 0 (no-op) so a missing node never blocks a session.
set -uo pipefail

script="${1:-}"
[ -z "$script" ] && exit 0
shift

find_node() {
  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi
  # nvm "default" alias, if set.
  if [ -s "$HOME/.nvm/alias/default" ]; then
    local ver
    ver="$(cat "$HOME/.nvm/alias/default")"
    for c in "$HOME"/.nvm/versions/node/"$ver"*/bin/node \
             "$HOME"/.nvm/versions/node/v"$ver"*/bin/node; do
      [ -x "$c" ] && { echo "$c"; return 0; }
    done
  fi
  # Newest installed nvm version.
  local c
  for c in $(ls -d "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null | sort -V -r); do
    [ -x "$c" ] && { echo "$c"; return 0; }
  done
  # Common fixed locations.
  for c in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node; do
    [ -x "$c" ] && { echo "$c"; return 0; }
  done
  return 1
}

node_bin="$(find_node)" || exit 0
exec "$node_bin" "$script" "$@"
