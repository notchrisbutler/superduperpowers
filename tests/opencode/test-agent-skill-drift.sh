#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/setup.sh"
trap cleanup_test_env EXIT

echo "=== Test: Agent/Skill Architecture Drift ==="

node --input-type=module <<'NODE'
import fs from 'fs';
import path from 'path';

const root = process.env.REPO_ROOT;
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const requireIncludes = (file, patterns) => {
  const text = read(file);
  for (const pattern of patterns) {
    if (!text.includes(pattern)) {
      throw new Error(`${file} missing required text: ${pattern}`);
    }
  }
};

const agentRoutes = {
  'brainstorming-facilitator': ['skills/brainstorming/SKILL.md'],
  'plan-writer': ['skills/writing-plans/SKILL.md'],
  'plan-reviewer': ['skills/writing-plans/SKILL.md'],
  'implementer': ['skills/subagent-driven-development/SKILL.md'],
  'tdd-implementer': ['skills/subagent-driven-development/SKILL.md', 'skills/test-driven-development/SKILL.md'],
  'debugging-investigator': ['skills/subagent-driven-development/SKILL.md', 'skills/systematic-debugging/SKILL.md'],
  'parallelization-advisor': ['skills/subagent-driven-development/SKILL.md', 'skills/dispatching-parallel-agents/SKILL.md'],
  'spec-reviewer': ['skills/subagent-driven-development/SKILL.md', 'skills/requesting-spec-review/SKILL.md'],
  'code-reviewer': ['skills/subagent-driven-development/SKILL.md', 'skills/requesting-code-review/SKILL.md'],
  'lite-spec-reviewer': ['skills/subagent-driven-development/SKILL.md', 'skills/requesting-spec-review/SKILL.md'],
  'lite-code-reviewer': ['skills/subagent-driven-development/SKILL.md', 'skills/requesting-code-review/SKILL.md']
};

for (const [agent, files] of Object.entries(agentRoutes)) {
  const agentPath = path.join(root, 'agents', `${agent}.md`);
  if (!fs.existsSync(agentPath)) throw new Error(`missing agent definition: ${agent}`);
  const hasRoute = files.some((file) => read(file).includes(agent));
  if (!hasRoute) throw new Error(`${agent} has no corresponding skill routing language in ${files.join(', ')}`);
}

const fallbackPrompts = {
  'skills/subagent-driven-development/implementer-prompt.md': 'implementer',
  'skills/subagent-driven-development/spec-reviewer-prompt.md': 'spec-reviewer',
  'skills/subagent-driven-development/code-quality-reviewer-prompt.md': 'code-reviewer',
  'skills/subagent-driven-development/lite-spec-reviewer-prompt.md': 'lite-spec-reviewer',
  'skills/subagent-driven-development/lite-code-reviewer-prompt.md': 'lite-code-reviewer',
  'skills/requesting-code-review/code-reviewer.md': 'code-reviewer',
  'skills/writing-plans/plan-document-reviewer-prompt.md': 'plan-reviewer',
  'skills/brainstorming/spec-document-reviewer-prompt.md': 'spec-reviewer'
};

for (const [file, agent] of Object.entries(fallbackPrompts)) {
  const text = read(file);
  if (!text.includes('Fallback alignment:')) throw new Error(`${file} lacks fallback alignment language`);
  if (!text.includes(`canonical named`) && !text.includes(`canonical ${agent}`)) {
    throw new Error(`${file} does not tie fallback behavior to a canonical named agent`);
  }
  if (!text.includes(agent)) throw new Error(`${file} does not name canonical agent ${agent}`);
}

requireIncludes('agents/implementer.md', [
  'Do not create, update, or complete todos.',
  'Do not spawn, dispatch, or coordinate any other subagents',
  'Do not continue into later plan tasks after your assigned dispatch is done.',
  'Do not commit, push, merge, switch branches, reset, clean worktrees',
  'If two attempts fail in the same scope'
]);
requireIncludes('skills/subagent-driven-development/implementer-prompt.md', [
  'Do not continue into later plan tasks',
  'mutate todos',
  'spawn/dispatch/coordinate any other subagents',
  'Do not commit',
  'If two attempts fail in the same scope'
]);
requireIncludes('agents/tdd-implementer.md', [
  'Do not create, update, or complete todos.',
  'Do not spawn, dispatch, or coordinate any other subagents',
  'Do not continue into later plan tasks after your assigned dispatch is done.',
  'If two red/green implementation attempts fail'
]);
requireIncludes('agents/spec-reviewer.md', [
  'Review independently.',
  'Do not trust implementation reports'
]);
requireIncludes('skills/subagent-driven-development/spec-reviewer-prompt.md', [
  'DO NOT:',
  'Take their word for what they implemented',
  'Read the actual code they wrote'
]);
requireIncludes('agents/code-reviewer.md', [
  'Critical (must fix), Important (should fix), or Suggestions',
  'Check that branch/worktree code does not perform hidden branch changes'
]);
requireIncludes('skills/requesting-code-review/code-reviewer.md', [
  'Critical',
  'Important',
  'Production Readiness'
]);
requireIncludes('skills/using-superpowers/SKILL.md', [
  '## Context Discipline',
  '## Re-Evaluation Gates',
  'frontend-design'
]);
requireIncludes('skills/frontend-design/SKILL.md', [
  'Anti-Generic UI Rules',
  'Accessibility And Responsiveness',
  'Re-Evaluation Gate'
]);
requireIncludes('skills/writing-plans/SKILL.md', [
  '## Re-Evaluation And Placeholder Seams',
  'Context budget',
  'Frontend quality when applicable'
]);

const agentsDir = path.join(root, 'agents');
for (const file of fs.readdirSync(agentsDir)) {
  if (!file.endsWith('.md')) continue;
  const text = fs.readFileSync(path.join(agentsDir, file), 'utf8');
  const isWritable = /permission_edit:\s*allow/.test(text);
  if (isWritable && !/permission_todowrite:\s*deny/.test(text)) {
    throw new Error(`${file} is writable but does not explicitly deny todowrite`);
  }
  if (/orchestrat/i.test(text) && !text.includes('main agent remains the coordinator') && !text.includes('main agent remains the orchestrator')) {
    throw new Error(`${file} references orchestration without preserving main-agent ownership`);
  }
  if (!/Do not spawn, dispatch, or coordinate (any other )?subagents/i.test(text)) {
    throw new Error(`${file} lacks the no-nested-subagent orchestration boundary`);
  }
}

console.log('agent/skill drift checks passed');
NODE

node "$REPO_ROOT/scripts/context-budget.mjs" --check >/tmp/sdp-context-budget-check.txt
if ! grep -q "Bootstrap:" /tmp/sdp-context-budget-check.txt; then
  echo "  [FAIL] context budget report did not include bootstrap line"
  exit 1
fi

echo "=== Agent/skill architecture drift tests passed ==="
