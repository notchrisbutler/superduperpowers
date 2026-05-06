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

for legacy_dir in explicit-skill-requests skill-triggering subagent-driven-dev; do
  if [ -e "$REPO_ROOT/tests/$legacy_dir" ]; then
    echo "  [FAIL] Found stale legacy harness test directory: tests/$legacy_dir"
    exit 1
  fi
done

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

REPO_ROOT="$REPO_ROOT" node --input-type=module <<'NODE'
import fs from 'fs';
import path from 'path';

const root = process.env.REPO_ROOT;
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const calverTagVersion = /^[0-9]{4}\.[0-9]{4}\.[0-9]+$/;
if (!calverTagVersion.test(packageJson.version)) {
  throw new Error(`package.json version must use YYYY.MMDD.N numeric package form, found ${packageJson.version}`);
}
NODE

REPO_ROOT="$REPO_ROOT" node --input-type=module <<'NODE'
import fs from 'fs';
import path from 'path';

const root = process.env.REPO_ROOT;
const activeRoots = ['AGENTS.md', 'README.md', 'CONTRIBUTING.md', '.opencode/INSTALL.md', 'docs', '.github', 'scripts', 'skills', 'agents'];
const legacyVersionPolicy = /YYYY\.M\.D(?:-N)?|YYYY\.M\.D-N|[0-9]{4}\.M\.D/;
const historicalAllowlist = new Set(['ACKNOWLEDGEMENTS.md']);
const generatedDocsPrefix = `docs${path.sep}superduperpowers${path.sep}`;

const files = [];
const walk = (relative) => {
  if (historicalAllowlist.has(relative) || relative.startsWith(generatedDocsPrefix)) return;
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) return;
  const stat = fs.statSync(full);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(full)) walk(path.join(relative, entry));
    return;
  }
  if (/\.(md|mdx|yml|yaml|json|jsonc|js|mjs|sh)$/.test(relative)) files.push(relative);
};
for (const activeRoot of activeRoots) walk(activeRoot);

const offenders = files.filter((file) => legacyVersionPolicy.test(fs.readFileSync(path.join(root, file), 'utf8')));
if (offenders.length) {
  throw new Error(`active release policy still documents legacy YYYY.M.D versioning: ${offenders.join(', ')}`);
}
NODE

if ! grep -R "vYYYY\.MMDD\.N\|v[0-9][0-9][0-9][0-9]\.MMDD\.N" "$REPO_ROOT/README.md" "$REPO_ROOT/docs" "$REPO_ROOT/.opencode/INSTALL.md" >/dev/null 2>&1; then
  echo "  [FAIL] release docs do not require vYYYY.MMDD.N tags"
  exit 1
fi

REPO_ROOT="$REPO_ROOT" SUPERPOWERS_DIR="$SUPERPOWERS_DIR" node --input-type=module <<'NODE'
import fs from 'fs';
import path from 'path';

const root = process.env.REPO_ROOT;
const superpowersDir = process.env.SUPERPOWERS_DIR;
const roots = ['AGENTS.md', 'README.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'package.json', 'superduperpowers.config.jsonc', '.opencode/INSTALL.md', '.github', 'scripts', 'skills', 'agents', 'bin', 'installer', 'defaults', 'templates'];
const allow = new Set(['ACKNOWLEDGEMENTS.md']);
const generatedDocsPrefix = `docs${path.sep}superduperpowers${path.sep}`;
const vendorPattern = /Anthropic|OpenAI|Claude|GPT/i;
const files = [];
const walk = (base, relative) => {
  if (allow.has(relative) || relative.startsWith(generatedDocsPrefix) || relative.includes(`${path.sep}node_modules${path.sep}`)) return;
  const full = path.join(base, relative);
  if (!fs.existsSync(full)) return;
  const stat = fs.statSync(full);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(full)) walk(base, path.join(relative, entry));
    return;
  }
  if (/\.(md|mdx|yml|yaml|json|jsonc|js|mjs|sh)$/.test(relative)) files.push([base, relative]);
};
for (const activeRoot of roots) walk(root, activeRoot);
walk(superpowersDir, 'skills');
walk(superpowersDir, 'agents');
const offenders = files
  .filter(([base, file]) => vendorPattern.test(fs.readFileSync(path.join(base, file), 'utf8')))
  .map(([base, file]) => base === root ? file : `packaged:${file}`);
if (offenders.length) {
  throw new Error(`active workflow/package sources contain vendor-specific model guidance: ${offenders.join(', ')}`);
}
NODE

REPO_ROOT="$REPO_ROOT" node --input-type=module <<'NODE'
import { execFileSync } from 'child_process';
import path from 'path';

const root = process.env.REPO_ROOT;
const output = execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: root, encoding: 'utf8' });
const packed = JSON.parse(output)[0].files.map((entry) => entry.path);
const includes = (file) => packed.includes(file) || packed.some((entry) => entry.startsWith(`${file.replace(/\/$/, '')}/`));
const required = [
  'agents', 'skills', 'assets', 'bin', 'installer', 'defaults', 'templates',
  '.opencode/plugins/superduperpowers.js', '.opencode/plugins/superduperpowers',
  '.opencode/INSTALL.md', 'docs/publishing.md', 'docs/testing.md', 'docs/workflow-map.md', 'docs/wiki',
  'scripts/context-budget.mjs', 'README.md', 'LICENSE', 'SECURITY.md', 'CONTRIBUTING.md', 'ACKNOWLEDGEMENTS.md', 'package.json'
];
for (const file of required) {
  if (!includes(file)) throw new Error(`npm pack dry-run missing required package content: ${file}`);
}
if (packed.some((file) => file.startsWith('docs/superduperpowers/'))) {
  throw new Error('npm pack dry-run includes generated SuperDuperPowers docs');
}
for (const excluded of ['tests/', 'evals/', '.github/', 'docs/superduperpowers/', 'AGENTS.md', 'superduperpowers.config.jsonc']) {
  if (packed.some((file) => file.startsWith(excluded))) throw new Error(`npm pack dry-run includes excluded content: ${excluded}`);
}
if (packed.some((file) => /anthropic|openai|claude|gpt/i.test(file))) {
  throw new Error('npm pack dry-run includes vendor-specific packaged resources');
}
NODE

REPO_ROOT="$REPO_ROOT" node --input-type=module <<'NODE'
import fs from 'fs';
import path from 'path';

const packageJson = JSON.parse(fs.readFileSync(path.join(process.env.REPO_ROOT, 'package.json'), 'utf8'));
const files = packageJson.files || [];
if (files.includes('docs/') || files.includes('docs')) {
  throw new Error('package files must not include the whole docs directory because docs/superduperpowers is local-only');
}
for (const required of ['docs/publishing.md', 'docs/testing.md', 'docs/workflow-map.md', 'docs/wiki/']) {
  if (!files.includes(required)) throw new Error(`package files missing public doc: ${required}`);
}
for (const excluded of ['AGENTS.md', 'superduperpowers.config.jsonc']) {
  if (files.includes(excluded)) throw new Error(`package files must not include local/contributor-only content: ${excluded}`);
}
NODE

main_pr_event="$REPO_ROOT/tests/opencode/fixtures/release-gate/main-pr-event.json"
latest_pr_event="$REPO_ROOT/tests/opencode/fixtures/release-gate/latest-pr-event.json"
latest_bad_head_event="$REPO_ROOT/tests/opencode/fixtures/release-gate/latest-bad-head-event.json"
release_dispatch_event="$REPO_ROOT/tests/opencode/fixtures/release-gate/release-dispatch-event.json"

GITHUB_EVENT_NAME=pull_request GITHUB_EVENT_PATH="$main_pr_event" node "$REPO_ROOT/scripts/release-gate.mjs" --mode pr
if GITHUB_EVENT_NAME=pull_request GITHUB_EVENT_PATH="$latest_pr_event" node "$REPO_ROOT/scripts/release-gate.mjs" --mode pr; then
  echo "  [FAIL] release gate allowed a PR into latest from main"
  exit 1
fi
if GITHUB_EVENT_NAME=pull_request GITHUB_EVENT_PATH="$latest_bad_head_event" node "$REPO_ROOT/scripts/release-gate.mjs" --mode pr; then
  echo "  [FAIL] release gate allowed a PR into latest from a feature branch"
  exit 1
fi
git -C "$REPO_ROOT" fetch --no-tags origin main:refs/remotes/origin/main latest:refs/remotes/origin/latest >/dev/null 2>&1 || {
  echo "  [FAIL] release gate test requires origin/main and origin/latest to be fetchable"
  exit 1
}
GITHUB_EVENT_NAME=workflow_dispatch GITHUB_EVENT_PATH="$release_dispatch_event" node "$REPO_ROOT/scripts/release-gate.mjs" --mode release

if [ ! -f "$REPO_ROOT/.github/workflows/release.yml" ]; then
  echo "  [FAIL] .github/workflows/release.yml is missing"
  exit 1
fi

REPO_ROOT="$REPO_ROOT" node --input-type=module <<'NODE'
import fs from 'fs';
import path from 'path';

const root = process.env.REPO_ROOT;
const bumpVersion = fs.readFileSync(path.join(root, 'scripts/bump-version.sh'), 'utf8');
const releaseGate = fs.readFileSync(path.join(root, 'scripts/release-gate.mjs'), 'utf8');
const releaseWorkflow = fs.readFileSync(path.join(root, '.github/workflows/release.yml'), 'utf8');

if (/tag --list "\$\{today\}\.\*"/.test(bumpVersion) || /tag --list "\$today\.\*"/.test(bumpVersion)) {
  throw new Error('version:next must not include raw same-day YYYY.MMDD.N tags when computing the next vYYYY.MMDD.N release suffix');
}

if (!/showPackageVersionAtRef|gitShowPackageJson|compareVersions/.test(releaseGate) || !/latest.*version|version.*latest/s.test(releaseGate)) {
  throw new Error('release gate must compare package.json version on main against latest before promotion');
}
if (!/show:package\.json|git show|origin\/latest:package\.json|latest:package\.json/.test(releaseWorkflow) || !/main.*latest|latest.*main/s.test(releaseWorkflow)) {
  throw new Error('release workflow must compare main package version against latest before promotion');
}

if (!/tagExists|releaseExists|gh release view|git.*rev-parse.*refs\/tags|git.*show-ref.*tags/.test(releaseGate)) {
  throw new Error('release gate must reject an already-existing computed release tag or GitHub Release');
}
if (!/gh release view|git .*show-ref.*tags|git .*rev-parse.*refs\/tags/.test(releaseWorkflow)) {
  throw new Error('release workflow must fail before promotion when the tag or GitHub Release already exists');
}

if (!/CHANGELOG\.md[\s\S]*(pkg\.version|tag|releaseTag)|changelog[\s\S]*(pkg\.version|tag|releaseTag)/.test(releaseGate)) {
  throw new Error('release gate must verify CHANGELOG.md mentions the exact package version or derived release tag');
}
if (/changelog\.includes\((pkg\.version|tag)\)/.test(releaseGate) || !/changelogMentionsRelease|releaseMentionRegex|escapeRegExp/.test(releaseGate)) {
  throw new Error('release gate CHANGELOG validation must use exact token boundaries rather than substring matching');
}
if (!/GITHUB_ACTIONS[\s\S]*(GH_TOKEN|GITHUB_TOKEN)|(GH_TOKEN|GITHUB_TOKEN)[\s\S]*GITHUB_ACTIONS/.test(releaseGate)) {
  throw new Error('release gate must fail closed in GitHub Actions when no GitHub token is available for release existence checks');
}

const validationStep = releaseWorkflow.match(/- name: Validate release source and tag[\s\S]*?(?=\n\s*- name:|\n\s*$)/)?.[0] ?? '';
if (!/GH_TOKEN:\s*\$\{\{ github\.token \}\}/.test(validationStep)) {
  throw new Error('release workflow validation step must pass GH_TOKEN before checking existing GitHub Releases and running release-gate');
}
if (/grep -Fq "\$version" CHANGELOG\.md|grep -Fq "\$release_tag" CHANGELOG\.md/.test(validationStep) || !/node --input-type=module[\s\S]*CHANGELOG\.md[\s\S]*(version|releaseTag)/.test(validationStep)) {
  throw new Error('release workflow CHANGELOG validation must use exact token boundaries rather than substring matching');
}

if (!/daysInMonth|Date\(|validCalendar|validProjectVersion/.test(bumpVersion) || !/daysInMonth|Date\(|validCalendar|validProjectVersion/.test(releaseGate) || !/days_in_month|case "\$month"|Date\(/.test(releaseWorkflow)) {
  throw new Error('release gates/scripts/workflows must reject impossible MMDD dates, including invalid month/day ranges');
}
NODE

release_workflow="$REPO_ROOT/.github/workflows/release.yml"
if [ -f "$release_workflow" ]; then
  if ! grep -q "workflow_dispatch" "$release_workflow"; then
    echo "  [FAIL] release workflow must be manually triggered"
    exit 1
  fi
  if ! grep -qi "environment:.*release\|environment:.*admin\|name:.*release\|name:.*admin" "$release_workflow"; then
    echo "  [FAIL] release workflow must require a restricted release/admin environment"
    exit 1
  fi
  if ! grep -q "refs/heads/main\|github.ref.*main\|ref_name.*main" "$release_workflow"; then
    echo "  [FAIL] release workflow must require main as the release source"
    exit 1
  fi
  if ! grep -qi "fast-forward\|ff-only\|--ff-only" "$release_workflow"; then
    echo "  [FAIL] release workflow must promote main to latest with fast-forward-only semantics"
    exit 1
  fi
  if ! grep -qi "dry_run\|dry-run" "$release_workflow" || ! grep -qi "gh release create\|release create" "$release_workflow"; then
    echo "  [FAIL] release workflow must stop dry-runs before release creation"
    exit 1
  fi
  if ! grep -q "CHANGELOG.md" "$release_workflow"; then
    echo "  [FAIL] release workflow must use CHANGELOG.md as the release body source"
    exit 1
  fi
  if ! grep -qi "test-workflow-policy\|npm test\|tests/opencode\|validation" "$release_workflow"; then
    echo "  [FAIL] release workflow must run the validation suite before publishing"
    exit 1
  fi
  if grep -q "npm run version:next\|version:next\|CHANGELOG.*>\|changelog.*rewrite\|rewrite.*changelog\|git commit\|git push.*main\|git push origin main" "$release_workflow"; then
    echo "  [FAIL] release workflow must not bump versions, rewrite changelog, commit, or push main"
    exit 1
  fi
  if grep -qi "pull_request\|repository_dispatch\|workflow_run" "$release_workflow"; then
    echo "  [FAIL] release workflow must not allow PR or user-direct promotion to latest"
    exit 1
  fi
fi

if ! grep -q "CHANGELOG.md" "$REPO_ROOT/docs/publishing.md" "$REPO_ROOT/README.md" "$release_workflow" 2>/dev/null; then
  echo "  [FAIL] CHANGELOG.md is not documented as the GitHub Release body source"
  exit 1
fi

if ! grep -q "latest\.\.\.main" "$SUPERPOWERS_DIR/skills/finishing-a-development-branch/SKILL.md"; then
  echo "  [FAIL] finishing-a-development-branch guidance does not document latest...main verification"
  exit 1
fi
if ! grep -qi "rewrite" "$SUPERPOWERS_DIR/skills/finishing-a-development-branch/SKILL.md" || \
   ! grep -qi "validation evidence" "$SUPERPOWERS_DIR/skills/finishing-a-development-branch/SKILL.md" || \
   ! grep -qi "commit IDs\|branch comparison" "$SUPERPOWERS_DIR/skills/finishing-a-development-branch/SKILL.md"; then
  echo "  [FAIL] finishing-a-development-branch lacks changelog finalization rewrite, evidence, or no-version-schema fallback guidance"
  exit 1
fi

if ! grep -q "fresh session" "$SUPERPOWERS_DIR/skills/executing-plans/SKILL.md" "$SUPERPOWERS_DIR/skills/using-superpowers/SKILL.md" || \
   ! grep -q "approved plan" "$SUPERPOWERS_DIR/skills/executing-plans/SKILL.md" "$SUPERPOWERS_DIR/skills/using-superpowers/SKILL.md" || \
   ! grep -q "plan path" "$SUPERPOWERS_DIR/skills/executing-plans/SKILL.md" "$SUPERPOWERS_DIR/skills/using-superpowers/SKILL.md" || \
   ! grep -q "workflow profile" "$SUPERPOWERS_DIR/skills/executing-plans/SKILL.md" "$SUPERPOWERS_DIR/skills/using-superpowers/SKILL.md" || \
   ! grep -q "ask.*path\|route.*planning" "$SUPERPOWERS_DIR/skills/executing-plans/SKILL.md" "$SUPERPOWERS_DIR/skills/using-superpowers/SKILL.md" || \
   ! grep -q "memory" "$SUPERPOWERS_DIR/skills/executing-plans/SKILL.md" "$SUPERPOWERS_DIR/skills/using-superpowers/SKILL.md" || \
   ! grep -q "stop" "$SUPERPOWERS_DIR/skills/executing-plans/SKILL.md" "$SUPERPOWERS_DIR/skills/using-superpowers/SKILL.md"; then
  echo "  [FAIL] execution routing lacks fresh-session approved-plan resume and stop/re-route guidance"
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
  if awk '
    NR == 1 && $0 == "---" { in_fm=1; next }
    in_fm && $0 == "---" { exit }
    in_fm && $0 ~ /^category: / { found=1 }
    END { exit found ? 0 : 1 }
  ' "$skill_file"; then
    echo "  [FAIL] skill has unsupported top-level category metadata: $skill_file"
    exit 1
  fi
  if ! awk '
    NR == 1 && $0 == "---" { in_fm=1; next }
    in_fm && $0 == "---" { exit }
    in_fm && $0 == "metadata:" { in_meta=1; next }
    in_fm && in_meta && $0 ~ /^  category: / { found=1 }
    in_fm && in_meta && $0 !~ /^  / && $0 != "" { in_meta=0 }
    END { exit found ? 0 : 1 }
  ' "$skill_file"; then
    echo "  [FAIL] skill lacks metadata.category: $skill_file"
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
