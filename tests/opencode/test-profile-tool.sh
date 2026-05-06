#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/setup.sh"
trap cleanup_test_env EXIT

echo "=== Test: SDP Profile Tool ==="

node --input-type=module <<'NODE'
import fs from 'fs';
import path from 'path';

const { SuperpowersPlugin } = await import(process.env.SUPERPOWERS_PLUGIN_FILE);
const hooks = await SuperpowersPlugin({});
const settingsTool = hooks.tool?.sdp_settings;
if (!settingsTool) throw new Error('missing sdp_settings tool');
const profileTool = hooks.tool?.sdp_profile;
if (!profileTool) throw new Error('missing sdp_profile tool');

const context = {
  sessionID: 'ses_testprofile123',
  messageID: 'msg_testprofile123',
  directory: path.join(process.env.TEST_HOME, 'test-project'),
  worktree: path.join(process.env.TEST_HOME, 'test-project')
};

const settingsResult = JSON.parse(await settingsTool.execute({ operation: 'get' }, context));
if (!settingsResult.ok) throw new Error(`settings failed: ${JSON.stringify(settingsResult)}`);
if (settingsResult.settings.workflow.defaultDocsRoot !== 'docs') throw new Error('default docs root missing from live settings');
if (!settingsResult.sources.some((source) => source.type === 'package-default' && source.path.endsWith('defaults/superduperpowers.config.jsonc'))) {
  throw new Error(`settings did not load packaged defaults from defaults/: ${JSON.stringify(settingsResult.sources)}`);
}

const precedenceProject = path.join(process.env.TEST_HOME, 'settings-precedence-project');
fs.mkdirSync(path.join(precedenceProject, '.opencode'), { recursive: true });
const globalSettingsDir = path.join(process.env.OPENCODE_CONFIG_DIR, 'superduperpowers');
fs.mkdirSync(globalSettingsDir, { recursive: true });
fs.writeFileSync(path.join(globalSettingsDir, 'config.jsonc'), `{
  "schemaVersion": 1,
  "workflow": { "defaultDocsRoot": "legacy-global-docs" }
}
`);
fs.writeFileSync(path.join(globalSettingsDir, 'settings.jsonc'), `{
  "schemaVersion": 1,
  "workflow": { "defaultDocsRoot": "preferred-global-docs" }
}
`);
fs.writeFileSync(path.join(precedenceProject, 'superduperpowers.config.jsonc'), `{
  "schemaVersion": 1,
  "workflow": { "defaultDocsRoot": "legacy-project-docs" }
}
`);
fs.writeFileSync(path.join(precedenceProject, '.opencode', 'superduperpowers.jsonc'), `{
  "schemaVersion": 1,
  "workflow": { "defaultDocsRoot": "preferred-project-docs" }
}
`);
const precedenceContext = { ...context, sessionID: 'ses_precedence', messageID: 'msg_precedence', directory: precedenceProject, worktree: precedenceProject };
const precedenceSettings = JSON.parse(await settingsTool.execute({ operation: 'get' }, precedenceContext));
if (!precedenceSettings.ok) throw new Error(`precedence settings failed: ${JSON.stringify(precedenceSettings)}`);
if (precedenceSettings.settings.workflow.defaultDocsRoot !== 'preferred-project-docs') {
  throw new Error(`project preferred settings did not override global and legacy settings: ${precedenceSettings.settings.workflow.defaultDocsRoot}`);
}
const loadedSourceTypes = precedenceSettings.sources.map((source) => source.type).join('>');
if (!loadedSourceTypes.includes('package-default') || loadedSourceTypes.indexOf('user') > loadedSourceTypes.lastIndexOf('project')) {
  throw new Error(`settings source order did not load user before project: ${loadedSourceTypes}`);
}

const setResult = JSON.parse(await profileTool.execute({ operation: 'set', profile: { route: 'full-brainstorming' } }, context));
if (!setResult.ok) throw new Error(`set failed: ${JSON.stringify(setResult)}`);
if (!setResult.profile?.stateDir?.includes('/superduperpowers/state/ses_testprofile123')) throw new Error('profile stateDir not under config runtime root');

const profilePath = path.join(process.env.OPENCODE_CONFIG_DIR, 'superduperpowers', 'state', 'ses_testprofile123', 'profile.json');
if (!fs.existsSync(profilePath)) throw new Error(`profile not written to ${profilePath}`);
const persisted = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
if (persisted.schemaVersion !== 1) throw new Error('schemaVersion missing');
if (persisted.testingIntensity !== 'major-behavior') throw new Error('default testingIntensity missing');
if (persisted.branchPolicy !== 'prefer-feature-branch') throw new Error('default branch policy did not come from settings');
if (persisted.workflowCommitPolicy !== 'implementation-commits-only') throw new Error('workflow commit policy missing');
if (persisted.runtimeRoot !== path.join(process.env.OPENCODE_CONFIG_DIR, 'superduperpowers')) throw new Error('runtimeRoot mismatch');
if (fs.existsSync(path.join(process.env.OPENCODE_CONFIG_DIR, 'superduperpowers', 'current.json'))) throw new Error('global current pointer created');

const noSession = JSON.parse(await profileTool.execute({ operation: 'set', profile: { route: 'full-brainstorming' } }, { ...context, sessionID: undefined }));
if (noSession.ok) throw new Error('write without sessionID unexpectedly succeeded');
if (!noSession.unsavedProfile) throw new Error('missing unsavedProfile fallback');

const missingRoute = JSON.parse(await profileTool.execute({ operation: 'set', profile: {} }, context));
if (missingRoute.ok) throw new Error('profile set without route was accepted');

const invalidDocsRoot = JSON.parse(await profileTool.execute({ operation: 'set', profile: { route: 'full-brainstorming', docsRoot: 123 } }, context));
if (invalidDocsRoot.ok) throw new Error('non-string set docsRoot was accepted');

const mergeResult = JSON.parse(await profileTool.execute({ operation: 'merge', updates: { executionMethod: 'inline' } }, context));
if (mergeResult.profile.executionMethod !== 'inline') throw new Error('merge did not persist executionMethod');

const invalidMergeDocsRoot = JSON.parse(await profileTool.execute({ operation: 'merge', updates: { docsRoot: {} } }, context));
if (invalidMergeDocsRoot.ok) throw new Error('non-string merge docsRoot was accepted');

const summaryResult = JSON.parse(await profileTool.execute({ operation: 'summary' }, context));
if (!summaryResult.summary.includes('testingIntensity=major-behavior')) throw new Error('summary missing testing intensity');

const validationResult = JSON.parse(await profileTool.execute({ operation: 'validate' }, context));
if (!validationResult.ok) throw new Error(`validate failed: ${JSON.stringify(validationResult.errors)}`);

const invalidSet = JSON.parse(await profileTool.execute({ operation: 'set', profile: { apiKey: 'secret' } }, context));
if (invalidSet.ok) throw new Error('secret-like set profile key was accepted');

const immutable = JSON.parse(await profileTool.execute({ operation: 'merge', updates: { runtimeRoot: '/tmp/wrong' } }, context));
if (immutable.ok) throw new Error('immutable derived field was accepted');

const invalid = JSON.parse(await profileTool.execute({ operation: 'merge', updates: { apiKey: 'secret' } }, context));
if (invalid.ok) throw new Error('secret-like profile key was accepted');

const unknown = JSON.parse(await profileTool.execute({ operation: 'merge', updates: { customField: true } }, context));
if (unknown.ok) throw new Error('unknown profile field was accepted');

const projectSettingsPath = path.join(context.directory, 'superduperpowers.jsonc');
fs.writeFileSync(projectSettingsPath, `{
  // JSONC comments and trailing commas are allowed.
  "schemaVersion": 1,
  "workflow": {
    "defaultDocsRoot": "notes",
    "generatedDocsPolicy": "commit-after-approval",
    "workflowCommitPolicy": "spec-plan-and-implementation-commits",
    "branchPolicy": "current-branch-after-approval",
    "testingIntensity": "existing-tests-only",
  },
}
`);
const liveSettings = JSON.parse(await settingsTool.execute({ operation: 'summary' }, context));
if (!liveSettings.summary.includes('docsRoot=notes')) throw new Error('live settings did not read project override');
const liveProfileContext = { ...context, sessionID: 'ses_live_settings', messageID: 'msg_live_settings' };
const liveProfile = JSON.parse(await profileTool.execute({ operation: 'set', profile: { route: 'quick-implementation' } }, liveProfileContext));
if (!liveProfile.ok) throw new Error(`live settings profile failed: ${JSON.stringify(liveProfile)}`);
if (liveProfile.profile.docsRoot !== 'notes') throw new Error('profile did not inherit live docsRoot');
if (liveProfile.profile.generatedDocsPolicy !== 'commit-after-approval') throw new Error('profile did not inherit generated doc policy');
if (liveProfile.profile.workflowCommitPolicy !== 'spec-plan-and-implementation-commits') throw new Error('profile did not inherit workflow commit policy');
if (liveProfile.profile.testingIntensity !== 'existing-tests-only') throw new Error('profile did not inherit testing intensity');

fs.writeFileSync(profilePath, '{not json\n');
const corruptValidation = JSON.parse(await profileTool.execute({ operation: 'validate' }, context));
if (corruptValidation.ok) throw new Error('corrupt profile validated successfully');

const repairResult = JSON.parse(await profileTool.execute({ operation: 'repair', profile: { route: 'full-brainstorming' } }, context));
if (!repairResult.ok) throw new Error(`repair failed: ${JSON.stringify(repairResult)}`);
if (!fs.existsSync(profilePath)) throw new Error('repair did not restore profile');

const oldDir = path.join(process.env.OPENCODE_CONFIG_DIR, 'superduperpowers', 'state', 'ses_oldprofile');
fs.mkdirSync(oldDir, { recursive: true });
fs.writeFileSync(path.join(oldDir, 'profile.json'), '{}\n');
const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
fs.utimesSync(oldDir, old, old);
const missingOpenCodeSessionDir = path.join(process.env.OPENCODE_CONFIG_DIR, 'superduperpowers', 'state', 'ses_missing_from_opencode');
fs.mkdirSync(missingOpenCodeSessionDir, { recursive: true });
fs.writeFileSync(path.join(missingOpenCodeSessionDir, 'profile.json'), '{}\n');
const cleanup = JSON.parse(await profileTool.execute({ operation: 'cleanup', retentionDays: 30 }, context));
if (cleanup.retentionDays !== 7) throw new Error('cleanup retention was not capped at 7 days');
if (!cleanup.staleDefinition.includes('OpenCode session is gone')) throw new Error('cleanup stale definition does not mention OpenCode session presence');
if (!cleanup.removed.some((entry) => entry.endsWith('ses_oldprofile'))) throw new Error('cleanup did not remove old state');
if (cleanup.openCodeSessionPresence === 'available' && !cleanup.removed.some((entry) => entry.endsWith('ses_missing_from_opencode'))) throw new Error('cleanup did not remove state for missing OpenCode session');
if (!fs.existsSync(profilePath)) throw new Error('cleanup removed active profile');

console.log('profile tool behavior ok');
NODE

echo "=== SDP profile tool tests passed ==="
