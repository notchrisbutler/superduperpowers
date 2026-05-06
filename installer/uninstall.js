import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { hasSuperDuperPowersPlugin, planRemoveSuperDuperPowersPlugin, readOpenCodeConfig, writeOpenCodeConfigPlan } from './opencode-config.js';
import { globalSettingsPath, projectSettingsPath, readSettingsTemplate } from './settings.js';

export async function runUninstall(parsed, installState, context) {
  let scopes = parsed.scopes.length > 0 ? parsed.scopes : [];
  let dryRun = parsed.dryRun;
  let depth = 'plugin-only';
  let backups = false;

  if (scopes.length === 0) {
    const detected = scopesFromInstallState(installState);
    if (detected.length === 0) {
      context.stdout.write('No SuperDuperPowers install was detected to uninstall.\n');
      return 0;
    }
    if (!context.isInteractive) {
      if (detected.length > 1) {
        context.stderr.write('Project and global installs were detected. Re-run uninstall with --repo, --global, or --all.\n');
        return 1;
      }
      scopes = detected;
    } else {
      const scopeChoice = await promptChoice(context, 'Choose uninstall scope.', [
        ['Project', 'project'],
        ['Global', 'global'],
        ['Both', 'both'],
        ['Cancel', 'cancel'],
      ], 4);
      if (scopeChoice === 'cancel') return cancel(context);
      scopes = scopeChoice === 'both' ? ['project', 'global'] : [scopeChoice];
    }
  }

  if (context.isInteractive && !parsed.dryRun) {
    const depthChoice = await promptChoice(context, 'Choose removal depth.', [
      ['Plugin/config only', 'plugin-only'],
      ['Plugin/config plus runtime state', 'runtime'],
      ['Dry run', 'dry-run'],
      ['Cancel', 'cancel'],
    ], 1);
    if (depthChoice === 'cancel') return cancel(context);
    if (depthChoice === 'dry-run') dryRun = true;
    depth = depthChoice;

    if (!dryRun) {
      backups = await promptYesNo(context, 'Back up files before removal? [Y/n]: ', true);
    }
  }

  const plan = buildUninstallPlan(scopes, installState, { interactive: context.isInteractive, includeRuntime: depth === 'runtime' });
  printPlan(plan, context.stdout, dryRun);

  if (dryRun) {
    context.stdout.write('Dry run; no files were changed.\n');
    return plan.some((item) => item.status === 'needs manual attention') ? 1 : 0;
  }

  if (!context.isInteractive && depth === 'runtime') {
    context.stdout.write('Runtime/session state wipe requires interactive confirmation; preserving state, worktrees, quarantine, and generated docs.\n');
  }

  for (const item of plan) {
    applyConfigRemoval(item, { backups });
  }

  if (context.isInteractive) {
    await maybeRemoveSettings(plan, context, backups);
    if (depth === 'runtime') await maybeWipeRuntimeState(installState, context, backups);
  } else {
    for (const item of plan) {
      if (item.settingsPath && fs.existsSync(item.settingsPath)) {
        context.stdout.write(`Preserved SuperDuperPowers settings: ${item.settingsPath}\n`);
      }
    }
    context.stdout.write('Runtime/session state wipe requires interactive confirmation; preserving state, worktrees, quarantine, and generated docs.\n');
  }

  context.stdout.write('Restart OpenCode after uninstall/update so plugin changes are loaded.\n');
  return plan.some((item) => item.status === 'needs manual attention') ? 1 : 0;
}

function buildUninstallPlan(scopes, installState, options = {}) {
  return scopes.map((scope) => {
    const pathContext = installState.pathContext;
    const candidates = scope === 'project' ? pathContext.projectConfigCandidates : pathContext.globalConfigCandidates;
    const settingsPath = scope === 'project' ? projectSettingsPath(pathContext.projectRoot) : globalSettingsPath(pathContext.openCodeConfigDir);
    const config = configForRemoval(candidates);
    if (!config) return { scope, status: 'no OpenCode config found', configPath: null, settingsPath, changed: false, messages: [] };
    const removal = planRemoveSuperDuperPowersPlugin(config.parsed);
    if (removal.status !== 'ready') {
      return { scope, status: 'needs manual attention', configPath: config.filePath, settingsPath, changed: false, messages: [removal.detail || removal.reason] };
    }
    const messages = [...(removal.warnings || [])];
    if (!options.interactive && fs.existsSync(settingsPath)) messages.push(`settings preserved: ${settingsPath}`);
    return { scope, status: removal.changed ? 'remove npm plugin' : 'npm plugin absent', configPath: config.filePath, settingsPath, changed: removal.changed, removal, messages };
  });
}

function configForRemoval(candidates) {
  let firstExisting = null;
  for (const filePath of candidates) {
    const parsed = readOpenCodeConfig(filePath);
    if (parsed.status === 'missing') continue;
    firstExisting ??= { filePath, parsed };
    if (hasSuperDuperPowersPlugin(parsed)) return { filePath, parsed };
  }
  return firstExisting;
}

function printPlan(plan, stream, dryRun) {
  stream.write(`${dryRun ? 'Would uninstall' : 'Uninstalling'} SuperDuperPowers:\n`);
  for (const item of plan) {
    stream.write(`- ${item.scope}: ${item.status}\n`);
    if (item.configPath) stream.write(`  - OpenCode config: ${item.configPath}\n`);
    if (item.settingsPath) stream.write(`  - SDP settings: ${item.settingsPath} (preserved unless interactively confirmed and still template)\n`);
    for (const message of item.messages || []) stream.write(`  - ${message}\n`);
  }
  stream.write('Preserving generated docs, runtime state, worktrees, and quarantine by default.\n');
}

function applyConfigRemoval(item, options) {
  if (!item.removal || !item.changed) return;
  if (options.backups) backupPath(item.configPath);
  writeOpenCodeConfigPlan(item.removal);
}

async function maybeRemoveSettings(plan, context, backups) {
  for (const item of plan) {
    if (!item.settingsPath || !fs.existsSync(item.settingsPath)) continue;
    if (!matchesSettingsTemplate(item.settingsPath)) {
      context.stdout.write(`Preserved edited or non-template settings: ${item.settingsPath}\n`);
      continue;
    }
    const remove = await promptYesNo(context, `Remove installer-created ${item.scope} SDP settings at ${item.settingsPath}? [y/N]: `, false);
    if (!remove) {
      context.stdout.write(`Preserved SuperDuperPowers settings: ${item.settingsPath}\n`);
      continue;
    }
    if (backups) backupPath(item.settingsPath);
    fs.unlinkSync(item.settingsPath);
    context.stdout.write(`Removed settings: ${item.settingsPath}\n`);
  }
}

async function maybeWipeRuntimeState(installState, context, backups) {
  const runtimeRoot = path.join(installState.pathContext.openCodeConfigDir, 'superduperpowers');
  const stateDir = path.join(runtimeRoot, 'state');
  const worktreesDir = path.join(runtimeRoot, 'worktrees');
  const quarantineDir = path.join(runtimeRoot, 'quarantine');
  const docsDir = path.join(installState.pathContext.projectRoot, 'docs', 'superduperpowers');

  await removeDirAfterConfirm(context, stateDir, 'Remove runtime state directory', backups);
  const warnWorktrees = await promptYesNo(context, `Worktrees may contain uncommitted work. Continue to worktree removal prompt for ${worktreesDir}? [y/N]: `, false);
  if (warnWorktrees) await removeDirAfterConfirm(context, worktreesDir, 'Remove worktrees directory', backups);
  await removeDirAfterConfirm(context, quarantineDir, 'Remove quarantine directory', backups);

  if (fs.existsSync(docsDir)) {
    const answer = await promptLine(context, `To remove generated workflow docs, type the exact path (${docsDir}) or press Enter to preserve: `);
    if (answer === docsDir) {
      if (backups) backupPath(docsDir);
      fs.rmSync(docsDir, { recursive: true, force: true });
      context.stdout.write(`Removed generated docs: ${docsDir}\n`);
    } else {
      context.stdout.write(`Preserved generated docs: ${docsDir}\n`);
    }
  }
}

async function removeDirAfterConfirm(context, dirPath, label, backups) {
  if (!fs.existsSync(dirPath)) return;
  const confirmed = await promptYesNo(context, `${label}: ${dirPath}? [y/N]: `, false);
  if (!confirmed) {
    context.stdout.write(`Preserved: ${dirPath}\n`);
    return;
  }
  if (backups) backupPath(dirPath);
  fs.rmSync(dirPath, { recursive: true, force: true });
  context.stdout.write(`Removed: ${dirPath}\n`);
}

function matchesSettingsTemplate(filePath) {
  return fs.readFileSync(filePath, 'utf8') === readSettingsTemplate();
}

function backupPath(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const backup = `${filePath}.${timestamp()}.bak`;
  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) fs.cpSync(filePath, backup, { recursive: true });
  else fs.copyFileSync(filePath, backup);
  return backup;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
}

async function promptChoice(context, heading, choices, defaultIndex) {
  const readline = createInterface({ input: context.stdin, output: context.stdout });
  try {
    context.stdout.write(`${heading}\n`);
    choices.forEach(([label], index) => context.stdout.write(`  ${index + 1}. ${label}${index + 1 === defaultIndex ? ' [default]' : ''}\n`));
    while (true) {
      const answer = (await readline.question(`Choose 1-${choices.length} [${defaultIndex}]: `)).trim();
      const selected = answer === '' ? defaultIndex : Number(answer);
      if (Number.isInteger(selected) && selected >= 1 && selected <= choices.length) return choices[selected - 1][1];
      context.stdout.write('Enter a listed number, or press Ctrl+C to cancel.\n');
    }
  } finally {
    readline.close();
  }
}

async function promptYesNo(context, question, defaultYes) {
  const answer = (await promptLine(context, question)).trim().toLowerCase();
  if (answer === '') return defaultYes;
  return answer === 'y' || answer === 'yes';
}

async function promptLine(context, question) {
  const readline = createInterface({ input: context.stdin, output: context.stdout });
  try {
    return await readline.question(question);
  } finally {
    readline.close();
  }
}

function scopesFromInstallState(installState) {
  const scopes = [];
  if (installState.project) scopes.push('project');
  if (installState.global) scopes.push('global');
  return scopes;
}

function cancel(context) {
  context.stdout.write('Cancelled. No files were changed.\n');
  return 0;
}
