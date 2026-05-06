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

if ! grep -Fq '"plugin": ["superduperpowers"]' "$REPO_ROOT/README.md" "$REPO_ROOT/.opencode/INSTALL.md"; then
  echo "  [FAIL] npm package path is not documented as the active OpenCode install path"
  exit 1
fi
if ! grep -q "superduperpowers@git+https://github.com/notchrisbutler/superduperpowers.git#main" "$REPO_ROOT/README.md" "$REPO_ROOT/.opencode/INSTALL.md"; then
  echo "  [FAIL] GitHub fallback/nightly install path is not documented"
  exit 1
fi
if grep -Fq '"plugin": ["@notchrisbutler/superduperpowers"]' "$REPO_ROOT/README.md" "$REPO_ROOT/.opencode/INSTALL.md"; then
  echo "  [FAIL] scoped npm package path is documented as the active OpenCode install path"
  exit 1
fi
if grep -qi "future npm\|not an npm package\|installed from the GitHub repository" "$REPO_ROOT/README.md" "$REPO_ROOT/.opencode/INSTALL.md"; then
  echo "  [FAIL] stale pre-publication install language is still documented in setup guides"
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
if ! grep -q "Do not call runtime tools just to restate already-known values" "$using_skill"; then
  echo "  [FAIL] using-superpowers lacks runtime tool-call budget guidance"
  exit 1
fi
if ! grep -q "Do not repeatedly re-run the same worker, reviewer, command, or prompt with unchanged context" "$using_skill"; then
  echo "  [FAIL] using-superpowers lacks bounded re-evaluation guidance"
  exit 1
fi

for skill_file in "$SUPERPOWERS_DIR"/skills/*/SKILL.md; do
  if ! grep -q "^category: " "$skill_file"; then
    echo "  [FAIL] skill lacks category metadata: $skill_file"
    exit 1
  fi
done

for agent in brainstorming-facilitator plan-writer plan-reviewer implementer tdd-implementer debugging-investigator parallelization-advisor; do
  if [ ! -f "$SUPERPOWERS_DIR/agents/$agent.md" ]; then
    echo "  [FAIL] missing workflow agent: $agent"
    exit 1
  fi
done

if ! grep -q "dispatch \`implementer\`" "$SUPERPOWERS_DIR/skills/subagent-driven-development/SKILL.md"; then
  echo "  [FAIL] subagent-driven-development does not route implementer agent"
  exit 1
fi
if ! grep -q "dispatch \`plan-writer\`" "$SUPERPOWERS_DIR/skills/writing-plans/SKILL.md"; then
  echo "  [FAIL] writing-plans does not route plan-writer agent"
  exit 1
fi
if ! grep -q "dispatch \`debugging-investigator\`" "$SUPERPOWERS_DIR/skills/systematic-debugging/SKILL.md"; then
  echo "  [FAIL] systematic-debugging does not route debugging-investigator agent"
  exit 1
fi

bootstrap_words=$(REPO_ROOT="$REPO_ROOT" node --input-type=module <<'NODE'
import path from 'path';
import { pathToFileURL } from 'url';
const root = process.env.REPO_ROOT;
const { getBootstrapContent } = await import(pathToFileURL(path.join(root, '.opencode/plugins/superduperpowers/sdp-registration.js')));
const text = getBootstrapContent(path.join(root, 'skills')) || '';
console.log(text.trim().split(/\s+/).length);
NODE
)
if [ "$bootstrap_words" -gt 220 ]; then
  echo "  [FAIL] bootstrap is too large: $bootstrap_words words"
  exit 1
fi
if REPO_ROOT="$REPO_ROOT" node --input-type=module <<'NODE'
import path from 'path';
import { pathToFileURL } from 'url';
const root = process.env.REPO_ROOT;
const { getBootstrapContent } = await import(pathToFileURL(path.join(root, '.opencode/plugins/superduperpowers/sdp-registration.js')));
const text = getBootstrapContent(path.join(root, 'skills')) || '';
if (text.includes('The Rule') || text.includes('Route Matrix') || text.includes('digraph skill_flow')) {
  throw new Error('bootstrap includes heavy using-superpowers body');
}
NODE
then
  :
else
  echo "  [FAIL] bootstrap includes heavyweight routing skill content"
  exit 1
fi

plans_skill="$SUPERPOWERS_DIR/skills/writing-plans/SKILL.md"
if ! grep -q "question" "$plans_skill" || ! grep -q "execution strategy" "$plans_skill"; then
  echo "  [FAIL] writing-plans lacks question-based execution strategy handoff"
  exit 1
fi

if grep -q '"reviewEachChunk": true' "$REPO_ROOT/superduperpowers.config.jsonc"; then
  echo "  [FAIL] default full workflow still reviews every chunk"
  exit 1
fi

if ! grep -q "one focused re-review" "$SUPERPOWERS_DIR/skills/subagent-driven-development/SKILL.md" "$SUPERPOWERS_DIR/skills/executing-plans/SKILL.md"; then
  echo "  [FAIL] execution skills lack bounded re-review language"
  exit 1
fi

if ! grep -q "The main agent owns the todo list and orchestration" "$SUPERPOWERS_DIR/skills/subagent-driven-development/SKILL.md"; then
  echo "  [FAIL] subagent-driven-development lacks coordinator-owned todo language"
  exit 1
fi
if ! grep -q "Task 1.1: <bounded implementation unit> - dispatch <worker role>" "$SUPERPOWERS_DIR/skills/writing-plans/SKILL.md"; then
  echo "  [FAIL] writing-plans lacks dispatch-scoped harness todo shape"
  exit 1
fi
if grep -q "one visible todo per parent task\|execute Task 1.1-1.N\|one visible harness todo per parent" "$SUPERPOWERS_DIR/skills/subagent-driven-development/SKILL.md" "$SUPERPOWERS_DIR/skills/writing-plans/SKILL.md" "$SUPERPOWERS_DIR/skills/executing-plans/SKILL.md" "$SUPERPOWERS_DIR/agents/plan-writer.md"; then
  echo "  [FAIL] found stale parent-task todo grouping guidance"
  exit 1
fi

profile_summary=$(REPO_ROOT="$REPO_ROOT" node --input-type=module <<'NODE'
import path from 'path';
import { pathToFileURL } from 'url';
const root = process.env.REPO_ROOT;
const { profileSummaryText } = await import(pathToFileURL(path.join(root, '.opencode/plugins/superduperpowers/sdp-tools.js')));
console.log(profileSummaryText({
  route: 'quick-implementation',
  sdpDocsRoot: 'docs/superduperpowers',
  executionStrategy: null,
  executionMethod: null,
  testingIntensity: 'major-behavior',
  branchPolicy: 'prefer-feature-branch',
  workflowCommitPolicy: 'implementation-commits-only',
  generatedDocsPolicy: 'local-only',
  runtimeRoot: '/very/long/runtime/path/that/should/not/be/in/summary'
}));
NODE
)
if grep -q "runtimeRoot\|/very/long/runtime" <<< "$profile_summary"; then
  echo "  [FAIL] profile summary leaks bulky runtime path state"
  exit 1
fi

echo "=== Workflow policy text tests passed ==="
