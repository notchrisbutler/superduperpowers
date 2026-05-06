#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/setup.sh"
trap cleanup_test_env EXIT

echo "=== Test: SDP Doctor Tool ==="

node --input-type=module <<'NODE'
import fs from 'fs';
import path from 'path';

const { SuperpowersPlugin } = await import(process.env.SUPERPOWERS_PLUGIN_FILE);
const project = path.join(process.env.TEST_HOME, 'test-project');
fs.writeFileSync(path.join(project, '.gitignore'), 'docs/superduperpowers/\n');
fs.writeFileSync(path.join(project, '.ignore'), '!docs/superduperpowers/\n');

const hooks = await SuperpowersPlugin({ directory: project, worktree: project });
const config = {};
await hooks.config(config);

const context = { sessionID: 'ses_doctor', messageID: 'msg_doctor', directory: project, worktree: project, agent: 'build' };
const init = JSON.parse(await hooks.tool.sdp_init.execute({ operation: 'apply' }, context));
if (!init.ok || !init.created) throw new Error(`init failed: ${JSON.stringify(init)}`);
const profile = JSON.parse(await hooks.tool.sdp_profile.execute({ operation: 'set', profile: { route: 'full-brainstorming' } }, context));
if (!profile.ok) throw new Error('profile setup failed');

const doctor = JSON.parse(await hooks.tool.sdp_doctor.execute({ operation: 'check' }, context));
if (!doctor.ok) throw new Error(`doctor reported unhealthy install: ${JSON.stringify(doctor, null, 2)}`);
for (const id of ['package-root', 'skills-dir', 'settings', 'skills-registration', 'required-skills', 'skill-categories', 'reviewer-agents', 'agent-registration', 'commands', 'tools', 'project-config', 'profile']) {
  const check = doctor.checks.find((entry) => entry.id === id);
  if (!check) throw new Error(`missing doctor check ${id}`);
  if (check.status !== 'ok') throw new Error(`doctor check ${id} was ${check.status}: ${check.message}`);
}
console.log('healthy doctor behavior ok');
NODE

node --input-type=module <<'NODE'
import fs from 'fs';
import path from 'path';

const { SuperpowersPlugin } = await import(process.env.SUPERPOWERS_PLUGIN_FILE);
const project = path.join(process.env.TEST_HOME, 'init-project');
fs.mkdirSync(project, { recursive: true });
const hooks = await SuperpowersPlugin({ directory: project, worktree: project });
const context = { sessionID: 'ses_init', messageID: 'msg_init', directory: project, worktree: project, agent: 'build' };

const checkBefore = JSON.parse(await hooks.tool.sdp_init.execute({ operation: 'check' }, context));
if (!checkBefore.ok || checkBefore.exists) throw new Error(`unexpected init check before apply: ${JSON.stringify(checkBefore)}`);
const apply = JSON.parse(await hooks.tool.sdp_init.execute({ operation: 'apply' }, context));
if (!apply.ok || !apply.created) throw new Error(`init apply failed: ${JSON.stringify(apply)}`);
if (!fs.existsSync(path.join(project, '.opencode', 'superduperpowers.jsonc'))) throw new Error('project config was not created');
const secondApply = JSON.parse(await hooks.tool.sdp_init.execute({ operation: 'apply' }, context));
if (!secondApply.ok || secondApply.created) throw new Error('init apply is not idempotent');
const template = JSON.parse(await hooks.tool.sdp_init.execute({ operation: 'template' }, context));
if (!template.content.includes('"workflow"')) throw new Error('init template missing workflow config');
console.log('project init behavior ok');
NODE

node --input-type=module <<'NODE'
import fs from 'fs';
import path from 'path';

const { SuperpowersPlugin } = await import(process.env.SUPERPOWERS_PLUGIN_FILE);
const project = path.join(process.env.TEST_HOME, 'global-settings-project');
fs.mkdirSync(project, { recursive: true });
const globalSettingsDir = path.join(process.env.OPENCODE_CONFIG_DIR, 'superduperpowers');
fs.mkdirSync(globalSettingsDir, { recursive: true });
fs.writeFileSync(path.join(globalSettingsDir, 'settings.jsonc'), `{
  "schemaVersion": 1,
  "workflow": { "defaultDocsRoot": "global-docs" }
}
`);

const hooks = await SuperpowersPlugin({ directory: project, worktree: project });
await hooks.config({});
const context = { sessionID: 'ses_doctor_global_settings', messageID: 'msg_doctor_global_settings', directory: project, worktree: project, agent: 'build' };
const doctor = JSON.parse(await hooks.tool.sdp_doctor.execute({ operation: 'check' }, context));
const projectConfig = doctor.checks.find((check) => check.id === 'project-config');
if (!projectConfig) throw new Error('project-config check missing');
if (projectConfig.status !== 'ok') throw new Error(`global settings should make project config optional: ${projectConfig.status} ${projectConfig.message}`);
if (!projectConfig.message.includes('project-local settings are optional')) throw new Error(`unexpected global-only project config message: ${projectConfig.message}`);
console.log('global settings doctor behavior ok');
NODE

node --input-type=module <<'NODE'
import fs from 'fs';
import path from 'path';

const { SuperpowersPlugin } = await import(process.env.SUPERPOWERS_PLUGIN_FILE);
const project = path.join(process.env.TEST_HOME, 'test-project');
const legacyShim = path.join(process.env.OPENCODE_CONFIG_DIR, 'plugins', 'superpowers.js');
fs.writeFileSync(legacyShim, 'export const Legacy = async () => ({})\n');
fs.writeFileSync(path.join(process.env.OPENCODE_CONFIG_DIR, 'opencode.json'), JSON.stringify({ plugin: ['superduperpowers@git+file:///tmp/superduperpowers'] }, null, 2));

const hooks = await SuperpowersPlugin({ directory: project, worktree: project });
await hooks.config({ command: { sdp: { description: 'User command', template: 'User command' } } });
const context = { sessionID: 'ses_doctor_bad', messageID: 'msg_doctor_bad', directory: project, worktree: project, agent: 'build' };
const profileResult = JSON.parse(await hooks.tool.sdp_profile.execute({ operation: 'set', profile: { route: 'full-brainstorming' } }, context));
if (!profileResult.ok) throw new Error('profile setup failed');
fs.writeFileSync(path.join(profileResult.profile.stateDir, 'profile.json'), '{not json\n');

const doctor = JSON.parse(await hooks.tool.sdp_doctor.execute({ operation: 'check' }, context));
const byId = Object.fromEntries(doctor.checks.map((check) => [check.id, check]));
if (!Array.isArray(doctor.recommendations) || doctor.recommendations.length === 0) throw new Error('doctor recommendations missing');
if (byId['legacy-shim'].status !== 'warning') throw new Error('legacy shim warning missing');
if (byId['duplicate-plugin-risk'].status !== 'warning') throw new Error('duplicate plugin warning missing');
if (byId['command-overrides'].status !== 'warning') throw new Error('command override warning missing');
if (byId.profile.status !== 'error') throw new Error('corrupt profile error missing');

const quarantineRoot = path.join(process.env.OPENCODE_CONFIG_DIR, 'superduperpowers', 'quarantine');
fs.mkdirSync(path.join(quarantineRoot, '123-ses_doctor_bad'), { recursive: true });
const repairedDoctor = JSON.parse(await hooks.tool.sdp_doctor.execute({ operation: 'check' }, context));
const repairHistory = repairedDoctor.checks.find((check) => check.id === 'repair-history');
if (!repairHistory || repairHistory.status !== 'warning') throw new Error('repair history warning missing');
fs.writeFileSync(path.join(quarantineRoot, 'repair-failure-123-ses_doctor_bad.json'), '{}\n');
const failedRepairDoctor = JSON.parse(await hooks.tool.sdp_doctor.execute({ operation: 'check' }, context));
const failedRepairHistory = failedRepairDoctor.checks.find((check) => check.id === 'repair-history');
if (!failedRepairHistory || failedRepairHistory.status !== 'error') throw new Error('repair failure diagnostic missing');
console.log('warning and error doctor behavior ok');
NODE

node --input-type=module <<'NODE'
import fs from 'fs';
import path from 'path';

const { SuperpowersPlugin } = await import(process.env.SUPERPOWERS_PLUGIN_FILE);
const project = path.join(process.env.TEST_HOME, 'test-project');
const hooks = await SuperpowersPlugin({ directory: project, worktree: project });
await hooks.config({});
const context = { sessionID: 'ses_doctor_state_bad', messageID: 'msg_doctor_state_bad', directory: project, worktree: project, agent: 'build' };
const profileResult = JSON.parse(await hooks.tool.sdp_profile.execute({ operation: 'set', profile: { route: 'full-brainstorming' } }, context));
if (!profileResult.ok) throw new Error('profile setup failed');
fs.rmSync(path.join(profileResult.profile.stateDir, 'events.jsonl'));
fs.mkdirSync(path.join(profileResult.profile.stateDir, 'events.jsonl'));

const doctor = JSON.parse(await hooks.tool.sdp_doctor.execute({ operation: 'check' }, context));
const profileCheck = doctor.checks.find((check) => check.id === 'profile');
if (profileCheck.status !== 'error') throw new Error('unreadable events.jsonl profile error missing');
console.log('corrupt runtime state doctor behavior ok');
NODE

node --input-type=module <<'NODE'
import path from 'path';

const { createSdpTools } = await import(path.join(process.env.SUPERPOWERS_DIR, '.opencode/plugins/superduperpowers/sdp-tools.js'));
const project = path.join(process.env.TEST_HOME, 'test-project');
const tools = createSdpTools({
  configDir: process.env.OPENCODE_CONFIG_DIR,
  packageInfo: {
    packageRoot: path.join(process.env.TEST_HOME, 'missing-package'),
    skillsDir: path.join(process.env.TEST_HOME, 'missing-skills'),
    agentsDir: path.join(process.env.TEST_HOME, 'missing-agents')
  },
  getRegistrationReport: () => null
});
const context = { sessionID: 'ses_doctor_missing', messageID: 'msg_doctor_missing', directory: project, worktree: project, agent: 'build' };
const doctor = JSON.parse(await tools.sdp_doctor.execute({ operation: 'check' }, context));
const byId = Object.fromEntries(doctor.checks.map((check) => [check.id, check]));
if (doctor.ok) throw new Error('missing package files should make doctor unhealthy');
if (byId['package-root'].status !== 'error') throw new Error('missing package root error missing');
if (byId['skills-dir'].status !== 'error') throw new Error('missing skills dir error missing');
if (byId['required-skills'].status !== 'error') throw new Error('missing required skills error missing');
if (byId['reviewer-agents'].status !== 'error') throw new Error('missing reviewer agents error missing');
console.log('missing packaged files doctor behavior ok');
NODE

echo "=== SDP doctor tool tests passed ==="
