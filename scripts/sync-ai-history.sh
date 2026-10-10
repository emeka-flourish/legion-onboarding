#!/usr/bin/env bash
# Copy this project's native AI transcripts, unmodified, into ai_history/raw/.
#
#   Claude Code: ~/.claude/projects/<project-slug>*/  ->  ai_history/raw/claude-code/
#                (each session's .jsonl plus its folder: sub-agent sessions and large tool outputs)
#   Codex:       ~/.codex/{sessions,archived_sessions}/**/rollout-*.jsonl started inside this project
#                ->  ai_history/raw/codex/
#
# Safe to re-run at any time. Native transcripts are append-only, so each run refreshes the copies,
# and copies are never deleted even if the tool later cleans up its own files.
# Never edit files under ai_history/raw/ by hand (see AGENTS.md, "AI history").
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/ai_history/raw"
SLUG="$(printf '%s' "$ROOT" | sed 's/[^A-Za-z0-9]/-/g')"

mkdir -p "$DEST/claude-code" "$DEST/codex"

# Claude Code names its per-project folder after the working directory, so sessions started in a
# subfolder of this project (or a worktree inside it) land in folders that share this prefix.
claude_dirs=0
for dir in "$HOME/.claude/projects/$SLUG"*; do
  [ -d "$dir" ] || continue
  rsync -a --exclude 'memory/' --exclude '.DS_Store' "$dir/" "$DEST/claude-code/"
  claude_dirs=$((claude_dirs + 1))
done

# Codex records the working directory in the first line of each rollout file (session metadata).
codex_files=0
for base in "$HOME/.codex/sessions" "$HOME/.codex/archived_sessions"; do
  [ -d "$base" ] || continue
  while IFS= read -r -d '' f; do
    if head -n 1 "$f" | grep -qF "\"cwd\":\"$ROOT"; then
      cp -p "$f" "$DEST/codex/"
      codex_files=$((codex_files + 1))
    fi
  done < <(find "$base" -name 'rollout-*.jsonl' -print0)
done

echo "Claude Code transcript folders synced: $claude_dirs"
echo "Codex sessions synced: $codex_files"
echo "Files now in ai_history/raw/:"
(cd "$ROOT" && find ai_history/raw -type f | sort | while read -r f; do
  printf '  %6s  %s\n' "$(du -h "$f" | cut -f1)" "$f"
done)
