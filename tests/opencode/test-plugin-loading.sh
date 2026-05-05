#!/usr/bin/env bash
# Test: Plugin Loading
# Verifies that the superpowers plugin loads correctly in OpenCode
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Test: Plugin Loading ==="

# Source setup to create isolated environment
source "$SCRIPT_DIR/setup.sh"

# Trap to cleanup on exit
trap cleanup_test_env EXIT

plugin_link="$OPENCODE_CONFIG_DIR/plugins/superduperpowers.js"
package_json="$SUPERPOWERS_DIR/package.json"

# Test 1: Verify package metadata and local plugin shim exist
echo "Test 1: Checking package metadata and plugin shim..."
if [ -f "$package_json" ]; then
    echo "  [PASS] Package metadata exists"
else
    echo "  [FAIL] Package metadata not found at $package_json"
    exit 1
fi
if [ -L "$plugin_link" ]; then
    echo "  [PASS] Local plugin shim exists"
else
    echo "  [FAIL] Local plugin shim not found at $plugin_link"
    exit 1
fi

# Verify symlink target exists. -f follows symlinks and is portable to macOS.
if [ -f "$plugin_link" ]; then
    echo "  [PASS] Plugin symlink target exists"
else
    echo "  [FAIL] Plugin symlink target does not exist"
    exit 1
fi

# Test 2: Verify skills directory is populated
echo "Test 2: Checking skills directory..."
skill_count=$(find "$SUPERPOWERS_SKILLS_DIR" -name "SKILL.md" | wc -l)
if [ "$skill_count" -gt 0 ]; then
    echo "  [PASS] Found $skill_count skills"
else
    echo "  [FAIL] No skills found in $SUPERPOWERS_SKILLS_DIR"
    exit 1
fi

# Test 3: Check using-superpowers skill exists (critical for bootstrap)
echo "Test 3: Checking using-superpowers skill (required for bootstrap)..."
if [ -f "$SUPERPOWERS_SKILLS_DIR/using-superpowers/SKILL.md" ]; then
    echo "  [PASS] using-superpowers skill exists"
else
    echo "  [FAIL] using-superpowers skill not found (required for bootstrap)"
    exit 1
fi

# Test 4: Verify package main import and plugin JavaScript syntax
echo "Test 4: Checking package main import and plugin JavaScript syntax..."
if node --check "$SUPERPOWERS_PLUGIN_FILE" 2>/dev/null; then
    echo "  [PASS] Plugin JavaScript syntax is valid"
else
    echo "  [FAIL] Plugin has JavaScript syntax errors"
    exit 1
fi
package_output=$(node --input-type=module <<'NODE'
import fs from 'fs';
import path from 'path';

const packagePath = path.join(process.env.SUPERPOWERS_DIR, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (pkg.name !== '@notchrisbutler/superduperpowers') throw new Error(`unexpected package name ${pkg.name}`);
if (pkg.main !== '.opencode/plugins/superduperpowers.js') throw new Error(`unexpected main ${pkg.main}`);
const mod = await import(path.join(process.env.SUPERPOWERS_DIR, pkg.main));
if (!mod.SuperpowersPlugin) throw new Error('missing SuperpowersPlugin export');
const hooks = await mod.SuperpowersPlugin({});
if (typeof hooks.config !== 'function') throw new Error('missing config hook');
if (!hooks.tool?.sdp_settings) throw new Error('missing sdp_settings tool');
if (!hooks.tool?.sdp_init) throw new Error('missing sdp_init tool');
if (!hooks.tool?.sdp_profile) throw new Error('missing sdp_profile tool');
if (!hooks.tool?.sdp_setup_hygiene) throw new Error('missing sdp_setup_hygiene tool');
if (!hooks.tool?.sdp_branch_context) throw new Error('missing sdp_branch_context tool');
console.log(`${pkg.name} main import and hook ok`);
NODE
) || {
    echo "  [FAIL] Package main import failed"
    exit 1
}
echo "  [PASS] $package_output"

# Test 5: Verify bundled workflow agents are installed
echo "Test 5: Checking bundled workflow agents..."
for agent in code-reviewer spec-reviewer lite-code-reviewer lite-spec-reviewer brainstorming-facilitator plan-writer plan-reviewer implementer tdd-implementer debugging-investigator parallelization-advisor; do
    if [ ! -f "$SUPERPOWERS_DIR/agents/$agent.md" ]; then
        echo "  [FAIL] Missing bundled agent: $agent"
        exit 1
    fi
done
echo "  [PASS] Bundled workflow agents exist"

# Test 6: Verify plugin registers named workflow agents in OpenCode config
echo "Test 6: Checking named workflow agent registration..."
agent_output=$(node --input-type=module <<'NODE'
import fs from 'fs';
import path from 'path';

const packagePath = path.join(process.env.SUPERPOWERS_DIR, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const { SuperpowersPlugin } = await import(path.join(process.env.SUPERPOWERS_DIR, pkg.main));
const hooks = await SuperpowersPlugin({});
const config = {};
await hooks.config(config);
await hooks.config(config);

const skillPaths = config.skills?.paths || [];
if (skillPaths.length !== new Set(skillPaths).size) throw new Error('duplicate skill paths registered');
const expectedSkillsPath = fs.realpathSync(process.env.SUPERPOWERS_SKILLS_DIR);
const bundledSkillPathCount = skillPaths.filter((entry) => fs.realpathSync(entry) === expectedSkillsPath).length;
if (bundledSkillPathCount !== 1) throw new Error(`expected one bundled skills path, got ${bundledSkillPathCount}`);

const readOnlyAgents = ['code-reviewer', 'spec-reviewer', 'lite-code-reviewer', 'lite-spec-reviewer', 'plan-reviewer', 'debugging-investigator', 'parallelization-advisor'];
const writableAgents = ['brainstorming-facilitator', 'plan-writer', 'implementer', 'tdd-implementer'];

for (const name of [...readOnlyAgents, ...writableAgents]) {
  const agent = config.agent?.[name];
  if (!agent) throw new Error(`missing ${name}`);
  if (agent.mode !== 'subagent') throw new Error(`${name} is not a subagent`);
  if (!agent.description) throw new Error(`${name} is missing description`);
  if (!agent.prompt) throw new Error(`${name} is missing prompt`);
}
for (const name of readOnlyAgents) {
  const agent = config.agent[name];
  if (agent.permission?.edit !== 'deny') throw new Error(`${name} can edit files`);
  if (agent.permission?.todowrite !== 'deny') throw new Error(`${name} can mutate todos`);
}
for (const name of writableAgents) {
  const agent = config.agent[name];
  if (agent.permission?.edit !== 'allow') throw new Error(`${name} cannot edit files`);
  if (agent.permission?.todowrite !== 'deny') throw new Error(`${name} can mutate todos`);
}

const expectedCommands = ['sdp', 'superduperpowers', 'superpowers', 'brainstorm', 'quick-flow', 'write-plan', 'execute-plan', 'sdp-status', 'sdp-profile', 'sdp-init', 'sdp-cleanup'];
for (const name of expectedCommands) {
  const command = config.command?.[name];
  if (!command) throw new Error(`missing command ${name}`);
  if (!command.template) throw new Error(`${name} command is missing template`);
  if (!command.description) throw new Error(`${name} command is missing description`);
}
if (config.command['sdp-status'].template.includes('sdp_profile cleanup')) throw new Error('sdp-status should use diagnostics, not cleanup');
if (!config.command.sdp.template.includes('Full Brainstorming')) throw new Error('sdp command does not route choices');
if (!config.command['quick-flow'].template.includes('Keep the work lightweight')) throw new Error('quick-flow command does not route quick flow');
if (config.command['sdp-verify']) throw new Error('unexpected sdp-verify command registered');

console.log(Object.keys(config.agent).sort().join('\n'));
NODE
) || {
    echo "  [FAIL] Plugin did not register named workflow agents"
    exit 1
}
if grep -q "code-reviewer" <<< "$agent_output" && grep -q "spec-reviewer" <<< "$agent_output"; then
    echo "  [PASS] Named workflow agents registered"
else
    echo "  [FAIL] Expected workflow agents not found in config"
    exit 1
fi

# Test 7: Verify existing user-defined agents are preserved
echo "Test 7: Checking user-defined agent preservation..."
node --input-type=module <<'NODE'
const { SuperpowersPlugin } = await import(process.env.SUPERPOWERS_PLUGIN_FILE);
const hooks = await SuperpowersPlugin({});
const existing = { description: 'User reviewer', mode: 'subagent', prompt: 'User-defined prompt' };
const config = { agent: { 'code-reviewer': existing } };
await hooks.config(config);
if (config.agent['code-reviewer'] !== existing) throw new Error('user-defined code-reviewer was overwritten');
console.log('user-defined agent preserved');
NODE
echo "  [PASS] User-defined agent preserved"

# Test 8: Verify existing user-defined commands are preserved
echo "Test 8: Checking user-defined command preservation..."
node --input-type=module <<'NODE'
const { SuperpowersPlugin } = await import(process.env.SUPERPOWERS_PLUGIN_FILE);
const hooks = await SuperpowersPlugin({});
const existing = { description: 'User sdp command', template: 'User-defined command' };
const config = { command: { sdp: existing } };
await hooks.config(config);
if (config.command.sdp !== existing) throw new Error('user-defined sdp command was overwritten');
if (!config.command.brainstorm) throw new Error('other bundled commands were not registered');
console.log('user-defined command preserved');
NODE
echo "  [PASS] User-defined command preserved"

# Test 9: Verify bootstrap text does not reference a hardcoded skills path
echo "Test 9: Checking bootstrap does not advertise a wrong skills path..."
if grep -q 'configDir}/skills/superpowers/' "$SUPERPOWERS_PLUGIN_FILE"; then
    echo "  [FAIL] Plugin still references old configDir skills path"
    exit 1
else
    echo "  [PASS] Plugin does not advertise a misleading skills path"
fi

# Test 10: Verify bootstrap transform injects once
echo "Test 10: Checking bootstrap transform injection..."
node --input-type=module <<'NODE'
const { SuperpowersPlugin } = await import(process.env.SUPERPOWERS_PLUGIN_FILE);
const hooks = await SuperpowersPlugin({});
const output = {
  messages: [{
    info: { role: 'user' },
    parts: [{ type: 'text', text: 'hello' }]
  }]
};
await hooks['experimental.chat.messages.transform']({}, output);
await hooks['experimental.chat.messages.transform']({}, output);
const firstPart = output.messages[0].parts[0];
if (!firstPart.text.startsWith('<EXTREMELY_IMPORTANT>\nYou have SuperDuperPowers.')) throw new Error('bootstrap was not prepended');
if (output.messages[0].parts[1]?.text !== 'hello') throw new Error('original user text was not preserved after bootstrap');
const text = output.messages[0].parts.map(part => part.text || '').join('\n');
const count = (text.match(/You have SuperDuperPowers\./g) || []).length;
if (count !== 1) throw new Error(`expected one bootstrap injection, got ${count}`);
if (!text.includes('superduperpowers')) throw new Error('bootstrap is missing superduperpowers alias language');
if (!text.includes('sdp_profile')) throw new Error('bootstrap is missing workflow profile tool mapping');
if (!text.includes('sdp_settings')) throw new Error('bootstrap is missing live settings tool mapping');
if (!text.includes('sdp_init')) throw new Error('bootstrap is missing project init tool mapping');
if (!text.includes('SuperDuperPowers live settings')) throw new Error('bootstrap is missing live settings summary');
console.log('bootstrap injected once');
NODE
echo "  [PASS] Bootstrap transform injects once"

# Test 11: Verify compaction hook appends context
echo "Test 11: Checking compaction profile context injection..."
node --input-type=module <<'NODE'
import fs from 'fs';
import path from 'path';

const { SuperpowersPlugin } = await import(process.env.SUPERPOWERS_PLUGIN_FILE);
const project = path.join(process.env.TEST_HOME, 'test-project');
const hooks = await SuperpowersPlugin({ directory: project });
const profileTool = hooks.tool.sdp_profile;
const context = { sessionID: 'ses_compaction', messageID: 'msg_compaction', directory: project, worktree: project };
const setResult = JSON.parse(await profileTool.execute({ operation: 'set', profile: { route: 'full-brainstorming' } }, context));
if (!setResult.ok) throw new Error('profile setup failed');

const output = { context: [] };
await hooks['experimental.session.compacting']({ sessionID: 'ses_compaction' }, output);
if (output.context.length !== 1) throw new Error(`expected one compaction context entry, got ${output.context.length}`);
if (!output.context[0].includes('SuperDuperPowers profile: route=full-brainstorming')) throw new Error('profile summary missing from compaction context');
if ('messages' in output) throw new Error('compaction hook wrote output.messages');
fs.writeFileSync(path.join(setResult.profile.stateDir, 'profile.json'), 'null\n');
const nullOutput = { context: [] };
await hooks['experimental.session.compacting']({ sessionID: 'ses_compaction' }, nullOutput);
if (nullOutput.context.length !== 0) throw new Error('compaction should skip non-object profiles');
fs.writeFileSync(path.join(setResult.profile.stateDir, 'profile.json'), '{not json\n');
const corruptOutput = { context: [] };
await hooks['experimental.session.compacting']({ sessionID: 'ses_compaction' }, corruptOutput);
if (corruptOutput.context.length !== 0) throw new Error('compaction should skip corrupt profiles');
const externalProfile = path.join(project, 'external-profile.json');
fs.writeFileSync(externalProfile, JSON.stringify(setResult.profile, null, 2));
fs.rmSync(path.join(setResult.profile.stateDir, 'profile.json'));
fs.symlinkSync(externalProfile, path.join(setResult.profile.stateDir, 'profile.json'));
const symlinkOutput = { context: [] };
await hooks['experimental.session.compacting']({ sessionID: 'ses_compaction' }, symlinkOutput);
if (symlinkOutput.context.length !== 0) throw new Error('compaction should skip symlink profiles');
const externalStateDir = path.join(project, 'external-state-dir');
fs.mkdirSync(externalStateDir, { recursive: true });
fs.writeFileSync(path.join(externalStateDir, 'profile.json'), JSON.stringify(setResult.profile, null, 2));
fs.rmSync(setResult.profile.stateDir, { recursive: true, force: true });
fs.symlinkSync(externalStateDir, setResult.profile.stateDir, 'dir');
const stateDirSymlinkOutput = { context: [] };
await hooks['experimental.session.compacting']({ sessionID: 'ses_compaction' }, stateDirSymlinkOutput);
if (stateDirSymlinkOutput.context.length !== 0) throw new Error('compaction should skip symlink stateDir');
const traversalOutput = { context: [] };
await hooks['experimental.session.compacting']({ sessionID: '../escape' }, traversalOutput);
if (traversalOutput.context.length !== 0) throw new Error('compaction should skip traversal session ids');
console.log('compaction context injected');
NODE
echo "  [PASS] Compaction hook appends output.context"

# Test 12: Verify personal test skill was created
echo "Test 12: Checking test fixtures..."
if [ -f "$OPENCODE_CONFIG_DIR/skills/personal-test/SKILL.md" ]; then
    echo "  [PASS] Personal test skill fixture created"
else
    echo "  [FAIL] Personal test skill fixture not found"
    exit 1
fi

echo ""
echo "=== All plugin loading tests passed ==="
