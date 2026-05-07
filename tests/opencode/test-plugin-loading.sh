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
if (pkg.name !== 'superduperpowers') throw new Error(`unexpected package name ${pkg.name}`);
if (pkg.main !== '.opencode/plugins/superduperpowers.js') throw new Error(`unexpected main ${pkg.main}`);
const mod = await import(path.join(process.env.SUPERPOWERS_DIR, pkg.main));
if (!mod.SuperpowersPlugin) throw new Error('missing SuperpowersPlugin export');
if (!mod.SuperpowersTuiPlugin) throw new Error('missing SuperpowersTuiPlugin export');
if (mod.tui !== mod.SuperpowersTuiPlugin) throw new Error('missing TUI plugin alias export');
const hooks = await mod.SuperpowersPlugin({});
if (typeof hooks.config !== 'function') throw new Error('missing config hook');
if (hooks.tool && Object.keys(hooks.tool).some((name) => name.startsWith('sdp_'))) throw new Error('unexpected sdp runtime tools registered');
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

const expectedCommands = ['sdp', 'superduperpowers', 'superpowers', 'brainstorm', 'quick-flow', 'write-plan', 'execute-plan'];
for (const name of expectedCommands) {
  const command = config.command?.[name];
  if (!command) throw new Error(`missing command ${name}`);
  if (!command.template) throw new Error(`${name} command is missing template`);
  if (!command.description) throw new Error(`${name} command is missing description`);
}
const commandNames = Object.keys(config.command || {}).sort();
if (JSON.stringify(commandNames) !== JSON.stringify([...expectedCommands].sort())) throw new Error(`unexpected command set: ${commandNames.join(', ')}`);
for (const removed of ['sdp-status', 'sdp-profile', 'sdp-setup', 'sdp-init', 'sdp-cleanup']) {
  if (config.command?.[removed]) throw new Error(`removed command still registered: ${removed}`);
}
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

# Test 9: Verify TUI slash commands are registered
echo "Test 9: Checking TUI slash command registration..."
node --input-type=module <<'NODE'
const { SuperpowersTuiPlugin } = await import(process.env.SUPERPOWERS_PLUGIN_FILE);
const calls = [];
const submitted = [];
const api = {
  command: {
    register(cb) {
      calls.push(cb);
      return () => {};
    }
  },
  client: {
    tui: {
      appendPrompt: async (input) => submitted.push(['append', input]),
      submitPrompt: async (input) => submitted.push(['submit', input])
    }
  },
  workspace: {
    current: () => 'workspace-1'
  }
};
await SuperpowersTuiPlugin(api);
if (calls.length !== 1) throw new Error(`expected one TUI command registration, got ${calls.length}`);
const serverSideResult = await SuperpowersTuiPlugin({ client: api.client });
if (!serverSideResult || Object.keys(serverSideResult).length !== 0) throw new Error('TUI plugin should be inert outside TUI command API');
const commands = calls[0]();
const names = commands.map((command) => command.slash?.name).filter(Boolean);
for (const name of ['sdp', 'superduperpowers', 'superpowers', 'brainstorm', 'quick-flow', 'write-plan', 'execute-plan']) {
  if (!names.includes(name)) throw new Error(`missing TUI slash command ${name}`);
}
for (const removed of ['sdp-status', 'sdp-profile', 'sdp-setup', 'sdp-init', 'sdp-cleanup']) {
  if (names.includes(removed)) throw new Error(`removed TUI slash command still registered: ${removed}`);
}
const quickFlow = commands.find((command) => command.slash?.name === 'quick-flow');
if (!quickFlow?.description || typeof quickFlow.onSelect !== 'function') throw new Error('quick-flow TUI command is incomplete');
await quickFlow.onSelect();
if (submitted.length !== 2) throw new Error(`expected append and submit calls, got ${submitted.length}`);
if (!submitted[0][1].text.includes('Keep the work lightweight')) throw new Error('quick-flow TUI command did not append quick-flow prompt');
if (submitted[0][1].workspace !== 'workspace-1') throw new Error('quick-flow TUI command did not preserve workspace');
console.log(names.sort().join('\n'));
NODE
echo "  [PASS] TUI slash commands registered"

# Test 10: Verify bootstrap text does not reference a hardcoded skills path
echo "Test 10: Checking bootstrap does not advertise a wrong skills path..."
if grep -q 'configDir}/skills/superpowers/' "$SUPERPOWERS_PLUGIN_FILE"; then
    echo "  [FAIL] Plugin still references old configDir skills path"
    exit 1
else
    echo "  [PASS] Plugin does not advertise a misleading skills path"
fi

# Test 11: Verify bootstrap transform injects once
echo "Test 11: Checking bootstrap transform injection..."
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
if (!text.includes('Configuration is manual and project-local')) throw new Error('bootstrap is missing manual configuration guidance');
for (const removed of ['sdp_profile', 'sdp_settings', 'sdp_init', 'sdp_setup_hygiene', 'sdp_branch_context']) {
  if (text.includes(removed)) throw new Error(`bootstrap still references removed runtime tool: ${removed}`);
}
if (text.includes('SuperDuperPowers live settings')) throw new Error('bootstrap still references live settings summary');
console.log('bootstrap injected once');
NODE
echo "  [PASS] Bootstrap transform injects once"

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
