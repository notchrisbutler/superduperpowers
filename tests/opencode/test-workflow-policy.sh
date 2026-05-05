#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/setup.sh"
trap cleanup_test_env EXIT

echo "=== Test: Workflow Policy Text ==="

if grep -R "docs/superpowers" "$SUPERPOWERS_DIR/skills" "$SUPERPOWERS_DIR/agents"; then
  echo "  [FAIL] Found stale docs/superpowers path"
  exit 1
fi

if grep -R "default .*\.opencode/worktrees\|Default worktree root.*\.opencode/worktrees\|Use \.opencode/worktrees" "$SUPERPOWERS_DIR/skills"; then
  echo "  [FAIL] Found stale default .opencode/worktrees guidance"
  exit 1
fi

if grep -R "Superpowers plugin" "$SUPERPOWERS_DIR/skills" "$SUPERPOWERS_DIR/agents" "$REPO_ROOT/README.md" "$REPO_ROOT/.opencode/INSTALL.md"; then
  echo "  [FAIL] Found product-facing Superpowers plugin phrasing"
  exit 1
fi

if grep -R "commit the approved spec\|commit the approved plan\|force-add it\|force-adding ignored docs\|git add -f" "$SUPERPOWERS_DIR/skills/brainstorming" "$SUPERPOWERS_DIR/skills/writing-plans"; then
  echo "  [FAIL] Found default generated-doc commit or force-add guidance"
  exit 1
fi

using_skill="$SUPERPOWERS_DIR/skills/using-superpowers/SKILL.md"
if ! grep -q "SuperDuperPowers" "$using_skill"; then
  echo "  [FAIL] using-superpowers lacks SuperDuperPowers naming"
  exit 1
fi
if ! grep -q "superduperpowers" "$using_skill"; then
  echo "  [FAIL] using-superpowers lacks superduperpowers alias"
  exit 1
fi
if ! grep -q "wait for user approval or adjustment before editing files" "$using_skill"; then
  echo "  [FAIL] quick flow lacks approval gate before edits"
  exit 1
fi

plans_skill="$SUPERPOWERS_DIR/skills/writing-plans/SKILL.md"
if ! grep -q "question" "$plans_skill" || ! grep -q "execution strategy" "$plans_skill"; then
  echo "  [FAIL] writing-plans lacks question-based execution strategy handoff"
  exit 1
fi

echo "=== Workflow policy text tests passed ==="
